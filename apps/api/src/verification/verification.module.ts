import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '../storage/storage.module';
import { VerificationService } from './verification.service';

@Module({
  imports: [ConfigModule, StorageModule],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
