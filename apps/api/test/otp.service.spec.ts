import { HttpException, HttpStatus, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole, OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { OtpService } from '../src/auth/otp.service';
import { SmsService } from '../src/auth/sms.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';

const config = new ConfigService({
  OTP_CODE_TTL_SECONDS: 300,
  OTP_REQUESTS_PER_HOUR: 5,
});

const createPrismaMock = () =>
  ({
    otpCode: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService);

describe('OtpService', () => {
  let service: OtpService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let smsService: SmsService;
  let auditService: AuditService;

  beforeEach(() => {
    prisma = createPrismaMock() as any;
    smsService = { sendOtp: jest.fn() } as unknown as SmsService;
    auditService = { log: jest.fn() } as unknown as AuditService;
    service = new OtpService(prisma as any, smsService, config, auditService);
  });

  describe('requestOtp()', () => {
    it('generates a 6-digit numeric code', async () => {
      (prisma.otpCode.count as jest.Mock).mockResolvedValue(0);
      (prisma.otpCode.create as jest.Mock).mockResolvedValue({});
      (smsService.sendOtp as jest.Mock).mockResolvedValue(undefined);

      await service.requestOtp('+639171234567', UserRole.RIDER);

      const createCall = (prisma.otpCode.create as jest.Mock).mock.calls[0][0];
      // The code is hashed, but we can verify the SMS received a 6-digit code
      const smsCall = (smsService.sendOtp as jest.Mock).mock.calls[0];
      const sentCode = smsCall[1];
      expect(sentCode).toMatch(/^\d{6}$/);
      expect(Number(sentCode)).toBeGreaterThanOrEqual(100000);
      expect(Number(sentCode)).toBeLessThan(1000000);
    });

    it('hashes the code with bcrypt before storing in DB', async () => {
      (prisma.otpCode.count as jest.Mock).mockResolvedValue(0);
      (prisma.otpCode.create as jest.Mock).mockResolvedValue({});
      (smsService.sendOtp as jest.Mock).mockResolvedValue(undefined);

      await service.requestOtp('+639171234567', UserRole.RIDER);

      const createCall = (prisma.otpCode.create as jest.Mock).mock.calls[0][0];
      const storedHash = createCall.data.codeHash;
      const sentCode = (smsService.sendOtp as jest.Mock).mock.calls[0][1];

      // Verify the stored hash matches the plaintext code
      const isMatch = await bcrypt.compare(sentCode, storedHash);
      expect(isMatch).toBe(true);
    });

    it('creates OTP record with correct expiry (TTL from config)', async () => {
      (prisma.otpCode.count as jest.Mock).mockResolvedValue(0);
      (prisma.otpCode.create as jest.Mock).mockResolvedValue({});
      (smsService.sendOtp as jest.Mock).mockResolvedValue(undefined);

      const before = Date.now();
      const result = await service.requestOtp('+639171234567', UserRole.RIDER);
      const after = Date.now();

      const createCall = (prisma.otpCode.create as jest.Mock).mock.calls[0][0];
      const expiresAt = new Date(createCall.data.expiresAt).getTime();

      // Expiry should be ~300 seconds from now
      expect(expiresAt).toBeGreaterThanOrEqual(before + 300 * 1000 - 100);
      expect(expiresAt).toBeLessThanOrEqual(after + 300 * 1000 + 100);
      expect(createCall.data.purpose).toBe(OtpPurpose.LOGIN);
      expect(createCall.data.role).toBe(UserRole.RIDER);
    });

    it('calls SmsService.sendOtp with phone and plaintext code', async () => {
      (prisma.otpCode.count as jest.Mock).mockResolvedValue(0);
      (prisma.otpCode.create as jest.Mock).mockResolvedValue({});
      (smsService.sendOtp as jest.Mock).mockResolvedValue(undefined);

      await service.requestOtp('+639171234567', UserRole.DRIVER);

      expect(smsService.sendOtp).toHaveBeenCalledTimes(1);
      expect(smsService.sendOtp).toHaveBeenCalledWith(
        '+639171234567',
        expect.stringMatching(/^\d{6}$/),
        undefined,
      );
    });

    it('passes console override when debugMode is true', async () => {
      (prisma.otpCode.count as jest.Mock).mockResolvedValue(0);
      (prisma.otpCode.create as jest.Mock).mockResolvedValue({});
      (smsService.sendOtp as jest.Mock).mockResolvedValue(undefined);

      await service.requestOtp('+639171234567', UserRole.RIDER, true);

      expect(smsService.sendOtp).toHaveBeenCalledWith(
        '+639171234567',
        expect.stringMatching(/^\d{6}$/),
        'console',
      );
    });

    it('throws 429 after exceeding OTP_REQUESTS_PER_HOUR limit', async () => {
      (prisma.otpCode.count as jest.Mock).mockResolvedValue(5);

      await expect(
        service.requestOtp('+639171234567', UserRole.RIDER),
      ).rejects.toThrow(
        new HttpException('Too many OTP requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS),
      );

      expect(prisma.otpCode.create).not.toHaveBeenCalled();
      expect(smsService.sendOtp).not.toHaveBeenCalled();
    });

    it('logs OTP_REQUESTED audit event', async () => {
      (prisma.otpCode.count as jest.Mock).mockResolvedValue(0);
      (prisma.otpCode.create as jest.Mock).mockResolvedValue({});
      (smsService.sendOtp as jest.Mock).mockResolvedValue(undefined);

      await service.requestOtp('+639171234567', UserRole.RIDER);

      expect(auditService.log).toHaveBeenCalledWith(
        null,
        'OTP_REQUESTED',
        'otp',
        '+639171234567',
        expect.objectContaining({ role: UserRole.RIDER }),
      );
    });
  });

  describe('verifyOtp()', () => {
    const phone = '+639171234567';
    const code = '123456';

    it('finds most recent unconsumed, unexpired OTP for phone+role', async () => {
      const codeHash = await bcrypt.hash(code, 10);
      (prisma.otpCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        phoneNumber: phone,
        codeHash,
        failedAttempts: 0,
        consumedAt: null,
      });
      (prisma.otpCode.update as jest.Mock).mockResolvedValue({});

      await service.verifyOtp({ phoneNumber: phone, code, role: UserRole.RIDER });

      expect(prisma.otpCode.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            phoneNumber: phone,
            role: UserRole.RIDER,
            consumedAt: null,
          }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('validates code against bcrypt hash and marks consumed on success', async () => {
      const codeHash = await bcrypt.hash(code, 10);
      (prisma.otpCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        phoneNumber: phone,
        codeHash,
        failedAttempts: 0,
        consumedAt: null,
      });
      (prisma.otpCode.update as jest.Mock).mockResolvedValue({});

      const result = await service.verifyOtp({ phoneNumber: phone, code, role: UserRole.RIDER });

      expect(prisma.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'otp-1' },
          data: { consumedAt: expect.any(Date) },
        }),
      );
      expect(result.id).toBe('otp-1');
    });

    it('increments failedAttempts on wrong code', async () => {
      const codeHash = await bcrypt.hash('999999', 10);
      (prisma.otpCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        phoneNumber: phone,
        codeHash,
        failedAttempts: 1,
        consumedAt: null,
      });
      (prisma.otpCode.update as jest.Mock).mockResolvedValue({});

      await expect(
        service.verifyOtp({ phoneNumber: phone, code, role: UserRole.RIDER }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'otp-1' },
          data: { failedAttempts: 2, consumedAt: null },
        }),
      );
    });

    it('auto-consumes OTP after 5 failed attempts', async () => {
      const codeHash = await bcrypt.hash('999999', 10);
      (prisma.otpCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        phoneNumber: phone,
        codeHash,
        failedAttempts: 4,
        consumedAt: null,
      });
      (prisma.otpCode.update as jest.Mock).mockResolvedValue({});

      await expect(
        service.verifyOtp({ phoneNumber: phone, code, role: UserRole.RIDER }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'otp-1' },
          data: { failedAttempts: 5, consumedAt: expect.any(Date) },
        }),
      );
    });

    it('throws BadRequestException when no active OTP exists', async () => {
      (prisma.otpCode.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.verifyOtp({ phoneNumber: phone, code, role: UserRole.RIDER }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException when code is invalid', async () => {
      const codeHash = await bcrypt.hash('999999', 10);
      (prisma.otpCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        phoneNumber: phone,
        codeHash,
        failedAttempts: 0,
        consumedAt: null,
      });
      (prisma.otpCode.update as jest.Mock).mockResolvedValue({});

      await expect(
        service.verifyOtp({ phoneNumber: phone, code: '123456', role: UserRole.RIDER }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
