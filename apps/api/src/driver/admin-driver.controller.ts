import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DriverService } from './driver.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { RejectDriverDto } from './dto/reject-driver.dto';

@Controller('admin/drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('pending')
  listPending() {
    return this.driverService.listPendingDrivers();
  }

  @Post(':driverId/approve')
  approve(@Param('driverId') driverId: string, @CurrentUser() admin: JwtUser) {
    return this.driverService.approveDriver(driverId, admin.sub);
  }

  @Post(':driverId/reject')
  reject(
    @Param('driverId') driverId: string,
    @Body() dto: RejectDriverDto,
    @CurrentUser() admin: JwtUser,
  ) {
    return this.driverService.rejectDriver(driverId, admin.sub, dto.reason);
  }
}
