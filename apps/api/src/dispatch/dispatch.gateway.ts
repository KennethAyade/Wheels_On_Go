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
import { DispatchService } from './dispatch.service';

/**
 * WebSocket Gateway for real-time dispatch notifications
 * - Sends dispatch requests to drivers
 * - Receives driver accept/decline responses
 * - Notifies riders of ride acceptance
 */
@WebSocketGateway({
  namespace: 'dispatch',
  cors: {
    origin: '*', // Configure properly in production
    credentials: true,
  },
})
export class DispatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DispatchGateway.name);

  // Map of userId to socket id for quick lookups
  private userSocketMap = new Map<string, string>();
  // Map of socket id to userId for disconnect cleanup
  private socketUserMap = new Map<string, string>();

  constructor(
    private readonly dispatchService: DispatchService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handle new WebSocket connection
   * Verify JWT token and register user
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.userId;

      // Store mappings
      this.userSocketMap.set(userId, client.id);
      this.socketUserMap.set(client.id, userId);

      // Join user-specific room
      client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);

      // Check for pending dispatch if driver
      const pendingDispatch = await this.dispatchService.getPendingDispatchForDriver(userId);
      if (pendingDispatch) {
        // Send pending dispatch to newly connected driver
        client.emit('dispatch:request', {
          dispatchAttemptId: pendingDispatch.id,
          ride: pendingDispatch.ride,
        });
      }
    } catch (error) {
      this.logger.warn(`Client connection rejected: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnect(client: Socket): void {
    const userId = this.socketUserMap.get(client.id);
    if (userId) {
      this.userSocketMap.delete(userId);
      this.socketUserMap.delete(client.id);
      this.logger.log(`Client disconnected: ${client.id} (user: ${userId})`);
    }
  }

  /**
   * Handle driver accepting a dispatch
   */
  @SubscribeMessage('dispatch:accept')
  async handleDispatchAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { dispatchAttemptId: string },
  ): Promise<void> {
    try {
      const userId = this.socketUserMap.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const result = await this.dispatchService.handleDriverResponse(
        data.dispatchAttemptId,
        userId,
        true,
      );

      // Notify driver of acceptance confirmation
      client.emit('dispatch:accepted', {
        ride: result.ride,
      });

      // Notify rider that driver has been assigned
      const riderId = result.ride?.rider?.userId;
      if (riderId) {
        this.server.to(`user:${riderId}`).emit('ride:driver_assigned', {
          ride: result.ride,
        });
      }

      this.logger.log(`Dispatch ${data.dispatchAttemptId} accepted by driver`);
    } catch (error) {
      this.logger.error(`Error accepting dispatch: ${error.message}`);
      client.emit('dispatch:error', { message: error.message });
    }
  }

  /**
   * Handle driver declining a dispatch
   */
  @SubscribeMessage('dispatch:decline')
  async handleDispatchDecline(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { dispatchAttemptId: string; reason?: string },
  ): Promise<void> {
    try {
      const userId = this.socketUserMap.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const result = await this.dispatchService.handleDriverResponse(
        data.dispatchAttemptId,
        userId,
        false,
        data.reason,
      );

      // Confirm decline to driver
      client.emit('dispatch:declined', {
        dispatchAttemptId: data.dispatchAttemptId,
      });

      // If next dispatch was sent, notify that driver
      if (result.nextDispatchAttempt) {
        const nextDriverUserId = result.nextDispatchAttempt.driver?.userId;
        if (nextDriverUserId) {
          this.server.to(`user:${nextDriverUserId}`).emit('dispatch:request', {
            dispatchAttemptId: result.nextDispatchAttempt.dispatchAttempt.id,
            ride: result.nextDispatchAttempt.dispatchAttempt.ride,
          });
        }
      }

      this.logger.log(`Dispatch ${data.dispatchAttemptId} declined by driver`);
    } catch (error) {
      this.logger.error(`Error declining dispatch: ${error.message}`);
      client.emit('dispatch:error', { message: error.message });
    }
  }

  /**
   * Send dispatch request to a specific driver
   */
  sendDispatchToDriver(
    driverUserId: string,
    dispatchAttemptId: string,
    ride: any,
  ): void {
    this.server.to(`user:${driverUserId}`).emit('dispatch:request', {
      dispatchAttemptId,
      ride,
    });
    this.logger.log(`Dispatch sent to driver ${driverUserId}`);
  }

  /**
   * Notify rider of ride status change
   */
  notifyRider(riderUserId: string, event: string, data: any): void {
    this.server.to(`user:${riderUserId}`).emit(event, data);
    this.logger.log(`Notification sent to rider ${riderUserId}: ${event}`);
  }

  /**
   * Notify driver of ride status change
   */
  notifyDriver(driverUserId: string, event: string, data: any): void {
    this.server.to(`user:${driverUserId}`).emit(event, data);
    this.logger.log(`Notification sent to driver ${driverUserId}: ${event}`);
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractToken(client: Socket): string | null {
    // Try auth header first
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try query param
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
