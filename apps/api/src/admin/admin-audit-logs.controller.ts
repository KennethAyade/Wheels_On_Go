import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditLogsQueryDto } from './dto/admin-audit-logs-query.dto';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listAuditLogs(@Query() query: AdminAuditLogsQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.action)
      where.action = { contains: query.action, mode: 'insensitive' };
    if (query.targetType) where.targetType = query.targetType;
    if (query.actorUserId) where.actorUserId = query.actorUserId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
