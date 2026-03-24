import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { DriverModule } from './driver/driver.module';
import { StorageModule } from './storage/storage.module';
import { BiometricModule } from './biometric/biometric.module';
import { EncryptionModule } from './encryption/encryption.module';
// Google Maps Integration Modules
import { LocationModule } from './location/location.module';
import { RideModule } from './ride/ride.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { TrackingModule } from './tracking/tracking.module';
import { GeofenceModule } from './geofence/geofence.module';
import { RiderVehicleModule } from './rider-vehicle/rider-vehicle.module';
import { RatingModule } from './rating/rating.module';
import { AdminModule } from './admin/admin.module';
import { FatigueModule } from './fatigue/fatigue.module';
import { PaymentModule } from './payment/payment.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { EarningsModule } from './earnings/earnings.module';
import { ChatModule } from './chat/chat.module';
import { ChecklistModule } from './checklist/checklist.module';
import { AdminMessagingModule } from './admin-messaging/admin-messaging.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
    ]),
    PrismaModule,
    EncryptionModule,
    HealthModule,
    AuthModule,
    DriverModule,
    StorageModule,
    BiometricModule,
    // Google Maps Integration
    LocationModule,
    RideModule,
    DispatchModule,
    TrackingModule,
    GeofenceModule,
    RiderVehicleModule,
    RatingModule,
    AdminModule,
    FatigueModule,
    PaymentModule,
    SubscriptionModule,
    EarningsModule,
    ChatModule,
    ChecklistModule,
    AdminMessagingModule,
  ],
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
