import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionService } from '../src/subscription/subscription.service';
import { AuditService } from '../src/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';

const createTxMock = () => ({
  riderProfile: { update: jest.fn().mockResolvedValue({}) },
  transaction: { create: jest.fn().mockResolvedValue({}) },
});

const createPrismaMock = () => {
  const txMock = createTxMock();
  return {
    txMock,
    prisma: {
      subscriptionPlan: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      riderProfile: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((cb: any) => cb(txMock)),
    } as unknown as PrismaService,
  };
};

const makePlan = (overrides: any = {}) => ({
  id: 'plan-1',
  name: 'Premium',
  monthlyFee: 199,
  discountPercentage: 10,
  maxRidesPerMonth: null,
  priorityDispatch: false,
  isActive: true,
  ...overrides,
});

const makeRiderProfile = (overrides: any = {}) => ({
  id: 'rp-1',
  userId: 'user-1',
  subscriptionPlanId: null,
  subscriptionStartDate: null,
  subscriptionEndDate: null,
  subscriptionPlan: null,
  ...overrides,
});

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prisma: PrismaService;
  let txMock: ReturnType<typeof createTxMock>;
  let auditService: AuditService;

  beforeEach(() => {
    const pm = createPrismaMock();
    prisma = pm.prisma;
    txMock = pm.txMock;
    auditService = { log: jest.fn() } as unknown as AuditService;
    service = new SubscriptionService(prisma, auditService);
  });

  describe('listPlans()', () => {
    it('returns active plans ordered by monthlyFee', async () => {
      const plans = [makePlan({ monthlyFee: 99 }), makePlan({ monthlyFee: 199 })];
      (prisma.subscriptionPlan.findMany as jest.Mock).mockResolvedValue(plans);
      const result = await service.listPlans();
      expect(result).toEqual(plans);
      expect(prisma.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { monthlyFee: 'asc' },
      });
    });

    it('returns empty array when no active plans', async () => {
      (prisma.subscriptionPlan.findMany as jest.Mock).mockResolvedValue([]);
      const result = await service.listPlans();
      expect(result).toEqual([]);
    });
  });

  describe('getMySubscription()', () => {
    it('throws NotFoundException when riderProfile not found', async () => {
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getMySubscription('user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns inactive when no subscriptionPlanId', async () => {
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(makeRiderProfile());
      const result = await service.getMySubscription('user-1');
      expect(result).toEqual({ active: false, plan: null, startDate: null, endDate: null });
    });

    it('returns active=true when endDate is in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      const plan = makePlan();
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({
          subscriptionPlanId: 'plan-1',
          subscriptionEndDate: futureDate,
          subscriptionPlan: plan,
        }),
      );
      const result = await service.getMySubscription('user-1');
      expect(result.active).toBe(true);
      expect(result.plan).toEqual(plan);
    });

    it('returns active=false when endDate is in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({
          subscriptionPlanId: 'plan-1',
          subscriptionEndDate: pastDate,
          subscriptionPlan: makePlan(),
        }),
      );
      const result = await service.getMySubscription('user-1');
      expect(result.active).toBe(false);
    });
  });

  describe('subscribe()', () => {
    it('throws NotFoundException when plan not found', async () => {
      (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.subscribe('user-1', 'plan-x')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when plan is inactive', async () => {
      (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(
        makePlan({ isActive: false }),
      );
      await expect(service.subscribe('user-1', 'plan-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when riderProfile not found', async () => {
      (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(makePlan());
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.subscribe('user-1', 'plan-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when already subscribed to same active plan', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(makePlan());
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({
          subscriptionPlanId: 'plan-1',
          subscriptionEndDate: futureDate,
        }),
      );
      await expect(service.subscribe('user-1', 'plan-1')).rejects.toThrow(BadRequestException);
    });

    it('allows re-subscribing when subscription expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(makePlan());
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({
          subscriptionPlanId: 'plan-1',
          subscriptionEndDate: pastDate,
        }),
      );
      const result = await service.subscribe('user-1', 'plan-1');
      expect(result.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('allows subscribing to a different plan with active subscription', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(makePlan({ id: 'plan-2' }));
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({
          subscriptionPlanId: 'plan-1',
          subscriptionEndDate: futureDate,
        }),
      );
      const result = await service.subscribe('user-1', 'plan-2');
      expect(result.success).toBe(true);
    });

    it('creates subscription within $transaction', async () => {
      (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(makePlan());
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(makeRiderProfile());
      await service.subscribe('user-1', 'plan-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.riderProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: expect.objectContaining({
            subscriptionPlanId: 'plan-1',
            subscriptionStartDate: expect.any(Date),
            subscriptionEndDate: expect.any(Date),
          }),
        }),
      );
      expect(txMock.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'SUBSCRIPTION_FEE',
            amount: 199,
            status: 'COMPLETED',
            paymentMethod: 'GCASH',
            paymentGateway: 'SIMULATED',
          }),
        }),
      );
    });

    it('sets endDate to 30 days from now', async () => {
      (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(makePlan());
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(makeRiderProfile());
      const result = await service.subscribe('user-1', 'plan-1');

      const diffMs = result.endDate.getTime() - result.startDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });

    it('calls auditService.log after subscription', async () => {
      (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(makePlan());
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(makeRiderProfile());
      await service.subscribe('user-1', 'plan-1');
      expect(auditService.log).toHaveBeenCalledWith(
        'user-1',
        expect.anything(),
        'SubscriptionPlan',
        'plan-1',
        expect.objectContaining({ action: 'subscribe', plan: 'Premium', fee: 199 }),
      );
    });

    it('returns success with plan, startDate, endDate', async () => {
      (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(makePlan());
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(makeRiderProfile());
      const result = await service.subscribe('user-1', 'plan-1');
      expect(result).toEqual({
        success: true,
        plan: expect.objectContaining({ id: 'plan-1', name: 'Premium' }),
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });
  });

  describe('cancelSubscription()', () => {
    it('throws BadRequestException when no riderProfile', async () => {
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.cancelSubscription('user-1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when no active subscription', async () => {
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({ subscriptionPlanId: null }),
      );
      await expect(service.cancelSubscription('user-1')).rejects.toThrow(BadRequestException);
    });

    it('clears subscription fields', async () => {
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({
          subscriptionPlanId: 'plan-1',
          subscriptionPlan: makePlan(),
        }),
      );
      await service.cancelSubscription('user-1');
      expect(prisma.riderProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          subscriptionPlanId: null,
          subscriptionStartDate: null,
          subscriptionEndDate: null,
        },
      });
    });

    it('calls auditService.log on cancel', async () => {
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({
          subscriptionPlanId: 'plan-1',
          subscriptionPlan: makePlan(),
        }),
      );
      await service.cancelSubscription('user-1');
      expect(auditService.log).toHaveBeenCalledWith(
        'user-1',
        expect.anything(),
        'SubscriptionPlan',
        'plan-1',
        expect.objectContaining({ action: 'cancel' }),
      );
    });

    it('returns { success: true }', async () => {
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({
          subscriptionPlanId: 'plan-1',
          subscriptionPlan: makePlan(),
        }),
      );
      const result = await service.cancelSubscription('user-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getSubscriptionDiscount()', () => {
    it('returns 0 when riderProfile not found', async () => {
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await service.getSubscriptionDiscount('user-1');
      expect(result).toBe(0);
    });

    it('returns 0 when no subscriptionPlan', async () => {
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({ subscriptionPlan: null }),
      );
      const result = await service.getSubscriptionDiscount('user-1');
      expect(result).toBe(0);
    });

    it('returns 0 when subscriptionEndDate is null', async () => {
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({
          subscriptionPlan: makePlan(),
          subscriptionEndDate: null,
        }),
      );
      const result = await service.getSubscriptionDiscount('user-1');
      expect(result).toBe(0);
    });

    it('returns 0 when subscription is expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({
          subscriptionPlan: makePlan({ discountPercentage: 10 }),
          subscriptionEndDate: pastDate,
        }),
      );
      const result = await service.getSubscriptionDiscount('user-1');
      expect(result).toBe(0);
    });

    it('returns discountPercentage when subscription is active', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      (prisma.riderProfile.findUnique as jest.Mock).mockResolvedValue(
        makeRiderProfile({
          subscriptionPlan: makePlan({ discountPercentage: 10 }),
          subscriptionEndDate: futureDate,
        }),
      );
      const result = await service.getSubscriptionDiscount('user-1');
      expect(result).toBe(10);
    });
  });
});
