import { Body, Controller, Delete, Get, Logger, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyFirebaseDto } from './dto/verify-firebase.dto';
import { BiometricVerifyDto } from './dto/biometric-verify.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { BiometricGuard } from './guards/biometric.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { UpdateRiderProfileDto } from './dto/update-rider-profile.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

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

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: JwtUser, @Body() dto: UpdateRiderProfileDto) {
    return this.authService.updateRiderProfile(user.sub, dto);
  }

  @Post('profile-photo')
  @UseGuards(JwtAuthGuard)
  uploadProfilePhoto(@CurrentUser() user: JwtUser, @Body() body: { imageBase64: string }) {
    return this.authService.uploadProfilePhoto(user.sub, body.imageBase64);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteAccount(@CurrentUser() user: JwtUser) {
    return this.authService.deleteAccount(user.sub);
  }
}
