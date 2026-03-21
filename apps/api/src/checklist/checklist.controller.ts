import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ChecklistService } from './checklist.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { PresignBreathalyzerDto } from './dto/presign-breathalyzer.dto';
import { ConfirmBreathalyzerDto } from './dto/confirm-breathalyzer.dto';
import { SubmitBlowbagetsDto } from './dto/submit-blowbagets.dto';

@Controller('checklist')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Get('breathalyzer/status')
  @Roles(UserRole.DRIVER)
  getBreathalyzerStatus(@CurrentUser() user: JwtUser) {
    return this.checklistService.getBreathalyzerStatus(user.sub);
  }

  @Post('breathalyzer/presign')
  @Roles(UserRole.DRIVER)
  presignBreathalyzer(
    @CurrentUser() user: JwtUser,
    @Body() dto: PresignBreathalyzerDto,
  ) {
    return this.checklistService.presignBreathalyzer(user.sub, dto);
  }

  @Post('breathalyzer/confirm')
  @Roles(UserRole.DRIVER)
  confirmBreathalyzer(
    @CurrentUser() user: JwtUser,
    @Body() dto: ConfirmBreathalyzerDto,
  ) {
    return this.checklistService.confirmBreathalyzer(user.sub, dto);
  }

  @Post('blowbagets/submit')
  @Roles(UserRole.DRIVER)
  submitBlowbagets(
    @CurrentUser() user: JwtUser,
    @Body() dto: SubmitBlowbagetsDto,
  ) {
    return this.checklistService.submitBlowbagets(user.sub, dto);
  }

  @Get('blowbagets/:rideId')
  @Roles(UserRole.DRIVER)
  getBlowbagetsForRide(
    @CurrentUser() user: JwtUser,
    @Param('rideId') rideId: string,
  ) {
    return this.checklistService.getBlowbagetsForRide(user.sub, rideId);
  }
}
