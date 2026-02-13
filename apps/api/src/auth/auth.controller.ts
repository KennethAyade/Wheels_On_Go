import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyFirebaseDto } from './dto/verify-firebase.dto';
import { BiometricVerifyDto } from './dto/biometric-verify.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { BiometricGuard } from './guards/biometric.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  @Throttle({ default: { limit: 3, ttl: 60 } })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    this.logger.log(`Verify OTP request: ${JSON.stringify({ phoneNumber: dto.phoneNumber, role: dto.role, codeLength: dto.code?.length })}`);
    return this.authService.verifyOtp(dto);
  }

  @Post('verify-firebase')
  verifyFirebase(@Body() dto: VerifyFirebaseDto) {
    this.logger.log(`Verify Firebase request: role=${dto.role}`);
    return this.authService.verifyFirebaseToken(dto);
  }

  @Post('biometric/verify')
  @UseGuards(BiometricGuard)
  completeBiometric(@CurrentUser() user: JwtUser, @Body() dto: BiometricVerifyDto) {
    return this.authService.completeBiometric(user, dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.revokeRefreshToken(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtUser) {
    return this.authService.me(user);
  }
}
