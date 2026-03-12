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
import { PrismaService } from '../prisma/prisma.service';
import { IsOptional, IsString, IsNumberString } from 'class-validator';

class AdminTransactionsQueryDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
}

@Controller('admin/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminTransactionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listTransactions(@Query() query: AdminTransactionsQueryDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          driverProfile: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          ride: { select: { id: true, pickupAddress: true, dropoffAddress: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: data.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        paymentMethod: t.paymentMethod,
        paymentReference: t.paymentReference,
        grossAmount: t.grossAmount,
        commissionAmount: t.commissionAmount,
        commissionRate: t.commissionRate,
        netAmount: t.netAmount,
        processedAt: t.processedAt,
        createdAt: t.createdAt,
        rider: t.user
          ? { id: t.user.id, firstName: t.user.firstName, lastName: t.user.lastName }
          : null,
        driver: t.driverProfile?.user
          ? { id: t.driverProfile.user.id, firstName: t.driverProfile.user.firstName, lastName: t.driverProfile.user.lastName }
          : null,
        ride: t.ride
          ? { id: t.ride.id, pickupAddress: t.ride.pickupAddress, dropoffAddress: t.ride.dropoffAddress }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
