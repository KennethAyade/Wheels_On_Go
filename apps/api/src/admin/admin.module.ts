import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminStatsController } from './admin-stats.controller';
import { AdminBookingsController } from './admin-bookings.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminStatsController, AdminBookingsController],
})
export class AdminModule {}
