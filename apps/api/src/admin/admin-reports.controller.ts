import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminReportsService } from './admin-reports.service';
import { AdminReportsQueryDto } from './dto/admin-reports-query.dto';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Get('summary')
  getSummary(@Query() query: AdminReportsQueryDto) {
    return this.reportsService.getSummary(query.dateFrom, query.dateTo);
  }
}
