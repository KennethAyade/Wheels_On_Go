import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { FatigueService } from './fatigue.service';
import { FatigueCheckDto } from './dto/fatigue-check.dto';
import { FaceEnrollDto } from './dto/face-enroll.dto';

@Controller('fatigue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FatigueController {
  constructor(
    private readonly fatigueService: FatigueService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('enroll-face')
  @Roles(UserRole.DRIVER)
  async enrollFace(
    @CurrentUser() user: JwtUser,
    @Body() dto: FaceEnrollDto,
  ) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!profile) throw new NotFoundException('Driver profile not found');

    return this.fatigueService.enrollFace(profile.id, dto.imageBase64);
  }

  @Post('check')
  @Roles(UserRole.DRIVER)
  async checkFatigue(
    @CurrentUser() user: JwtUser,
    @Body() dto: FatigueCheckDto,
  ) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!profile) throw new NotFoundException('Driver profile not found');

    return this.fatigueService.checkFatigue(
      profile.id,
      dto.imageBase64,
      dto.isOnRide ?? false,
      dto.currentRideId,
    );
  }

  @Get('status')
  @Roles(UserRole.DRIVER)
  async getFatigueStatus(@CurrentUser() user: JwtUser) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!profile) throw new NotFoundException('Driver profile not found');

    return this.fatigueService.canGoOnline(profile.id);
  }
}
