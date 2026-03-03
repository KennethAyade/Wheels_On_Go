import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AdminRatingsQueryDto } from './dto/admin-ratings-query.dto';

@Controller('admin/ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminRatingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getRatings(@Query() query: AdminRatingsQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [aggregates, recentRatings, total] = await Promise.all([
      this.prisma.rating.aggregate({
        _avg: {
          rating: true,
          punctualityRating: true,
          safetyRating: true,
          cleanlinessRating: true,
          communicationRating: true,
        },
        _count: { _all: true },
      }),
      this.prisma.rating.findMany({
        where,
        include: {
          reviewer: {
            select: { id: true, firstName: true, lastName: true },
          },
          reviewee: {
            select: { id: true, firstName: true, lastName: true },
          },
          ride: {
            select: { id: true, pickupAddress: true, dropoffAddress: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rating.count({ where }),
    ]);

    return {
      aggregates: {
        averageRating: aggregates._avg.rating,
        averagePunctuality: aggregates._avg.punctualityRating,
        averageSafety: aggregates._avg.safetyRating,
        averageCleanliness: aggregates._avg.cleanlinessRating,
        averageCommunication: aggregates._avg.communicationRating,
        totalRatings: aggregates._count._all,
      },
      data: recentRatings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
