import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { RiderVehicleService } from '../src/rider-vehicle/rider-vehicle.service';
import { AuditService } from '../src/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';

const prismaMock = () =>
  ({
    riderProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    riderVehicle: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as PrismaService);

describe('RiderVehicleService', () => {
  let service: RiderVehicleService;
  let prisma: PrismaService;
  let audit: AuditService;

  const userId = 'user-1';
  const riderProfileId = 'profile-1';
  const vehicleId = 'vehicle-1';

  const mockRiderProfile = {
    id: riderProfileId,
    userId,
  };

  const mockVehicle = {
    id: vehicleId,
    riderProfileId,
    make: 'Toyota',
    model: 'Vios',
    year: 2022,
    color: 'White',
    plateNumber: 'ABC 1234',
    vehicleType: 'SEDAN',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = prismaMock();
    audit = { log: jest.fn() } as unknown as AuditService;
    service = new RiderVehicleService(prisma, audit);

    // Default: rider profile exists
    (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
      mockRiderProfile,
    );
  });

  describe('createVehicle()', () => {
    const dto = {
      make: 'Toyota',
      model: 'Vios',
      year: 2022,
      color: 'White',
      plateNumber: 'ABC 1234',
    };

    beforeEach(() => {
      (prisma.riderVehicle.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.riderVehicle.count as jest.Mock).mockResolvedValue(0);
      (prisma.riderVehicle.create as jest.Mock).mockResolvedValue(mockVehicle);
    });

    it('creates a vehicle successfully', async () => {
      const result = await service.createVehicle(userId, dto);
      expect(result.make).toBe('Toyota');
      expect(result.plateNumber).toBe('ABC 1234');
      expect(prisma.riderVehicle.create).toHaveBeenCalled();
    });

    it('makes first vehicle the default', async () => {
      await service.createVehicle(userId, dto);
      expect(prisma.riderVehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: true }),
        }),
      );
    });

    it('returns existing vehicle if user already owns it (idempotent)', async () => {
      const existingVehicle = {
        ...mockVehicle,
        riderProfileId: mockRiderProfile.id,
      };

      (prisma.riderVehicle.findUnique as jest.Mock).mockResolvedValue(
        existingVehicle,
      );

      const result = await service.createVehicle(userId, dto);

      expect(result.id).toBe(vehicleId);
      expect(result.plateNumber).toBe('ABC 1234');
      expect(prisma.riderVehicle.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException for duplicate plate owned by different user', async () => {
      const otherUserVehicle = {
        ...mockVehicle,
        riderProfileId: 'different-rider-id',
      };

      (prisma.riderVehicle.findUnique as jest.Mock).mockResolvedValue(
        otherUserVehicle,
      );

      await expect(service.createVehicle(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('auto-creates rider profile if not found', async () => {
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.riderProfile.create as jest.Mock).mockResolvedValue(mockRiderProfile);
      (prisma.riderVehicle.create as jest.Mock).mockResolvedValue(mockVehicle);
      const result = await service.createVehicle(userId, dto);
      expect(prisma.riderProfile.create).toHaveBeenCalledWith({ data: { userId } });
      expect(result.id).toBe(vehicleId);
    });
  });

  describe('getVehicles()', () => {
    it('returns rider vehicles sorted by default first', async () => {
      (prisma.riderVehicle.findMany as jest.Mock).mockResolvedValue([
        mockVehicle,
      ]);
      const result = await service.getVehicles(userId);
      expect(result).toHaveLength(1);
      expect(result[0].make).toBe('Toyota');
    });
  });

  describe('getVehicleById()', () => {
    it('returns a vehicle by ID', async () => {
      (prisma.riderVehicle.findUnique as jest.Mock).mockResolvedValue(
        mockVehicle,
      );
      const result = await service.getVehicleById(userId, vehicleId);
      expect(result.id).toBe(vehicleId);
    });

    it('throws ForbiddenException for non-owned vehicle', async () => {
      (prisma.riderVehicle.findUnique as jest.Mock).mockResolvedValue({
        ...mockVehicle,
        riderProfileId: 'other-profile',
      });
      await expect(
        service.getVehicleById(userId, vehicleId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for missing vehicle', async () => {
      (prisma.riderVehicle.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.getVehicleById(userId, vehicleId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteVehicle()', () => {
    it('deletes vehicle and promotes next as default', async () => {
      (prisma.riderVehicle.findUnique as jest.Mock).mockResolvedValue(
        mockVehicle,
      );
      (prisma.riderVehicle.findFirst as jest.Mock).mockResolvedValue({
        id: 'vehicle-2',
      });

      await service.deleteVehicle(userId, vehicleId);

      expect(prisma.riderVehicle.delete).toHaveBeenCalledWith({
        where: { id: vehicleId },
      });
      expect(prisma.riderVehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-2' },
        data: { isDefault: true },
      });
    });
  });

  describe('setDefaultVehicle()', () => {
    it('clears old default and sets new one', async () => {
      (prisma.riderVehicle.findUnique as jest.Mock).mockResolvedValue(
        mockVehicle,
      );
      (prisma.riderVehicle.update as jest.Mock).mockResolvedValue({
        ...mockVehicle,
        isDefault: true,
      });

      const result = await service.setDefaultVehicle(userId, vehicleId);

      expect(prisma.riderVehicle.updateMany).toHaveBeenCalledWith({
        where: { riderProfileId, isDefault: true },
        data: { isDefault: false },
      });
      expect(result.isDefault).toBe(true);
    });
  });
});
