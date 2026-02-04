import { Module } from '@nestjs/common';
import { RideService } from './ride.service';
import { RideController } from './ride.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { LocationModule } from '../location/location.module';

/**
 * Ride module for managing ride requests
 * - Create rides
 * - Calculate fare estimates
 * - Update ride status
 * - Cancel rides
 */
@Module({
  imports: [PrismaModule, AuditModule, LocationModule],
  controllers: [RideController],
  providers: [RideService],
  exports: [RideService],
})
export class RideModule {}
