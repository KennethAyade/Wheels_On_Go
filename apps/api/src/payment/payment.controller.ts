import {
  Controller,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { UserRole } from '@prisma/client';
import { PaymentService } from './payment.service';

@Controller('rides')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post(':id/confirm-cash-payment')
  @Roles(UserRole.DRIVER)
  async confirmCashPayment(
    @CurrentUser() user: JwtUser,
    @Param('id') rideId: string,
  ): Promise<{ success: boolean }> {
    return this.paymentService.confirmCashPayment(rideId, user.sub);
  }
}
