import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, TransactionType } from '@prisma/client';

@Injectable()
export class EarningsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get earnings summary for a driver (today, this week, this month, total)
   */
  async getEarningsSummary(driverUserId: string) {
    const driverProfile = await this.prisma.driverProfile.findFirst({
      where: { userId: driverUserId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, thisWeek, thisMonth, total] = await Promise.all([
      this.getEarningsForPeriod(driverProfile.id, startOfDay),
      this.getEarningsForPeriod(driverProfile.id, startOfWeek),
      this.getEarningsForPeriod(driverProfile.id, startOfMonth),
      this.getEarningsForPeriod(driverProfile.id),
    ]);

    return { today, thisWeek, thisMonth, total };
  }

  private async getEarningsForPeriod(
    driverProfileId: string,
    since?: Date,
  ) {
    const where: any = {
      driverProfileId,
      type: TransactionType.RIDE_PAYMENT,
      status: PaymentStatus.COMPLETED,
    };

    if (since) {
      where.processedAt = { gte: since };
    }

    const result = await this.prisma.transaction.aggregate({
      where,
      _sum: { netAmount: true },
      _count: true,
    });

    return {
      earnings: Number(result._sum.netAmount || 0),
      rides: result._count,
    };
  }

  /**
   * Get paginated transaction history for a driver
   */
  async getTransactionHistory(
    driverUserId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const driverProfile = await this.prisma.driverProfile.findFirst({
      where: { userId: driverUserId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    const skip = (page - 1) * limit;
    const where = {
      driverProfileId: driverProfile.id,
      status: PaymentStatus.COMPLETED,
    };

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { processedAt: 'desc' as const },
        select: {
          id: true,
          type: true,
          amount: true,
          grossAmount: true,
          commissionAmount: true,
          commissionRate: true,
          netAmount: true,
          paymentMethod: true,
          description: true,
          processedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: data.map((t) => ({
        ...t,
        amount: Number(t.amount),
        grossAmount: t.grossAmount ? Number(t.grossAmount) : null,
        commissionAmount: t.commissionAmount ? Number(t.commissionAmount) : null,
        netAmount: t.netAmount ? Number(t.netAmount) : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get driver wallet balance
   */
  async getWalletBalance(driverUserId: string) {
    const driverProfile = await this.prisma.driverProfile.findFirst({
      where: { userId: driverUserId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    const wallet = await this.prisma.driverWallet.findUnique({
      where: { driverProfileId: driverProfile.id },
    });

    return {
      balance: wallet ? Number(wallet.balance) : 0,
    };
  }
}
