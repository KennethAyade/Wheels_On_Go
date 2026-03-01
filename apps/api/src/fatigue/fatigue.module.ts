import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { FatigueService } from './fatigue.service';
import { FatigueController } from './fatigue.controller';

@Module({
  imports: [ConfigModule, PrismaModule, StorageModule],
  controllers: [FatigueController],
  providers: [FatigueService],
  exports: [FatigueService],
})
export class FatigueModule {}
