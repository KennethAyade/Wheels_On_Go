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
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async listUsers(@Query() query: AdminUsersQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { role: 'RIDER' };
    if (query.suspended !== undefined) where.isSuspended = query.suspended;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { phoneNumber: { contains: query.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          isActive: true,
          isSuspended: true,
          suspendedAt: true,
          suspensionReason: true,
          averageRating: true,
          totalRatings: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { ridesAsRider: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  @Patch(':id/suspend')
  async suspendUser(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @CurrentUser() admin: JwtUser,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN')
      throw new BadRequestException('Cannot suspend admin accounts');
    if (user.isSuspended)
      throw new BadRequestException('User is already suspended');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspensionReason: dto.reason,
        isActive: false,
      },
    });

    await this.auditService.log({
      actorUserId: admin.sub,
      action: AuditAction.USER_SUSPENDED,
      targetType: 'User',
      targetId: id,
      metadata: { reason: dto.reason },
    });

    return updated;
  }

  @Patch(':id/reactivate')
  async reactivateUser(
    @Param('id') id: string,
    @CurrentUser() admin: JwtUser,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isSuspended)
      throw new BadRequestException('User is not suspended');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspensionReason: null,
        isActive: true,
      },
    });

    await this.auditService.log({
      actorUserId: admin.sub,
      action: AuditAction.USER_REACTIVATED,
      targetType: 'User',
      targetId: id,
      metadata: {},
    });

    return updated;
  }
}
