import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AdminStatsController } from './admin-stats.controller';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminIncidentsController } from './admin-incidents.controller';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminRatingsController } from './admin-ratings.controller';
import { AdminTransactionsController } from './admin-transactions.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [
    AdminStatsController,
    AdminBookingsController,
    AdminAnalyticsController,
    AdminUsersController,
    AdminIncidentsController,
    AdminAuditLogsController,
    AdminRatingsController,
    AdminTransactionsController,
    AdminReportsController,
  ],
  providers: [AdminReportsService],
})
export class AdminModule {}
