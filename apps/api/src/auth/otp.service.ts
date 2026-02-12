import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { SmsService } from './sms.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const DEFAULT_MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async requestOtp(phoneNumber: string, role: UserRole, debugMode?: boolean): Promise<{ expiresAt: Date }> {
    const ttlSeconds = Number(this.configService.get<number>('OTP_CODE_TTL_SECONDS', 300));
    const maxPerHour = Number(this.configService.get<number>('OTP_REQUESTS_PER_HOUR', 5));
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000);

    const recentCount = await this.prisma.otpCode.count({
      where: { phoneNumber, createdAt: { gte: windowStart } },
    });

    if (recentCount >= maxPerHour) {
      throw new HttpException('Too many OTP requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    await this.prisma.otpCode.create({
      data: {
        phoneNumber,
        role,
        codeHash,
        expiresAt,
        purpose: OtpPurpose.LOGIN,
      },
    });

    await this.smsService.sendOtp(phoneNumber, code, debugMode ? 'console' : undefined);
    await this.auditService.log(null, 'OTP_REQUESTED', 'otp', phoneNumber, {
      role,
      expiresAt,
    });

    return { expiresAt };
  }

  async verifyOtp(params: {
    phoneNumber: string;
    code: string;
    role: UserRole;
  }) {
    const { phoneNumber, code, role } = params;
    const now = new Date();

    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phoneNumber,
        role,
        consumedAt: null,
        expiresAt: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('No active OTP. Please request a new code.');
    }

    const isValid = await bcrypt.compare(code, otp.codeHash);

    if (!isValid) {
      const attempts = otp.failedAttempts + 1;
      const consumedAt = attempts >= DEFAULT_MAX_ATTEMPTS ? new Date() : null;
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { failedAttempts: attempts, consumedAt },
      });
      throw new UnauthorizedException('Invalid code');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    await this.auditService.log(otp.userId, 'OTP_VERIFIED', 'otp', otp.id, {
      phoneNumber,
    });

    return otp;
  }

  private generateCode() {
    return randomInt(100000, 1000000).toString();
  }
}
