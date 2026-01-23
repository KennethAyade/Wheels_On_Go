import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';
import { JwtStrategy } from './jwt.strategy';
import { BiometricModule } from '../biometric/biometric.module';
import { AuditModule } from '../audit/audit.module';
import { BiometricGuard } from './guards/biometric.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    PrismaModule,
    AuditModule,
    BiometricModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('ACCESS_TOKEN_TTL', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, SmsService, JwtStrategy, BiometricGuard],
  exports: [AuthService],
})
export class AuthModule {}
