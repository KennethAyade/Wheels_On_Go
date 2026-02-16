import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DriverService } from './driver.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { RequestKycUploadDto } from './dto/request-kyc-upload.dto';
import { ConfirmKycUploadDto } from './dto/confirm-kyc-upload.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { AvailableDriversQueryDto } from './dto/available-drivers.dto';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  // --- Public endpoints (any authenticated user) ---

  @Get('available')
  @Roles(UserRole.RIDER, UserRole.DRIVER, UserRole.ADMIN)
  getAvailableDrivers(@Query() dto: AvailableDriversQueryDto) {
    return this.driverService.findAvailableDrivers(dto);
  }

  @Get(':id/public-profile')
  @Roles(UserRole.RIDER, UserRole.DRIVER, UserRole.ADMIN)
  getPublicProfile(@Param('id') driverProfileId: string) {
    return this.driverService.getPublicProfile(driverProfileId);
  }

  // --- Driver-only endpoints ---

  @Get('me')
  @Roles(UserRole.DRIVER)
  me(@CurrentUser() user: JwtUser) {
    return this.driverService.getMine(user.sub);
  }

  @Post('kyc/presign')
  @Roles(UserRole.DRIVER)
  requestUpload(@CurrentUser() user: JwtUser, @Body() dto: RequestKycUploadDto) {
    return this.driverService.requestKycUpload(user.sub, dto);
  }

  @Post('kyc/confirm')
  @Roles(UserRole.DRIVER)
  confirmUpload(@CurrentUser() user: JwtUser, @Body() dto: ConfirmKycUploadDto) {
    return this.driverService.confirmKycUpload(user.sub, dto);
  }

  @Patch('me/status')
  @Roles(UserRole.DRIVER)
  updateStatus(@CurrentUser() user: JwtUser, @Body() dto: UpdateDriverStatusDto) {
    return this.driverService.updateOnlineStatus(user.sub, dto);
  }

  @Get('kyc')
  @Roles(UserRole.DRIVER)
  getKyc(@CurrentUser() user: JwtUser) {
    return this.driverService.getKycStatus(user.sub);
  }
}
