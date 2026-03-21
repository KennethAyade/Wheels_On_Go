import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { AdminMessagingService } from './admin-messaging.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminMessagingController {
  constructor(private readonly messagingService: AdminMessagingService) {}

  @Get('messaging/threads')
  getThreads(@CurrentUser() user: JwtUser) {
    return this.messagingService.getThreads(user.sub);
  }

  @Get('users/:userId/messages')
  getMessages(@CurrentUser() user: JwtUser, @Param('userId') userId: string) {
    return this.messagingService.getMessages(user.sub, userId);
  }

  @Post('users/:userId/messages')
  sendMessage(
    @CurrentUser() user: JwtUser,
    @Param('userId') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(user.sub, userId, dto.content);
  }

  @Patch('users/:userId/messages/read')
  markAsRead(@CurrentUser() user: JwtUser, @Param('userId') userId: string) {
    return this.messagingService.markAsRead(user.sub, userId);
  }
}
