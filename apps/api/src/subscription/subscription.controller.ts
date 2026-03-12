import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { SubscriptionService } from './subscription.service';
import { IsNotEmpty, IsString } from 'class-validator';

class SubscribeDto {
  @IsNotEmpty() @IsString() planId: string;
}

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  async listPlans() {
    return this.subscriptionService.listPlans();
  }

  @Get('me')
  @Roles(UserRole.RIDER)
  async getMySubscription(@CurrentUser() user: JwtUser) {
    return this.subscriptionService.getMySubscription(user.sub);
  }

  @Post('subscribe')
  @Roles(UserRole.RIDER)
  async subscribe(
    @CurrentUser() user: JwtUser,
    @Body() dto: SubscribeDto,
  ) {
    return this.subscriptionService.subscribe(user.sub, dto.planId);
  }

  @Delete('me')
  @Roles(UserRole.RIDER)
  async cancelSubscription(@CurrentUser() user: JwtUser) {
    return this.subscriptionService.cancelSubscription(user.sub);
  }
}
