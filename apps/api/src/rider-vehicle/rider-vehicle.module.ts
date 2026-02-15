import { Module } from '@nestjs/common';
import { RiderVehicleService } from './rider-vehicle.service';
import { RiderVehicleController } from './rider-vehicle.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [RiderVehicleController],
  providers: [RiderVehicleService],
  exports: [RiderVehicleService],
})
export class RiderVehicleModule {}
