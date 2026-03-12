import { ChatService } from '../src/chat/chat.service';
import { PrismaService } from '../src/prisma/prisma.service';

const createPrismaMock = () =>
  ({
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    ride: { findUnique: jest.fn() },
  } as unknown as PrismaService);

const makeSentAt = () => new Date('2026-03-12T10:00:00Z');

describe('ChatService', () => {
  let service: ChatService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ChatService(prisma);
  });

  describe('saveMessage()', () => {
    it('creates message with TEXT type and returns formatted response', async () => {
      const sentAt = makeSentAt();
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-1',
        rideId: 'ride-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        content: 'Hello',
        messageType: 'TEXT',
        sentAt,
        isRead: false,
      });

      const result = await service.saveMessage({
        rideId: 'ride-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        content: 'Hello',
      });

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          rideId: 'ride-1',
          senderId: 'user-1',
          receiverId: 'user-2',
          content: 'Hello',
          messageType: 'TEXT',
        },
      });
      expect(result.sentAt).toBe(sentAt.toISOString());
      expect(result.messageType).toBe('TEXT');
    });
  });

  describe('getHistory()', () => {
    it('returns messages ordered by sentAt asc with default limit 50', async () => {
      const sentAt = makeSentAt();
      (prisma.message.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'msg-1', rideId: 'ride-1', senderId: 'u1', receiverId: 'u2',
          content: 'Hi', messageType: 'TEXT', sentAt, isRead: false,
        },
      ]);

      const result = await service.getHistory('ride-1');
      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { rideId: 'ride-1' },
        orderBy: { sentAt: 'asc' },
        take: 50,
      });
      expect(result).toHaveLength(1);
      expect(result[0].sentAt).toBe(sentAt.toISOString());
    });

    it('respects custom limit parameter', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      await service.getHistory('ride-1', 10);
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('returns empty array when no messages', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      const result = await service.getHistory('ride-1');
      expect(result).toEqual([]);
    });
  });

  describe('markAsRead()', () => {
    it('updates unread messages for the receiver', async () => {
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
      await service.markAsRead('ride-1', 'user-1');
      expect(prisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          rideId: 'ride-1',
          receiverId: 'user-1',
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('getOtherParticipant()', () => {
    it('returns null when ride not found', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await service.getOtherParticipant('ride-1', 'user-1');
      expect(result).toBeNull();
    });

    it('returns driver.id when caller is rider', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue({
        riderId: 'rider-1',
        driver: { id: 'driver-1' },
      });
      const result = await service.getOtherParticipant('ride-1', 'rider-1');
      expect(result).toBe('driver-1');
    });

    it('returns riderId when caller is driver', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue({
        riderId: 'rider-1',
        driver: { id: 'driver-1' },
      });
      const result = await service.getOtherParticipant('ride-1', 'driver-1');
      expect(result).toBe('rider-1');
    });

    it('returns null when driver is null and caller is rider', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue({
        riderId: 'rider-1',
        driver: null,
      });
      const result = await service.getOtherParticipant('ride-1', 'rider-1');
      expect(result).toBeNull();
    });
  });

  describe('isParticipant()', () => {
    it('returns false when ride not found', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await service.isParticipant('ride-1', 'user-1');
      expect(result).toBe(false);
    });

    it('returns true when userId matches riderId', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue({
        riderId: 'rider-1',
        driver: { id: 'driver-1' },
      });
      const result = await service.isParticipant('ride-1', 'rider-1');
      expect(result).toBe(true);
    });

    it('returns true when userId matches driver.id', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue({
        riderId: 'rider-1',
        driver: { id: 'driver-1' },
      });
      const result = await service.isParticipant('ride-1', 'driver-1');
      expect(result).toBe(true);
    });

    it('returns false when userId matches neither', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue({
        riderId: 'rider-1',
        driver: { id: 'driver-1' },
      });
      const result = await service.isParticipant('ride-1', 'stranger');
      expect(result).toBe(false);
    });
  });
});
