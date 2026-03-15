import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSocketMap = new Map<string, string>();
  private socketUserMap = new Map<string, string>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;

      this.userSocketMap.set(userId, client.id);
      this.socketUserMap.set(client.id, userId);

      this.logger.log(`Chat: User ${userId} connected (socket: ${client.id})`);
    } catch (error) {
      this.logger.warn(`Chat: Connection rejected — ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = this.socketUserMap.get(client.id);
    if (userId) {
      this.userSocketMap.delete(userId);
      this.socketUserMap.delete(client.id);
      this.logger.log(`Chat: User ${userId} disconnected`);
    }
  }

  /**
   * Client joins a ride chat room and receives history
   */
  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.rideId) return;

    const isParticipant = await this.chatService.isParticipant(data.rideId, userId);
    if (!isParticipant) {
      client.emit('error', { message: 'Not a participant of this ride' });
      return;
    }

    const room = `ride-chat:${data.rideId}`;
    client.join(room);

    // Send chat history
    const history = await this.chatService.getHistory(data.rideId);
    client.emit('chat:history', { rideId: data.rideId, messages: history });

    // Mark messages as read
    await this.chatService.markAsRead(data.rideId, userId);

    this.logger.log(`User ${userId} joined chat room ${room}`);
  }

  /**
   * Client sends a message
   */
  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string; content: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.rideId || !data.content?.trim()) return;

    const receiverId = await this.chatService.getOtherParticipant(data.rideId, userId);
    if (!receiverId) {
      client.emit('error', { message: 'Could not find chat partner' });
      return;
    }

    const message = await this.chatService.saveMessage({
      rideId: data.rideId,
      senderId: userId,
      receiverId,
      content: data.content.trim(),
    });

    // Broadcast to room (both participants)
    const room = `ride-chat:${data.rideId}`;
    this.server.to(room).emit('chat:message', message);
  }

  /**
   * Client marks messages as read
   */
  @SubscribeMessage('chat:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.rideId) return;

    await this.chatService.markAsRead(data.rideId, userId);
  }

  private extractToken(client: Socket): string | null {
    // Try auth header first
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try query param (mobile clients send token this way)
    const token = client.handshake.query.token;
    if (typeof token === 'string') {
      return token;
    }

    // Try auth object
    const auth = client.handshake.auth;
    if (auth?.token) {
      return auth.token;
    }

    return null;
  }
}
