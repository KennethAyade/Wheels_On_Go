import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';
import { TrackingController } from './tracking.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GeofenceModule } from '../geofence/geofence.module';

/**
 * Tracking module for real-time driver location updates
 * - WebSocket gateway for real-time tracking
 * - HTTP controller fallback
 * - Location history recording
 */
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => GeofenceModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingGateway],
  exports: [TrackingService, TrackingGateway],
})
export class TrackingModule {}
