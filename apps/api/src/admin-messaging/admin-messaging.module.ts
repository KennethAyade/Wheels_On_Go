import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminMessagingController } from './admin-messaging.controller';
import { UserMessagingController } from './user-messaging.controller';
import { AdminMessagingService } from './admin-messaging.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminMessagingController, UserMessagingController],
  providers: [AdminMessagingService],
})
export class AdminMessagingModule {}
