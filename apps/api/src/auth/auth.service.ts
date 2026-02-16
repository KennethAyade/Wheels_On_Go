import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DriverStatus, User, UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import { FirebaseService } from './firebase.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyFirebaseDto } from './dto/verify-firebase.dto';
import { JwtUser } from '../common/types/jwt-user.type';
import { BiometricService } from '../biometric/biometric.service';
import { BiometricVerifyDto } from './dto/biometric-verify.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly firebaseService: FirebaseService,
    private readonly biometricService: BiometricService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    await this.ensureRoleConsistency(dto.phoneNumber, dto.role);
    const { expiresAt } = await this.otpService.requestOtp(dto.phoneNumber, dto.role, dto.debugMode);
    return {
      message: 'OTP sent if phone is valid',
      expiresAt,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    await this.ensureRoleConsistency(dto.phoneNumber, dto.role);
    await this.otpService.verifyOtp(dto);
    return this.buildLoginResponse(dto.phoneNumber, dto.role);
  }

  async verifyFirebaseToken(dto: VerifyFirebaseDto) {
    const startTime = Date.now();
    this.logger.log('[PERF] verifyFirebaseToken START');

    try {
      // Step 1: Verify Firebase token
      const step1Start = Date.now();
      const { phoneNumber } = await this.firebaseService.verifyIdToken(
        dto.firebaseIdToken,
      );
      this.logger.log(
        `[PERF] Firebase verifyIdToken took ${Date.now() - step1Start}ms`,
      );

      // Step 2: Role consistency
      const step2Start = Date.now();
      await this.ensureRoleConsistency(phoneNumber, dto.role);
      this.logger.log(
        `[PERF] ensureRoleConsistency took ${Date.now() - step2Start}ms`,
      );

      // Step 3: Build response
      const step3Start = Date.now();
      const result = await this.buildLoginResponse(phoneNumber, dto.role);
      this.logger.log(
        `[PERF] buildLoginResponse took ${Date.now() - step3Start}ms`,
      );

      this.logger.log(
        `[PERF] verifyFirebaseToken TOTAL took ${Date.now() - startTime}ms`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[PERF] verifyFirebaseToken FAILED after ${Date.now() - startTime}ms`,
        error,
      );
      throw error;
    }
  }

  private async buildLoginResponse(phoneNumber: string, role: UserRole) {
    // Step 1: Find or create user
    const step1Start = Date.now();
    const user = await this.findOrCreateUser(phoneNumber, role);
    this.logger.log(`[PERF] findOrCreateUser took ${Date.now() - step1Start}ms`);

    // Step 2: Update last login
    const step2Start = Date.now();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    this.logger.log(`[PERF] update lastLoginAt took ${Date.now() - step2Start}ms`);

    if (user.role === UserRole.DRIVER) {
      // Step 3: Ensure driver profile
      const step3Start = Date.now();
      const driverProfile = await this.ensureDriverProfile(user.id);
      this.logger.log(`[PERF] ensureDriverProfile took ${Date.now() - step3Start}ms`);

      const hasProfilePhoto = !!driverProfile.profilePhotoKey;

      // Step 4: Build biometric token if needed
      const step4Start = Date.now();
      const biometricToken = hasProfilePhoto
        ? await this.buildBiometricToken(user, driverProfile.id)
        : null;
      if (hasProfilePhoto) {
        this.logger.log(`[PERF] buildBiometricToken took ${Date.now() - step4Start}ms`);
      }

      // Drivers with profile photo need biometric first — no refresh token yet
      // Drivers without profile photo get access + refresh tokens immediately
      const step5Start = Date.now();
      const refreshToken = hasProfilePhoto
        ? null
        : await this.buildRefreshToken(user);
      if (!hasProfilePhoto) {
        this.logger.log(`[PERF] buildRefreshToken took ${Date.now() - step5Start}ms`);
      }

      const step6Start = Date.now();
      const accessToken = hasProfilePhoto ? null : await this.buildAccessToken(user);
      if (!hasProfilePhoto) {
        this.logger.log(`[PERF] buildAccessToken took ${Date.now() - step6Start}ms`);
      }

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt?.toISOString(),
        },
        // Driver-specific fields
        biometricRequired: hasProfilePhoto,
        biometricToken: hasProfilePhoto ? biometricToken : null,
        biometricEnrolled: hasProfilePhoto,
        driverStatus: driverProfile.status,
      };
    }

    // Riders get access + refresh tokens
    const step3Start = Date.now();
    const accessToken = await this.buildAccessToken(user);
    this.logger.log(`[PERF] buildAccessToken (rider) took ${Date.now() - step3Start}ms`);

    const step4Start = Date.now();
    const refreshToken = await this.buildRefreshToken(user);
    this.logger.log(`[PERF] buildRefreshToken (rider) took ${Date.now() - step4Start}ms`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt?.toISOString(),
      },
    };
  }

  async completeBiometric(user: JwtUser, dto: BiometricVerifyDto) {
    if (user.role !== UserRole.DRIVER) {
      throw new UnauthorizedException('Biometric login is only for drivers');
    }

    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId: user.sub },
    });

    if (!driverProfile?.profilePhotoKey) {
      throw new BadRequestException('Driver has no enrolled profile photo');
    }

    const result = await this.biometricService.verifyDriverFace(
      driverProfile,
      dto.liveImageBase64,
    );

    const account = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!account) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = await this.buildAccessToken(account);
    const refreshToken = await this.buildRefreshToken(account);

    return {
      userId: user.sub,
      accessToken,
      refreshToken,
      confidence: result.confidence,
      match: result.match,
    };
  }

  async refreshAccessToken(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token already revoked — possible reuse attack, revoke entire family
    if (stored.revokedAt) {
      await this.revokeTokenFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    // Token expired
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: revoke old token, issue new pair
    const newRawToken = randomUUID();
    const newTokenHash = this.hashToken(newRawToken);
    const ttl = this.getRefreshTokenTtlMs();

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date(), replacedBy: newTokenHash },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: newTokenHash,
          familyId: stored.familyId,
          expiresAt: new Date(Date.now() + ttl),
          deviceInfo: stored.deviceInfo,
        },
      }),
    ]);

    const accessToken = await this.buildAccessToken(stored.user);

    return {
      accessToken,
      refreshToken: newRawToken,
    };
  }

  async revokeRefreshToken(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (stored) {
      await this.revokeTokenFamily(stored.familyId);
    }
  }

  async me(user: JwtUser) {
    const found = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: { driverProfile: { include: { documents: true } } },
    });

    if (!found) {
      throw new UnauthorizedException('User not found');
    }

    return found;
  }

  private async findOrCreateUser(phoneNumber: string, role: UserRole): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { phoneNumber },
      include: { driverProfile: true },
    });

    if (existing) {
      if (existing.role !== role) {
        throw new BadRequestException(
          `Phone already registered as ${existing.role}.`,
        );
      }
      return existing;
    }

    const created = await this.prisma.user.create({
      data: {
        phoneNumber,
        role,
        driverProfile:
          role === UserRole.DRIVER
            ? {
                create: {
                  status: DriverStatus.PENDING,
                },
              }
            : undefined,
        riderProfile:
          role === UserRole.RIDER
            ? { create: {} }
            : undefined,
      },
    });

    await this.auditService.log(created.id, 'USER_CREATED', 'user', created.id, {
      role,
    });

    return created;
  }

  private async ensureDriverProfile(userId: string) {
    let profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.driverProfile.create({
        data: { userId },
      });
    }

    return profile;
  }

  private async ensureRoleConsistency(phoneNumber: string, desiredRole: UserRole) {
    const existing = await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: { role: true },
    });

    if (existing && existing.role !== desiredRole) {
      throw new BadRequestException(
        `Phone number already registered as ${existing.role}`,
      );
    }
  }

  private async buildAccessToken(user: User) {
    const payload: JwtUser = {
      sub: user.id,
      role: user.role,
      phoneNumber: user.phoneNumber,
      tokenType: 'access',
    };
    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('ACCESS_TOKEN_TTL', '15m'),
    });
  }

  private async buildBiometricToken(user: User, driverProfileId: string) {
    const payload: JwtUser = {
      sub: user.id,
      role: user.role,
      phoneNumber: user.phoneNumber,
      tokenType: 'biometric',
    };

    const expiresIn = this.configService.get<string>('BIOMETRIC_TOKEN_TTL', '5m');
    const token = await this.jwtService.signAsync(payload, {
      expiresIn,
    });

    await this.auditService.log(user.id, 'BIOMETRIC_CHALLENGE_ISSUED', 'driver', driverProfileId, {
      expiresIn,
    });

    return token;
  }

  private async buildRefreshToken(user: User): Promise<string> {
    const rawToken = randomUUID();
    const tokenHash = this.hashToken(rawToken);
    const familyId = randomUUID();
    const ttl = this.getRefreshTokenTtlMs();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt: new Date(Date.now() + ttl),
      },
    });

    return rawToken;
  }

  private async revokeTokenFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshTokenTtlMs(): number {
    const ttl = this.configService.get<string>('REFRESH_TOKEN_TTL', '30d');
    const match = ttl.match(/^(\d+)([dhms])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30 days
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      case 's': return value * 1000;
      default: return 30 * 24 * 60 * 60 * 1000;
    }
  }
}
