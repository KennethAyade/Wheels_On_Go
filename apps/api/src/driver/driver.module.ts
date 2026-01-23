import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import { DriverService } from './driver.service';
import { DriverController } from './driver.controller';
import { AdminDriverController } from './admin-driver.controller';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    AuditModule,
  ],
  controllers: [DriverController, AdminDriverController],
  providers: [DriverService],
  exports: [DriverService],
})
export class DriverModule {}
