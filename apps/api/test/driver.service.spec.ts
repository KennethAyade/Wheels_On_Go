import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DriverService } from '../src/driver/driver.service';
import { AuditService } from '../src/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { LocationService } from '../src/location/location.service';
import { DriverStatus, DocumentStatus, DriverDocumentType } from '@prisma/client';

const prismaMock = () =>
  ({
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    driverDocument: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService);

describe('DriverService', () => {
  let service: DriverService;
  let prisma: PrismaService;
  let storage: StorageService;
  let audit: AuditService;
  let location: LocationService;

  beforeEach(() => {
    prisma = prismaMock();
    storage = {
      getUploadUrl: jest.fn().mockResolvedValue('https://presigned.example.com/upload'),
    } as unknown as StorageService;
    audit = { log: jest.fn() } as unknown as AuditService;
    location = {
      getDistanceMatrix: jest.fn().mockResolvedValue({ distanceKm: 5, durationSeconds: 600, distanceMeters: 5000 }),
    } as unknown as LocationService;
    service = new DriverService(prisma, storage, audit, location);
  });

  describe('requestKycUpload()', () => {
    const userId = 'user-1';
    const dto = {
      type: DriverDocumentType.LICENSE,
      fileName: 'license.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    };

    beforeEach(() => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-1',
        userId,
        status: DriverStatus.PENDING,
      });
      (prisma.driverDocument.upsert as jest.Mock).mockResolvedValue({});
    });

    it('ensures driver profile exists (creates if missing)', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.driverProfile.create as jest.Mock).mockResolvedValue({
        id: 'new-profile',
        userId,
      });

      await service.requestKycUpload(userId, dto);

      expect(prisma.driverProfile.create).toHaveBeenCalledWith({
        data: { userId },
      });
    });

    it('builds unique S3 key with profileId/type/timestamp/uuid', async () => {
      await service.requestKycUpload(userId, dto);

      expect(storage.getUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.stringMatching(/^drivers\/profile-1\/license\/\d+-[a-f0-9-]+-license\.jpg$/),
          contentType: 'image/jpeg',
        }),
      );
    });

    it('sanitizes fileName (removes special characters)', async () => {
      const dirtyDto = { ...dto, fileName: 'my file (1)!@#.jpg' };

      await service.requestKycUpload(userId, dirtyDto);

      const uploadCall = (storage.getUploadUrl as jest.Mock).mock.calls[0][0];
      expect(uploadCall.key).not.toContain('(');
      expect(uploadCall.key).not.toContain(' ');
      expect(uploadCall.key).toContain('my_file__1____.jpg');
    });

    it('calls StorageService.getUploadUrl with correct params', async () => {
      await service.requestKycUpload(userId, dto);

      expect(storage.getUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'image/jpeg',
        }),
      );
    });

    it('upserts DriverDocument with PENDING_UPLOAD status', async () => {
      await service.requestKycUpload(userId, dto);

      expect(prisma.driverDocument.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            driverProfileId_type: {
              driverProfileId: 'profile-1',
              type: DriverDocumentType.LICENSE,
            },
          },
          update: expect.objectContaining({
            status: DocumentStatus.PENDING_UPLOAD,
          }),
          create: expect.objectContaining({
            driverProfileId: 'profile-1',
            type: DriverDocumentType.LICENSE,
            status: DocumentStatus.PENDING_UPLOAD,
          }),
        }),
      );
    });

    it('returns { uploadUrl, key, expiresIn: 900 }', async () => {
      const result = await service.requestKycUpload(userId, dto);

      expect(result.uploadUrl).toBe('https://presigned.example.com/upload');
      expect(result.key).toMatch(/^drivers\/profile-1\//);
      expect(result.expiresIn).toBe(900);
    });
  });

  describe('confirmKycUpload()', () => {
    const userId = 'user-1';

    beforeEach(() => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-1',
        userId,
      });
    });

    it('updates document status to UPLOADED with uploadedAt timestamp', async () => {
      (prisma.driverDocument.findUnique as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        driverProfileId: 'profile-1',
        type: DriverDocumentType.LICENSE,
        storageKey: 'drivers/profile-1/license.jpg',
        size: 1024,
      });
      (prisma.driverDocument.update as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        status: DocumentStatus.UPLOADED,
      });

      await service.confirmKycUpload(userId, {
        type: DriverDocumentType.LICENSE,
        key: 'drivers/profile-1/license.jpg',
      });

      expect(prisma.driverDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-1' },
          data: expect.objectContaining({
            status: DocumentStatus.UPLOADED,
            uploadedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('updates driverProfile.profilePhotoKey for PROFILE_PHOTO type', async () => {
      (prisma.driverDocument.findUnique as jest.Mock).mockResolvedValue({
        id: 'doc-2',
        driverProfileId: 'profile-1',
        type: DriverDocumentType.PROFILE_PHOTO,
        storageKey: 'drivers/profile-1/photo.jpg',
      });
      (prisma.driverDocument.update as jest.Mock).mockResolvedValue({
        id: 'doc-2',
        storageKey: 'drivers/profile-1/photo.jpg',
      });
      (prisma.driverProfile.update as jest.Mock).mockResolvedValue({});

      await service.confirmKycUpload(userId, {
        type: DriverDocumentType.PROFILE_PHOTO,
        key: 'drivers/profile-1/photo.jpg',
      });

      expect(prisma.driverProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'profile-1' },
          data: expect.objectContaining({
            profilePhotoKey: expect.any(String),
            profilePhotoUploadedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('throws BadRequestException when no upload request exists', async () => {
      (prisma.driverDocument.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.confirmKycUpload(userId, {
          type: DriverDocumentType.LICENSE,
          key: 'fake-key',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('status transitions', () => {
    it('approves a pending driver', async () => {
      (prisma.driverProfile.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'driver-1',
          status: DriverStatus.PENDING,
        })
        .mockResolvedValueOnce({
          id: 'driver-1',
          status: DriverStatus.APPROVED,
          documents: [],
          user: { id: 'user-1', phoneNumber: '+639000000001' },
          vehicle: null,
        });
      (prisma.driverProfile.update as jest.Mock).mockResolvedValue({
        id: 'driver-1',
        status: DriverStatus.APPROVED,
      });

      const result = await service.approveDriver('driver-1', 'admin-1');
      expect(result.status).toBe(DriverStatus.APPROVED);
    });

    it('rejects a driver with reason', async () => {
      (prisma.driverProfile.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'driver-2',
          status: DriverStatus.PENDING,
        })
        .mockResolvedValueOnce({
          id: 'driver-2',
          status: DriverStatus.REJECTED,
          rejectionReason: 'Invalid docs',
          documents: [],
          user: { id: 'user-2', phoneNumber: '+639000000002' },
          vehicle: null,
        });
      (prisma.driverProfile.update as jest.Mock).mockResolvedValue({
        id: 'driver-2',
        status: DriverStatus.REJECTED,
        rejectionReason: 'Invalid docs',
      });

      const result = await service.rejectDriver('driver-2', 'admin-1', 'Invalid docs');
      expect(result.status).toBe(DriverStatus.REJECTED);
      expect(result.rejectionReason).toBe('Invalid docs');
    });

    it('throws NotFoundException when driver profile not found for approve', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.approveDriver('nonexistent', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when driver profile not found for reject', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.rejectDriver('nonexistent', 'admin-1', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setupDriverProfile()', () => {
    const userId = 'user-1';
    const dto = {
      firstName: 'Juan',
      lastName: 'Cruz',
      licenseNumber: 'N12-34-567890',
      licenseExpiryDate: '2028-12-31T00:00:00.000Z',
    };

    beforeEach(() => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.driverProfile.update as jest.Mock).mockResolvedValue({});
    });

    it('updates user firstName and lastName', async () => {
      await service.setupDriverProfile(userId, dto);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({ firstName: 'Juan', lastName: 'Cruz' }),
        }),
      );
    });

    it('updates driverProfile licenseNumber and licenseExpiryDate', async () => {
      await service.setupDriverProfile(userId, dto);
      expect(prisma.driverProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          data: expect.objectContaining({
            licenseNumber: 'N12-34-567890',
            licenseExpiryDate: expect.any(Date),
          }),
        }),
      );
    });

    it('returns isProfileComplete: true', async () => {
      const result = await service.setupDriverProfile(userId, dto);
      expect(result.isProfileComplete).toBe(true);
      expect(result.firstName).toBe('Juan');
      expect(result.licenseNumber).toBe('N12-34-567890');
    });
  });

  describe('updateOnlineStatus() — profile gate', () => {
    const userId = 'user-1';
    const profileId = 'profile-1';

    beforeEach(() => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: profileId,
        userId,
      });
      (prisma.driverProfile.update as jest.Mock).mockResolvedValue({
        id: profileId,
        isOnline: true,
      });
    });

    it('throws BadRequestException when going online with incomplete profile', async () => {
      // findUnique for ensureProfile (first call)
      // then two parallel findUnique calls for user + driverProfile profile gate
      (prisma.driverProfile.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: profileId, userId }) // ensureProfile
        .mockResolvedValueOnce({ licenseNumber: null, licenseExpiryDate: null }); // profile gate driverProfile
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        firstName: null,
        lastName: null,
      });

      await expect(
        service.updateOnlineStatus(userId, { isOnline: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows going online when profile is complete', async () => {
      (prisma.driverProfile.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: profileId, userId }) // ensureProfile
        .mockResolvedValueOnce({ licenseNumber: 'LIC-001', licenseExpiryDate: new Date('2028-01-01') }); // profile gate
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        firstName: 'Juan',
        lastName: 'Cruz',
      });

      const result = await service.updateOnlineStatus(userId, { isOnline: true });
      expect(result.isOnline).toBe(true);
    });

    it('skips gate when going offline', async () => {
      // Only one findUnique call (ensureProfile) — no gate for going offline
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: profileId,
        userId,
      });
      (prisma.driverProfile.update as jest.Mock).mockResolvedValue({
        id: profileId,
        isOnline: false,
      });

      const result = await service.updateOnlineStatus(userId, { isOnline: false });
      expect(result.isOnline).toBe(false);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
