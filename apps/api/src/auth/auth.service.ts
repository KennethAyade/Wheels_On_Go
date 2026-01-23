import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DriverStatus, User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtUser } from '../common/types/jwt-user.type';
import { BiometricService } from '../biometric/biometric.service';
import { BiometricVerifyDto } from './dto/biometric-verify.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly biometricService: BiometricService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    await this.ensureRoleConsistency(dto.phoneNumber, dto.role);
    const { expiresAt } = await this.otpService.requestOtp(dto.phoneNumber, dto.role);
    return {
      message: 'OTP sent if phone is valid',
      expiresAt,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    await this.ensureRoleConsistency(dto.phoneNumber, dto.role);
    await this.otpService.verifyOtp(dto);

    const user = await this.findOrCreateUser(dto.phoneNumber, dto.role);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    if (user.role === UserRole.DRIVER) {
      const driverProfile = await this.ensureDriverProfile(user.id);
      const hasProfilePhoto = !!driverProfile.profilePhotoKey;
      const biometricToken = hasProfilePhoto
        ? await this.buildBiometricToken(user, driverProfile.id)
        : null;

      return {
        userId: user.id,
        role: user.role,
        biometricRequired: hasProfilePhoto,
        biometricToken,
        accessToken: hasProfilePhoto ? undefined : await this.buildAccessToken(user),
        biometricEnrolled: hasProfilePhoto,
        driverStatus: driverProfile.status,
      };
    }

    return {
      userId: user.id,
      role: user.role,
      biometricRequired: false,
      accessToken: await this.buildAccessToken(user),
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

    return {
      userId: user.sub,
      accessToken,
      confidence: result.confidence,
      match: result.match,
    };
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
}
