import { NotFoundException } from '@nestjs/common';
import { EarningsService } from '../src/earnings/earnings.service';
import { PrismaService } from '../src/prisma/prisma.service';

const createPrismaMock = () =>
  ({
    driverProfile: { findFirst: jest.fn() },
    transaction: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    driverWallet: { findUnique: jest.fn() },
  } as unknown as PrismaService);

const makeDriverProfile = (overrides: any = {}) => ({
  id: 'dp-1',
  userId: 'driver-1',
  ...overrides,
});

describe('EarningsService', () => {
  let service: EarningsService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new EarningsService(prisma);
  });

  describe('getEarningsSummary()', () => {
    it('throws NotFoundException when driverProfile not found', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.getEarningsSummary('driver-1')).rejects.toThrow(NotFoundException);
    });

    it('returns today/thisWeek/thisMonth/total earnings', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(makeDriverProfile());
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { netAmount: 100 }, _count: 2 })
        .mockResolvedValueOnce({ _sum: { netAmount: 500 }, _count: 8 })
        .mockResolvedValueOnce({ _sum: { netAmount: 2000 }, _count: 30 })
        .mockResolvedValueOnce({ _sum: { netAmount: 10000 }, _count: 150 });

      const result = await service.getEarningsSummary('driver-1');
      expect(result.today).toEqual({ earnings: 100, rides: 2 });
      expect(result.thisWeek).toEqual({ earnings: 500, rides: 8 });
      expect(result.thisMonth).toEqual({ earnings: 2000, rides: 30 });
      expect(result.total).toEqual({ earnings: 10000, rides: 150 });
    });

    it('converts null _sum.netAmount to 0', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(makeDriverProfile());
      (prisma.transaction.aggregate as jest.Mock).mockResolvedValue({
        _sum: { netAmount: null },
        _count: 0,
      });

      const result = await service.getEarningsSummary('driver-1');
      expect(result.today.earnings).toBe(0);
      expect(result.today.rides).toBe(0);
    });

    it('calls aggregate 4 times with correct filters', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(makeDriverProfile());
      (prisma.transaction.aggregate as jest.Mock).mockResolvedValue({
        _sum: { netAmount: 0 },
        _count: 0,
      });

      await service.getEarningsSummary('driver-1');
      expect(prisma.transaction.aggregate).toHaveBeenCalledTimes(4);

      // First 3 calls have processedAt.gte, last (total) does not
      const calls = (prisma.transaction.aggregate as jest.Mock).mock.calls;
      expect(calls[0][0].where.processedAt).toBeDefined();
      expect(calls[1][0].where.processedAt).toBeDefined();
      expect(calls[2][0].where.processedAt).toBeDefined();
      expect(calls[3][0].where.processedAt).toBeUndefined();
    });
  });

  describe('getTransactionHistory()', () => {
    it('throws NotFoundException when driverProfile not found', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.getTransactionHistory('driver-1')).rejects.toThrow(NotFoundException);
    });

    it('returns paginated transactions with Decimal-to-Number conversion', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(makeDriverProfile());
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'tx-1',
          type: 'RIDE_PAYMENT',
          amount: 100,
          grossAmount: 100,
          commissionAmount: 20,
          commissionRate: 0.2,
          netAmount: 80,
          paymentMethod: 'GCASH',
          description: 'Ride payment',
          processedAt: new Date(),
          createdAt: new Date(),
        },
      ]);
      (prisma.transaction.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getTransactionHistory('driver-1');
      expect(result.data[0].amount).toBe(100);
      expect(result.data[0].grossAmount).toBe(100);
      expect(result.data[0].netAmount).toBe(80);
    });

    it('calculates skip correctly from page and limit', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(makeDriverProfile());
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.transaction.count as jest.Mock).mockResolvedValue(0);

      await service.getTransactionHistory('driver-1', 3, 10);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('uses default page=1 and limit=20', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(makeDriverProfile());
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.transaction.count as jest.Mock).mockResolvedValue(0);

      await service.getTransactionHistory('driver-1');
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('returns correct totalPages', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(makeDriverProfile());
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.transaction.count as jest.Mock).mockResolvedValue(25);

      const result = await service.getTransactionHistory('driver-1', 1, 10);
      expect(result.totalPages).toBe(3);
    });

    it('handles null grossAmount/commissionAmount/netAmount', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(makeDriverProfile());
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'tx-1',
          type: 'SUBSCRIPTION_FEE',
          amount: 99,
          grossAmount: null,
          commissionAmount: null,
          commissionRate: null,
          netAmount: null,
          paymentMethod: 'GCASH',
          description: 'Sub fee',
          processedAt: null,
          createdAt: new Date(),
        },
      ]);
      (prisma.transaction.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getTransactionHistory('driver-1');
      expect(result.data[0].grossAmount).toBeNull();
      expect(result.data[0].commissionAmount).toBeNull();
      expect(result.data[0].netAmount).toBeNull();
    });
  });

  describe('getWalletBalance()', () => {
    it('throws NotFoundException when driverProfile not found', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.getWalletBalance('driver-1')).rejects.toThrow(NotFoundException);
    });

    it('returns wallet balance as number', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(makeDriverProfile());
      (prisma.driverWallet.findUnique as jest.Mock).mockResolvedValue({ balance: 1500 });
      const result = await service.getWalletBalance('driver-1');
      expect(result).toEqual({ balance: 1500 });
    });

    it('returns 0 when wallet not found', async () => {
      (prisma.driverProfile.findFirst as jest.Mock).mockResolvedValue(makeDriverProfile());
      (prisma.driverWallet.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await service.getWalletBalance('driver-1');
      expect(result).toEqual({ balance: 0 });
    });
  });
});
