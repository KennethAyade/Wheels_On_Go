import { Module, forwardRef } from '@nestjs/common';
import { GeofenceService } from './geofence.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LocationModule } from '../location/location.module';

/**
 * Geofence module for arrival detection
 * - 50m radius arrival detection
 * - 200m approaching notification
 * - Geofence event recording
 */
@Module({
  imports: [PrismaModule, LocationModule],
  providers: [GeofenceService],
  exports: [GeofenceService],
})
export class GeofenceModule {}
