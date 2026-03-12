import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Save a message to the database
   */
  async saveMessage(data: {
    rideId: string;
    senderId: string;
    receiverId: string;
    content: string;
  }) {
    const message = await this.prisma.message.create({
      data: {
        rideId: data.rideId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        messageType: MessageType.TEXT,
      },
    });

    return {
      id: message.id,
      rideId: message.rideId,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      messageType: message.messageType,
      sentAt: message.sentAt.toISOString(),
      isRead: message.isRead,
    };
  }

  /**
   * Get chat history for a ride
   */
  async getHistory(rideId: string, limit: number = 50) {
    const messages = await this.prisma.message.findMany({
      where: { rideId },
      orderBy: { sentAt: 'asc' },
      take: limit,
    });

    return messages.map((m) => ({
      id: m.id,
      rideId: m.rideId,
      senderId: m.senderId,
      receiverId: m.receiverId,
      content: m.content,
      messageType: m.messageType,
      sentAt: m.sentAt.toISOString(),
      isRead: m.isRead,
    }));
  }

  /**
   * Mark messages as read
   */
  async markAsRead(rideId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: {
        rideId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Get the other participant's userId for a ride
   */
  async getOtherParticipant(rideId: string, userId: string): Promise<string | null> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: {
        riderId: true,
        driver: { select: { id: true } },
      },
    });

    if (!ride) return null;

    if (ride.riderId === userId) {
      return ride.driver?.id || null;
    }
    return ride.riderId;
  }

  /**
   * Verify that a user is a participant of a ride
   */
  async isParticipant(rideId: string, userId: string): Promise<boolean> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: {
        riderId: true,
        driver: { select: { id: true } },
      },
    });

    if (!ride) return false;
    return ride.riderId === userId || ride.driver?.id === userId;
  }
}
