import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { AdminMessagingService } from './admin-messaging.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages/admin')
@UseGuards(JwtAuthGuard)
export class UserMessagingController {
  constructor(private readonly messagingService: AdminMessagingService) {}

  @Get()
  getMessages(@CurrentUser() user: JwtUser) {
    return this.messagingService.getMessagesForUser(user.sub);
  }

  @Post()
  async replyToAdmin(@CurrentUser() user: JwtUser, @Body() dto: SendMessageDto) {
    const message = await this.messagingService.replyToAdmin(user.sub, dto.content);
    if (!message) {
      throw new BadRequestException('No admin conversation found to reply to');
    }
    return message;
  }

  @Patch('read')
  markAsRead(@CurrentUser() user: JwtUser) {
    return this.messagingService.markAdminMessagesAsRead(user.sub);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: JwtUser) {
    const count = await this.messagingService.getUnreadCountFromAdmin(user.sub);
    return { count };
  }
}
