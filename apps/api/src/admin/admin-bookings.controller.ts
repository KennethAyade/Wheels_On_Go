import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit.constants';
import { AdminBookingsQueryDto } from './dto/admin-bookings-query.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Controller('admin/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminBookingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async listBookings(@Query() query: AdminBookingsQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    if (query.fareMin != null || query.fareMax != null) {
      where.totalFare = {};
      if (query.fareMin != null) where.totalFare.gte = query.fareMin;
      if (query.fareMax != null) where.totalFare.lte = query.fareMax;
    }

    if (query.search) {
      where.id = { contains: query.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.ride.findMany({
        where,
        include: {
          rider: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
          driver: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ride.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get(':id')
  async getBooking(@Param('id') id: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: {
        rider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            averageRating: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            averageRating: true,
          },
        },
        driverProfile: {
          select: {
            id: true,
            licenseNumber: true,
            totalRides: true,
            completionRate: true,
          },
        },
        vehicle: true,
        rating: true,
        sosIncident: true,
        dispatchAttempts: { orderBy: { sentAt: 'asc' } },
        route: true,
      },
    });
    if (!ride) throw new NotFoundException('Booking not found');
    return ride;
  }

  @Patch(':id/status')
  async updateBookingStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() admin: JwtUser,
  ) {
    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (!ride) throw new NotFoundException('Booking not found');

    const cancellableStatuses = [
      'PENDING',
      'ACCEPTED',
      'DRIVER_ARRIVED',
      'STARTED',
    ];
    if (!cancellableStatuses.includes(ride.status)) {
      throw new BadRequestException(
        `Cannot cancel a ride with status ${ride.status}`,
      );
    }

    const updated = await this.prisma.ride.update({
      where: { id },
      data: {
        status: 'CANCELLED_BY_SYSTEM',
        cancelledAt: new Date(),
        cancellationReason: dto.reason ?? 'Admin cancellation',
      },
    });

    await this.auditService.log({
      actorUserId: admin.sub,
      action: AuditAction.RIDE_CANCELLED_BY_SYSTEM,
      targetType: 'Ride',
      targetId: id,
      metadata: { reason: dto.reason, previousStatus: ride.status },
    });

    return updated;
  }
}
