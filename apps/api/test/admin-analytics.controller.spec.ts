import { AdminAnalyticsController } from '../src/admin/admin-analytics.controller';
import { PrismaService } from '../src/prisma/prisma.service';

const prismaMock = () =>
  ({
    ride: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    driverProfile: { count: jest.fn(), findMany: jest.fn() },
  }) as unknown as PrismaService;

describe('AdminAnalyticsController', () => {
  let controller: AdminAnalyticsController;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = prismaMock();
    controller = new AdminAnalyticsController(prisma);
  });

  describe('getOverview()', () => {
    it('should return series with default 30 days', async () => {
      (prisma.ride.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.getOverview();
      expect(result.totalDays).toBe(30);
      expect(result.series).toHaveLength(30);
    });

    it('should respect custom days param', async () => {
      (prisma.ride.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.getOverview('14');
      expect(result.totalDays).toBe(14);
      expect(result.series).toHaveLength(14);
    });

    it('should cap days at 90', async () => {
      (prisma.ride.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.getOverview('200');
      expect(result.totalDays).toBe(90);
      expect(result.series).toHaveLength(90);
    });

    it('should sum revenue correctly for COMPLETED rides', async () => {
      const today = new Date().toISOString().slice(0, 10);
      (prisma.ride.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date(today), completedAt: new Date(today), totalFare: 100, status: 'COMPLETED' },
        { createdAt: new Date(today), completedAt: new Date(today), totalFare: 250, status: 'COMPLETED' },
        { createdAt: new Date(today), completedAt: null, totalFare: 50, status: 'PENDING' },
      ]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.getOverview('7');
      const todayEntry = result.series.find((s) => s.date === today);
      expect(todayEntry).toBeDefined();
      expect(todayEntry!.rides).toBe(3);
      expect(todayEntry!.revenue).toBe(350);
    });
  });

  describe('getDriverMetrics()', () => {
    it('should return correct approval rate and counts', async () => {
      (prisma.driverProfile.count as jest.Mock)
        .mockResolvedValueOnce(8)   // APPROVED
        .mockResolvedValueOnce(2)   // PENDING
        .mockResolvedValueOnce(2);  // REJECTED
      (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.getDriverMetrics();
      expect(result.totalApproved).toBe(8);
      expect(result.totalPending).toBe(2);
      expect(result.totalRejected).toBe(2);
      // approvalRate = 8/(8+2) * 100 = 80
      expect(result.approvalRate).toBe(80);
    });

    it('should return top drivers', async () => {
      const topDrivers = [
        { id: 'd1', totalRides: 50, completionRate: 0.95, acceptanceRate: 0.9, user: { firstName: 'A', lastName: 'B', averageRating: 4.8 } },
      ];
      (prisma.driverProfile.count as jest.Mock).mockResolvedValue(0);
      (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue(topDrivers);

      const result = await controller.getDriverMetrics();
      expect(result.topDrivers).toEqual(topDrivers);
    });
  });
});
