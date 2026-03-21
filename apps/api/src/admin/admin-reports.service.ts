import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo + 'T23:59:59.999Z') : new Date();

    const dateFilter = { gte: from, lte: to };

    const [financial, operations, safety, subscriptions, drivers] = await Promise.all([
      this.getFinancialSummary(dateFilter),
      this.getOperationsSummary(dateFilter),
      this.getSafetySummary(dateFilter),
      this.getSubscriptionsSummary(dateFilter),
      this.getDriversSummary(dateFilter),
    ]);

    return {
      dateFrom: from.toISOString().slice(0, 10),
      dateTo: to.toISOString().slice(0, 10),
      financial,
      operations,
      safety,
      subscriptions,
      drivers,
    };
  }

  private async getFinancialSummary(dateFilter: { gte: Date; lte: Date }) {
    const [aggregate, transactions, byMethod, byType] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { createdAt: dateFilter, status: 'COMPLETED' },
        _sum: { grossAmount: true, commissionAmount: true, netAmount: true },
        _count: true,
      }),
      this.prisma.ride.aggregate({
        where: { status: 'COMPLETED', completedAt: dateFilter },
        _avg: { totalFare: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['paymentMethod'],
        where: { createdAt: dateFilter, status: 'COMPLETED' },
        _count: true,
        _sum: { grossAmount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { createdAt: dateFilter, status: 'COMPLETED' },
        _count: true,
        _sum: { grossAmount: true },
      }),
    ]);

    return {
      totalGrossRevenue: Number(aggregate._sum.grossAmount ?? 0),
      totalCommission: Number(aggregate._sum.commissionAmount ?? 0),
      totalNetPayouts: Number(aggregate._sum.netAmount ?? 0),
      totalTransactions: aggregate._count,
      averageFare: Number(transactions._avg.totalFare ?? 0),
      revenueByMethod: byMethod.map((m) => ({
        method: m.paymentMethod,
        count: m._count,
        total: Number(m._sum.grossAmount ?? 0),
      })),
      revenueByType: byType.map((t) => ({
        type: t.type,
        count: t._count,
        total: Number(t._sum.grossAmount ?? 0),
      })),
    };
  }

  private async getOperationsSummary(dateFilter: { gte: Date; lte: Date }) {
    const [totalRides, byStatus, completedAgg] = await Promise.all([
      this.prisma.ride.count({ where: { createdAt: dateFilter } }),
      this.prisma.ride.groupBy({
        by: ['status'],
        where: { createdAt: dateFilter },
        _count: true,
      }),
      this.prisma.ride.aggregate({
        where: { status: 'COMPLETED', completedAt: dateFilter },
        _count: true,
        _avg: { estimatedDistance: true, estimatedDuration: true },
      }),
    ]);

    const completedRides = completedAgg._count;
    const cancelledRides = byStatus
      .filter((s) => s.status.startsWith('CANCELLED'))
      .reduce((sum, s) => sum + s._count, 0);

    return {
      totalRides,
      completedRides,
      cancelledRides,
      completionRate: totalRides > 0 ? Math.round((completedRides / totalRides) * 1000) / 10 : 0,
      averageDistance: Math.round((completedAgg._avg.estimatedDistance ?? 0) / 100) / 10, // m -> km, 1 decimal
      averageDuration: Math.round((completedAgg._avg.estimatedDuration ?? 0) / 60), // s -> min
      ridesByStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    };
  }

  private async getSafetySummary(dateFilter: { gte: Date; lte: Date }) {
    const [
      breathalyzerPassed,
      breathalyzerFailed,
      breathalyzerInvalid,
      blowbagetsCompleted,
      fatigueChecks,
      fatigueCooldowns,
      sosTotal,
      sosResolved,
    ] = await Promise.all([
      this.prisma.blowbagetsChecklist.count({
        where: { completedAt: dateFilter, breathalyzerResult: 'PASS' },
      }),
      this.prisma.blowbagetsChecklist.count({
        where: { completedAt: dateFilter, breathalyzerResult: 'FAIL' },
      }),
      this.prisma.blowbagetsChecklist.count({
        where: { completedAt: dateFilter, breathalyzerResult: 'INVALID_IMAGE' },
      }),
      this.prisma.blowbagetsChecklist.count({
        where: { completedAt: dateFilter, allItemsChecked: true },
      }),
      this.prisma.fatigueDetectionLog.count({
        where: { detectedAt: dateFilter },
      }),
      this.prisma.fatigueDetectionLog.count({
        where: { detectedAt: dateFilter, fatigueLevel: { not: 'NORMAL' } },
      }),
      this.prisma.sosIncident.count({
        where: { createdAt: dateFilter },
      }),
      this.prisma.sosIncident.count({
        where: { createdAt: dateFilter, status: 'RESOLVED' },
      }),
    ]);

    const breathalyzerTests = breathalyzerPassed + breathalyzerFailed + breathalyzerInvalid;

    return {
      breathalyzerTests,
      breathalyzerPassed,
      breathalyzerFailed,
      breathalyzerInvalid,
      blowbagetsCompleted,
      fatigueChecks,
      fatigueCooldowns,
      sosIncidents: sosTotal,
      sosResolved,
    };
  }

  private async getSubscriptionsSummary(dateFilter: { gte: Date; lte: Date }) {
    const [activeSubscribers, newInPeriod, subRevenue, plans] = await Promise.all([
      this.prisma.riderProfile.count({
        where: {
          subscriptionPlanId: { not: null },
          subscriptionEndDate: { gte: new Date() },
        },
      }),
      this.prisma.riderProfile.count({
        where: {
          subscriptionPlanId: { not: null },
          subscriptionStartDate: dateFilter,
        },
      }),
      this.prisma.transaction.aggregate({
        where: { type: 'SUBSCRIPTION_FEE', status: 'COMPLETED', createdAt: dateFilter },
        _sum: { amount: true },
      }),
      this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          monthlyFee: true,
          _count: {
            select: {
              riders: {
                where: { subscriptionEndDate: { gte: new Date() } },
              },
            },
          },
        },
      }),
    ]);

    // Count cancelled = subscriptions that ended within the period
    const cancelledSubscriptions = await this.prisma.riderProfile.count({
      where: {
        subscriptionEndDate: dateFilter,
        OR: [
          { subscriptionPlanId: null },
          { subscriptionEndDate: { lt: new Date() } },
        ],
      },
    });

    return {
      activeSubscribers,
      newSubscriptions: newInPeriod,
      cancelledSubscriptions,
      subscriptionRevenue: Number(subRevenue._sum.amount ?? 0),
      byPlan: plans.map((p) => ({
        planName: p.name,
        count: p._count.riders,
        revenue: Number(p.monthlyFee) * p._count.riders,
      })),
    };
  }

  private async getDriversSummary(dateFilter: { gte: Date; lte: Date }) {
    const [totalApproved, totalOnline, walletAgg, topEarnerTxns] = await Promise.all([
      this.prisma.driverProfile.count({ where: { status: 'APPROVED' } }),
      this.prisma.driverProfile.count({ where: { status: 'APPROVED', isOnline: true } }),
      this.prisma.driverWallet.aggregate({ _sum: { balance: true } }),
      this.prisma.transaction.groupBy({
        by: ['driverProfileId'],
        where: {
          type: 'DRIVER_EARNING',
          status: 'COMPLETED',
          createdAt: dateFilter,
          driverProfileId: { not: null },
        },
        _sum: { netAmount: true },
        _count: true,
        orderBy: { _sum: { netAmount: 'desc' } },
        take: 5,
      }),
    ]);

    // Fetch driver names for top earners
    const driverIds = topEarnerTxns
      .map((t) => t.driverProfileId)
      .filter((id): id is string => id !== null);

    const driverProfiles = driverIds.length > 0
      ? await this.prisma.driverProfile.findMany({
          where: { id: { in: driverIds } },
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        })
      : [];

    const profileMap = new Map(driverProfiles.map((p) => [p.id, p]));

    return {
      totalApproved,
      totalOnline,
      totalWalletBalance: Number(walletAgg._sum.balance ?? 0),
      topEarners: topEarnerTxns.map((t) => {
        const profile = profileMap.get(t.driverProfileId!);
        const name = profile
          ? [profile.user.firstName, profile.user.lastName].filter(Boolean).join(' ') || 'Unknown'
          : 'Unknown';
        return {
          name,
          rides: t._count,
          earnings: Number(t._sum.netAmount ?? 0),
        };
      }),
    };
  }
}
