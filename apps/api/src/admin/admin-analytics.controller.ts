import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  async getOverview(@Query('days') days?: string) {
    const numDays = Math.min(parseInt(days || '30', 10) || 30, 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);
    startDate.setHours(0, 0, 0, 0);

    const [rides, newUsers] = await Promise.all([
      this.prisma.ride.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true, completedAt: true, totalFare: true, status: true },
      }),
      this.prisma.user.findMany({
        where: { role: 'RIDER', createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
    ]);

    const seriesMap: Record<string, { rides: number; revenue: number; newUsers: number }> = {};
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      seriesMap[key] = { rides: 0, revenue: 0, newUsers: 0 };
    }

    rides.forEach((r) => {
      const key = new Date(r.createdAt).toISOString().slice(0, 10);
      if (seriesMap[key]) seriesMap[key].rides++;
      if (r.status === 'COMPLETED' && r.completedAt && r.totalFare) {
        const revKey = new Date(r.completedAt).toISOString().slice(0, 10);
        if (seriesMap[revKey]) seriesMap[revKey].revenue += Number(r.totalFare);
      }
    });

    newUsers.forEach((u) => {
      const key = new Date(u.createdAt).toISOString().slice(0, 10);
      if (seriesMap[key]) seriesMap[key].newUsers++;
    });

    const series = Object.entries(seriesMap).map(([date, v]) => ({ date, ...v }));
    return { series, totalDays: numDays };
  }

  @Get('drivers')
  async getDriverMetrics() {
    const [totalApproved, totalPending, totalRejected, topDrivers] = await Promise.all([
      this.prisma.driverProfile.count({ where: { status: 'APPROVED' } }),
      this.prisma.driverProfile.count({ where: { status: 'PENDING' } }),
      this.prisma.driverProfile.count({ where: { status: 'REJECTED' } }),
      this.prisma.driverProfile.findMany({
        where: { status: 'APPROVED', totalRides: { gt: 0 } },
        select: {
          id: true,
          totalRides: true,
          completionRate: true,
          acceptanceRate: true,
          user: { select: { firstName: true, lastName: true, averageRating: true } },
        },
        orderBy: { totalRides: 'desc' },
        take: 10,
      }),
    ]);

    const totalProcessed = totalApproved + totalRejected;
    const approvalRate = totalProcessed > 0 ? (totalApproved / totalProcessed) * 100 : 0;

    return {
      approvalRate: Math.round(approvalRate * 10) / 10,
      totalApproved,
      totalPending,
      totalRejected,
      topDrivers,
    };
  }
}
