import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * REST fallback: Get chat history for a ride
   * GET /chat/:rideId/messages
   */
  @Get(':rideId/messages')
  async getMessages(
    @CurrentUser() user: JwtUser,
    @Param('rideId') rideId: string,
  ) {
    return this.chatService.getHistory(rideId);
  }
}
