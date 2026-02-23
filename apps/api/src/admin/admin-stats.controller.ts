import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeRides, onlineDrivers, totalRiders, pendingVerifications, todayRevenue] =
      await Promise.all([
        this.prisma.ride.count({
          where: { status: { in: ['ACCEPTED', 'DRIVER_ARRIVED', 'STARTED'] } },
        }),
        this.prisma.driverProfile.count({
          where: { isOnline: true, status: 'APPROVED' },
        }),
        this.prisma.user.count({
          where: { role: 'RIDER', isActive: true },
        }),
        this.prisma.driverProfile.count({
          where: { status: 'PENDING' },
        }),
        this.prisma.ride.aggregate({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: todayStart },
          },
          _sum: { totalFare: true },
        }),
      ]);

    return {
      activeRides,
      onlineDrivers,
      totalRiders,
      pendingVerifications,
      todayRevenue: Number(todayRevenue._sum.totalFare || 0),
    };
  }
}
