import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { UserRole } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  listAll() {
    return this.subscriptionService.listAllPlans();
  }

  @Post()
  create(
    @CurrentUser() admin: JwtUser,
    @Body() dto: CreateSubscriptionPlanDto,
  ) {
    return this.subscriptionService.createPlan(dto, admin.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() admin: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionService.updatePlan(id, dto, admin.sub);
  }

  @Patch(':id/toggle')
  toggleActive(@CurrentUser() admin: JwtUser, @Param('id') id: string) {
    return this.subscriptionService.togglePlanActive(id, admin.sub);
  }
}
