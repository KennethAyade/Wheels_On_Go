import { Module } from '@nestjs/common';
import { RideService } from './ride.service';
import { RideController } from './ride.controller';
import { ScheduledRideService } from './scheduled-ride.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { LocationModule } from '../location/location.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { PaymentModule } from '../payment/payment.module';
import { SubscriptionModule } from '../subscription/subscription.module';

/**
 * Ride module for managing ride requests
 * - Create rides (instant and scheduled)
 * - Calculate fare estimates
 * - Update ride status
 * - Cancel rides
 * - Auto-dispatch for INSTANT rides
 * - Cron-based dispatch for SCHEDULED rides
 */
@Module({
  imports: [PrismaModule, AuditModule, LocationModule, DispatchModule, PaymentModule, SubscriptionModule],
  controllers: [RideController],
  providers: [RideService, ScheduledRideService],
  exports: [RideService],
})
export class RideModule {}
