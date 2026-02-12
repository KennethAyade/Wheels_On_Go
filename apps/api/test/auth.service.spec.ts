import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../src/auth/auth.service';
import { OtpService } from '../src/auth/otp.service';
import { BiometricService } from '../src/biometric/biometric.service';
import { AuditService } from '../src/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole, DriverStatus } from '@prisma/client';

const config = new ConfigService({
  JWT_SECRET: 'test-secret',
  ACCESS_TOKEN_TTL: '15m',
  BIOMETRIC_TOKEN_TTL: '5m',
  REFRESH_TOKEN_TTL: '30d',
});

const createPrismaMock = () =>
  ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService);

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let otpService: OtpService;
  let biometricService: BiometricService;
  let auditService: AuditService;
  let jwtService: JwtService;

  beforeEach(() => {
    prisma = createPrismaMock();
    otpService = {
      requestOtp: jest.fn().mockResolvedValue({ expiresAt: new Date() }),
      verifyOtp: jest.fn().mockResolvedValue({ id: 'otp-1' }),
    } as unknown as OtpService;
    biometricService = {
      verifyDriverFace: jest.fn(),
    } as unknown as BiometricService;
    auditService = { log: jest.fn() } as unknown as AuditService;
    jwtService = new JwtService({ secret: 'test-secret' });

    service = new AuthService(
      prisma,
      jwtService,
      otpService,
      biometricService,
      auditService,
      config,
    );
  });

  describe('requestOtp()', () => {
    it('delegates to OtpService.requestOtp', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.requestOtp({ phoneNumber: '+639171234567', role: UserRole.RIDER });

      expect(otpService.requestOtp).toHaveBeenCalledWith('+639171234567', UserRole.RIDER, undefined);
    });

    it('throws BadRequestException when phone registered with different role', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: UserRole.DRIVER,
      });

      await expect(
        service.requestOtp({ phoneNumber: '+639171234567', role: UserRole.RIDER }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyOtp()', () => {
    it('returns access token for rider after OTP verify', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        phoneNumber: '+631234567890',
        role: UserRole.RIDER,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.verifyOtp({
        phoneNumber: '+631234567890',
        code: '123456',
        role: UserRole.RIDER,
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.id).toBe('user-1');
      expect(result.user.role).toBe(UserRole.RIDER);
    });

    it('issues biometric token for driver with enrolled photo', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'driver-1',
        phoneNumber: '+631234567890',
        role: UserRole.DRIVER,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-1',
        userId: 'driver-1',
        status: DriverStatus.PENDING,
        profilePhotoKey: 'drivers/profile-1/profile.jpg',
      });

      const result = await service.verifyOtp({
        phoneNumber: '+631234567890',
        code: '123456',
        role: UserRole.DRIVER,
      });

      expect(result.biometricRequired).toBe(true);
      expect(result.biometricToken).toBeDefined();
      expect(result.accessToken).toBeNull();
    });

    it('creates new user when phone number not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user',
        phoneNumber: '+639999999999',
        role: UserRole.RIDER,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.verifyOtp({
        phoneNumber: '+639999999999',
        code: '123456',
        role: UserRole.RIDER,
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phoneNumber: '+639999999999',
            role: UserRole.RIDER,
          }),
        }),
      );
      expect(result.user.id).toBe('new-user');
    });

    it('creates driverProfile for new DRIVER user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-driver',
        phoneNumber: '+639999999999',
        role: UserRole.DRIVER,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-new',
        userId: 'new-driver',
        profilePhotoKey: null,
        status: DriverStatus.PENDING,
      });

      await service.verifyOtp({
        phoneNumber: '+639999999999',
        code: '123456',
        role: UserRole.DRIVER,
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.DRIVER,
            driverProfile: expect.objectContaining({
              create: expect.objectContaining({ status: DriverStatus.PENDING }),
            }),
          }),
        }),
      );
    });

    it('returns accessToken for driver WITHOUT profilePhotoKey', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'driver-2',
        phoneNumber: '+631234567890',
        role: UserRole.DRIVER,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-2',
        userId: 'driver-2',
        profilePhotoKey: null,
        status: DriverStatus.PENDING,
      });

      const result = await service.verifyOtp({
        phoneNumber: '+631234567890',
        code: '123456',
        role: UserRole.DRIVER,
      });

      expect(result.biometricRequired).toBe(false);
      expect(result.accessToken).toBeDefined();
      expect(result.accessToken).not.toBeNull();
    });

    it('updates user.lastLoginAt on success', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        phoneNumber: '+631234567890',
        role: UserRole.RIDER,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await service.verifyOtp({
        phoneNumber: '+631234567890',
        code: '123456',
        role: UserRole.RIDER,
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { lastLoginAt: expect.any(Date) },
        }),
      );
    });
  });

  describe('completeBiometric()', () => {
    const driverUser = {
      sub: 'driver-1',
      role: UserRole.DRIVER,
      phoneNumber: '+631234567890',
      tokenType: 'biometric' as const,
    };

    it('returns accessToken + match + confidence on successful face match', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-1',
        userId: 'driver-1',
        profilePhotoKey: 'drivers/profile-1/photo.jpg',
      });
      (biometricService.verifyDriverFace as jest.Mock).mockResolvedValue({
        match: true,
        confidence: 98.5,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'driver-1',
        phoneNumber: '+631234567890',
        role: UserRole.DRIVER,
      });

      const result = await service.completeBiometric(driverUser, {
        liveImageBase64: 'base64data',
      });

      expect(result.match).toBe(true);
      expect(result.confidence).toBe(98.5);
      expect(result.accessToken).toBeDefined();
      expect(result.userId).toBe('driver-1');
    });

    it('throws UnauthorizedException when user is not DRIVER', async () => {
      const riderUser = {
        sub: 'rider-1',
        role: UserRole.RIDER,
        phoneNumber: '+631234567890',
        tokenType: 'biometric' as const,
      };

      await expect(
        service.completeBiometric(riderUser, { liveImageBase64: 'base64data' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequestException when driver has no profilePhotoKey', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-1',
        userId: 'driver-1',
        profilePhotoKey: null,
      });

      await expect(
        service.completeBiometric(driverUser, { liveImageBase64: 'base64data' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('delegates to BiometricService.verifyDriverFace', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-1',
        userId: 'driver-1',
        profilePhotoKey: 'drivers/profile-1/photo.jpg',
      });
      (biometricService.verifyDriverFace as jest.Mock).mockResolvedValue({
        match: true,
        confidence: 95,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'driver-1',
        phoneNumber: '+631234567890',
        role: UserRole.DRIVER,
      });

      await service.completeBiometric(driverUser, { liveImageBase64: 'base64data' });

      expect(biometricService.verifyDriverFace).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'profile-1' }),
        'base64data',
      );
    });
  });
});
