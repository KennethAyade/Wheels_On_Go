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
import { TrackingService } from './tracking.service';
import { UpdateLocationDto } from './dto/update-location.dto';

/**
 * WebSocket Gateway for real-time location tracking
 * - Drivers send location updates every 3-5 seconds
 * - Riders subscribe to driver location for their active ride
 * - Server broadcasts driver location to subscribed riders
 */
@WebSocketGateway({
  namespace: 'tracking',
  cors: {
    origin: '*', // Configure properly in production
    credentials: true,
  },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  // Map of userId to socket id
  private userSocketMap = new Map<string, string>();
  // Map of socket id to userId
  private socketUserMap = new Map<string, string>();
  // Map of rideId to subscribed rider socket ids
  private rideSubscriptions = new Map<string, Set<string>>();

  constructor(
    private readonly trackingService: TrackingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handle new WebSocket connection
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

      this.logger.log(`Tracking client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.warn(`Tracking client connection rejected: ${error.message}`);
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

      // Remove from any ride subscriptions
      this.rideSubscriptions.forEach((subscribers, rideId) => {
        subscribers.delete(client.id);
        if (subscribers.size === 0) {
          this.rideSubscriptions.delete(rideId);
        }
      });

      this.logger.log(`Tracking client disconnected: ${client.id} (user: ${userId})`);
    }
  }

  /**
   * Handle driver location update
   */
  @SubscribeMessage('driver:location:update')
  async handleDriverLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: UpdateLocationDto,
  ): Promise<void> {
    try {
      const userId = this.socketUserMap.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const result = await this.trackingService.updateDriverLocation(userId, dto);

      if (result.updated) {
        // If there's an active ride, broadcast location to subscribed riders
        if (result.activeRide) {
          const rideId = result.activeRide.id;
          const riderId = result.activeRide.rider?.userId;

          // Broadcast to ride room
          this.server.to(`ride:${rideId}`).emit('driver:location', {
            rideId,
            latitude: dto.latitude,
            longitude: dto.longitude,
            heading: dto.heading,
            speed: dto.speed,
            timestamp: new Date(),
          });

          // Notify about geofence events
          if (result.geofenceEvent) {
            this.server.to(`ride:${rideId}`).emit('geofence:event', {
              rideId,
              eventType: result.geofenceEvent,
              timestamp: new Date(),
            });

            // Also notify rider's user room
            if (riderId) {
              this.server.to(`user:${riderId}`).emit('ride:status_update', {
                rideId,
                event: result.geofenceEvent,
              });
            }
          }
        }

        // Acknowledge update to driver
        client.emit('location:updated', {
          success: true,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Error handling location update: ${error.message}`);
      client.emit('error', { message: 'Failed to update location' });
    }
  }

  /**
   * Handle rider subscribing to driver location for a ride
   */
  @SubscribeMessage('rider:subscribe:ride')
  async handleRiderSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string },
  ): Promise<void> {
    try {
      const userId = this.socketUserMap.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Join ride-specific room
      client.join(`ride:${data.rideId}`);

      // Track subscription
      if (!this.rideSubscriptions.has(data.rideId)) {
        this.rideSubscriptions.set(data.rideId, new Set());
      }
      this.rideSubscriptions.get(data.rideId).add(client.id);

      // Send current driver location if available
      const driverLocation = await this.trackingService.getDriverLocationBroadcast(
        data.rideId,
      );

      if (driverLocation) {
        client.emit('driver:location', {
          rideId: data.rideId,
          ...driverLocation,
        });
      }

      this.logger.log(`Rider ${userId} subscribed to ride ${data.rideId}`);

      client.emit('subscribed', { rideId: data.rideId });
    } catch (error) {
      this.logger.error(`Error subscribing to ride: ${error.message}`);
      client.emit('error', { message: 'Failed to subscribe to ride' });
    }
  }

  /**
   * Handle rider unsubscribing from ride location
   */
  @SubscribeMessage('rider:unsubscribe:ride')
  handleRiderUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string },
  ): void {
    client.leave(`ride:${data.rideId}`);

    const subscribers = this.rideSubscriptions.get(data.rideId);
    if (subscribers) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.rideSubscriptions.delete(data.rideId);
      }
    }

    client.emit('unsubscribed', { rideId: data.rideId });
  }

  /**
   * Broadcast driver location to all subscribers of a ride
   * Can be called from other services
   */
  broadcastDriverLocation(
    rideId: string,
    location: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    },
  ): void {
    this.server.to(`ride:${rideId}`).emit('driver:location', {
      rideId,
      ...location,
      timestamp: new Date(),
    });
  }

  /**
   * Notify ride participants of status change
   */
  notifyRideStatusChange(rideId: string, status: string, data?: any): void {
    this.server.to(`ride:${rideId}`).emit('ride:status_change', {
      rideId,
      status,
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const token = client.handshake.query.token;
    if (typeof token === 'string') {
      return token;
    }

    const auth = client.handshake.auth;
    if (auth?.token) {
      return auth.token;
    }

    return null;
  }
}
