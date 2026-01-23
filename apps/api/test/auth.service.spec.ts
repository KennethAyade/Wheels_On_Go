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
  } as unknown as PrismaService);

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = createPrismaMock();
    const otpService = { verifyOtp: jest.fn() } as unknown as OtpService;
    const biometricService = {
      verifyDriverFace: jest.fn(),
    } as unknown as BiometricService;
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const jwtService = new JwtService({ secret: 'test-secret' });

    service = new AuthService(
      prisma,
      jwtService,
      otpService,
      biometricService,
      auditService,
      config,
    );
  });

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

    expect(result.biometricRequired).toBe(false);
    expect(result.accessToken).toBeDefined();
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
    expect(result.accessToken).toBeUndefined();
  });
});
