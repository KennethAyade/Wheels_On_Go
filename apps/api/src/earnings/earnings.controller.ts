import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { EarningsService } from './earnings.service';
import { IsOptional, IsNumberString } from 'class-validator';

class PaginationQueryDto {
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
}

@Controller('drivers/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DRIVER)
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get('earnings')
  async getEarnings(@CurrentUser() user: JwtUser) {
    return this.earningsService.getEarningsSummary(user.sub);
  }

  @Get('earnings/transactions')
  async getTransactions(
    @CurrentUser() user: JwtUser,
    @Query() query: PaginationQueryDto,
  ) {
    const page = parseInt(query.page || '1', 10);
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);
    return this.earningsService.getTransactionHistory(user.sub, page, limit);
  }

  @Get('wallet')
  async getWallet(@CurrentUser() user: JwtUser) {
    return this.earningsService.getWalletBalance(user.sub);
  }
}
