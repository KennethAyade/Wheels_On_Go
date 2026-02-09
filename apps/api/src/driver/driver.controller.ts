import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DriverService } from './driver.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { RequestKycUploadDto } from './dto/request-kyc-upload.dto';
import { ConfirmKycUploadDto } from './dto/confirm-kyc-upload.dto';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DRIVER)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.driverService.getMine(user.sub);
  }

  @Post('kyc/presign')
  requestUpload(@CurrentUser() user: JwtUser, @Body() dto: RequestKycUploadDto) {
    return this.driverService.requestKycUpload(user.sub, dto);
  }

  @Post('kyc/confirm')
  confirmUpload(@CurrentUser() user: JwtUser, @Body() dto: ConfirmKycUploadDto) {
    return this.driverService.confirmKycUpload(user.sub, dto);
  }

  @Get('kyc')
  getKyc(@CurrentUser() user: JwtUser) {
    return this.driverService.getKycStatus(user.sub);
  }
}
