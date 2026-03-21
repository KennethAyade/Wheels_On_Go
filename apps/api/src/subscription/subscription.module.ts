import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { AdminSubscriptionController } from './admin-subscription.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [SubscriptionController, AdminSubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
