import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { BiometricService } from './biometric.service';

@Module({
  imports: [ConfigModule, PrismaModule, StorageModule],
  providers: [BiometricService],
  exports: [BiometricService],
})
export class BiometricModule {}
