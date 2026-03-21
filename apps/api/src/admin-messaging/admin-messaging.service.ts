import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class AdminMessagingService {
  constructor(private readonly prisma: PrismaService) {}

  async getThreads(adminId: string) {
    // Get all messages where admin is sender or receiver and rideId is null
    const messages = await this.prisma.message.findMany({
      where: {
        rideId: null,
        OR: [{ senderId: adminId }, { receiverId: adminId }],
      },
      orderBy: { sentAt: 'desc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    // Group by the other user (not the admin)
    const threadMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        userRole: string;
        lastMessage: string;
        lastMessageAt: string;
        unreadCount: number;
      }
    >();

    for (const msg of messages) {
      const otherUser =
        msg.senderId === adminId
          ? msg.receiver
          : msg.sender;
      const otherUserId = otherUser.id;

      if (!threadMap.has(otherUserId)) {
        const name = [otherUser.firstName, otherUser.lastName].filter(Boolean).join(' ') || 'Unknown';
        threadMap.set(otherUserId, {
          userId: otherUserId,
          userName: name,
          userRole: otherUser.role,
          lastMessage: msg.content,
          lastMessageAt: msg.sentAt.toISOString(),
          unreadCount: 0,
        });
      }

      // Count unread messages sent TO admin by this user
      if (msg.receiverId === adminId && !msg.isRead && msg.senderId === otherUserId) {
        const thread = threadMap.get(otherUserId)!;
        thread.unreadCount++;
      }
    }

    return Array.from(threadMap.values());
  }

  async getMessages(adminId: string, userId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        rideId: null,
        OR: [
          { senderId: adminId, receiverId: userId },
          { senderId: userId, receiverId: adminId },
        ],
      },
      orderBy: { sentAt: 'asc' },
    });

    return messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      content: m.content,
      messageType: m.messageType,
      sentAt: m.sentAt.toISOString(),
      isRead: m.isRead,
      readAt: m.readAt?.toISOString() ?? null,
      isFromAdmin: m.senderId === adminId,
    }));
  }

  async sendMessage(senderId: string, receiverId: string, content: string) {
    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        messageType: MessageType.TEXT,
        rideId: null,
      },
    });

    return {
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      messageType: message.messageType,
      sentAt: message.sentAt.toISOString(),
      isRead: message.isRead,
      readAt: null,
    };
  }

  async markAsRead(adminId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: {
        rideId: null,
        senderId: userId,
        receiverId: adminId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getMessagesForUser(userId: string) {
    // Find all admin users to identify admin messages
    const adminUsers = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    const adminIds = adminUsers.map((u) => u.id);

    const messages = await this.prisma.message.findMany({
      where: {
        rideId: null,
        OR: [
          { senderId: userId, receiverId: { in: adminIds } },
          { senderId: { in: adminIds }, receiverId: userId },
        ],
      },
      orderBy: { sentAt: 'asc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    return messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      senderName: [m.sender.firstName, m.sender.lastName].filter(Boolean).join(' ') || 'Admin',
      content: m.content,
      messageType: m.messageType,
      sentAt: m.sentAt.toISOString(),
      isRead: m.isRead,
      readAt: m.readAt?.toISOString() ?? null,
      isFromAdmin: m.sender.role === 'ADMIN',
    }));
  }

  async replyToAdmin(userId: string, content: string) {
    // Find the most recent admin who messaged this user
    const lastAdminMessage = await this.prisma.message.findFirst({
      where: {
        rideId: null,
        receiverId: userId,
        sender: { role: 'ADMIN' },
      },
      orderBy: { sentAt: 'desc' },
      select: { senderId: true },
    });

    if (!lastAdminMessage) {
      return null;
    }

    return this.sendMessage(userId, lastAdminMessage.senderId, content);
  }

  async markAdminMessagesAsRead(userId: string) {
    await this.prisma.message.updateMany({
      where: {
        rideId: null,
        receiverId: userId,
        isRead: false,
        sender: { role: 'ADMIN' },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadCountFromAdmin(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        rideId: null,
        receiverId: userId,
        isRead: false,
        sender: { role: 'ADMIN' },
      },
    });
  }
}
