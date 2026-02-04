import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DispatchService } from './dispatch.service';
import { DispatchGateway } from './dispatch.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { LocationModule } from '../location/location.module';

/**
 * Dispatch module for driver matching and ride dispatch
 * - Find nearby drivers using Haversine
 * - WebSocket gateway for real-time dispatch
 * - Handle driver accept/decline
 */
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    LocationModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  providers: [DispatchService, DispatchGateway],
  exports: [DispatchService, DispatchGateway],
})
export class DispatchModule {}
