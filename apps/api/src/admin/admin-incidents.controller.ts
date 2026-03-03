import {
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
import { AdminIncidentsQueryDto } from './dto/admin-incidents-query.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';

@Controller('admin/incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminIncidentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async listIncidents(@Query() query: AdminIncidentsQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.type) where.incidentType = query.type;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.sosIncident.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          ride: {
            select: { id: true, pickupAddress: true, dropoffAddress: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sosIncident.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  @Patch(':id')
  async updateIncident(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() admin: JwtUser,
  ) {
    const incident = await this.prisma.sosIncident.findUnique({
      where: { id },
    });
    if (!incident) throw new NotFoundException('Incident not found');

    const updateData: any = { status: dto.status };

    if (dto.status === 'ACKNOWLEDGED' && incident.status === 'ACTIVE') {
      updateData.respondedAt = new Date();
      updateData.responderUserId = admin.sub;
    }
    if (dto.status === 'RESOLVED' || dto.status === 'FALSE_ALARM') {
      updateData.resolvedAt = new Date();
      if (dto.resolutionNotes) updateData.resolutionNotes = dto.resolutionNotes;
    }

    const updated = await this.prisma.sosIncident.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        ride: { select: { id: true } },
      },
    });

    const action =
      dto.status === 'ACKNOWLEDGED'
        ? AuditAction.SOS_ACKNOWLEDGED
        : AuditAction.SOS_RESOLVED;
    await this.auditService.logSosIncident(admin.sub, action, id, {
      newStatus: dto.status,
      resolutionNotes: dto.resolutionNotes,
    });

    return updated;
  }
}
