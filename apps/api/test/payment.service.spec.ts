import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from '../src/payment/payment.service';
import { AuditService } from '../src/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';

const createTxMock = () => ({
  ride: { update: jest.fn().mockResolvedValue({}) },
  transaction: { create: jest.fn().mockResolvedValue({}) },
  driverWallet: { upsert: jest.fn().mockResolvedValue({}) },
});

const createPrismaMock = () => {
  const txMock = createTxMock();
  return {
    mock: txMock,
    prisma: {
      ride: { findUnique: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(txMock)),
    } as unknown as PrismaService,
  };
};

const makeRide = (overrides: any = {}) => ({
  id: 'ride-1',
  riderId: 'rider-1',
  status: 'COMPLETED',
  paymentStatus: 'PENDING',
  paymentMethod: 'GCASH',
  totalFare: 100,
  pickupAddress: 'Point A',
  dropoffAddress: 'Point B',
  driverProfile: {
    id: 'dp-1',
    commissionRate: 0.2,
    user: { id: 'driver-1' },
  },
  ...overrides,
});

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: PrismaService;
  let txMock: ReturnType<typeof createTxMock>;
  let auditService: AuditService;

  beforeEach(() => {
    const pm = createPrismaMock();
    prisma = pm.prisma;
    txMock = pm.mock;
    auditService = { log: jest.fn() } as unknown as AuditService;
    service = new PaymentService(prisma, auditService);
  });

  describe('processPayment()', () => {
    it('does nothing when ride not found', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(null);
      await service.processPayment('ride-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('does nothing when paymentStatus is already COMPLETED', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({ paymentStatus: 'COMPLETED' }),
      );
      await service.processPayment('ride-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('auto-completes GCASH payment', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({ paymentMethod: 'GCASH' }),
      );
      await service.processPayment('ride-1');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.ride.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ride-1' },
          data: expect.objectContaining({ paymentStatus: 'COMPLETED' }),
        }),
      );
      expect(txMock.transaction.create).toHaveBeenCalled();
      expect(txMock.driverWallet.upsert).toHaveBeenCalled();
    });

    it('auto-completes CREDIT_CARD payment', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({ paymentMethod: 'CREDIT_CARD' }),
      );
      await service.processPayment('ride-1');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paymentMethod: 'CREDIT_CARD' }),
        }),
      );
    });

    it('skips CASH payment (stays PENDING)', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({ paymentMethod: 'CASH' }),
      );
      await service.processPayment('ride-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('correctly calculates commission and net amounts', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({
          totalFare: 200,
          driverProfile: { id: 'dp-1', commissionRate: 0.15, user: { id: 'driver-1' } },
        }),
      );
      await service.processPayment('ride-1');
      expect(txMock.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            grossAmount: 200,
            commissionAmount: 30,
            netAmount: 170,
            commissionRate: 0.15,
          }),
        }),
      );
    });

    it('uses default 0.2 commission rate when commissionRate is null', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({
          totalFare: 100,
          driverProfile: { id: 'dp-1', commissionRate: null, user: { id: 'driver-1' } },
        }),
      );
      await service.processPayment('ride-1');
      expect(txMock.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            commissionAmount: 20,
            netAmount: 80,
          }),
        }),
      );
    });

    it('sets SIM- payment reference for digital payments', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({ paymentMethod: 'GCASH' }),
      );
      await service.processPayment('ride-1');
      const createCall = txMock.transaction.create.mock.calls[0][0];
      expect(createCall.data.paymentReference).toMatch(/^SIM-\d+$/);
      expect(createCall.data.paymentGateway).toBe('SIMULATED');
    });

    it('skips wallet upsert when driverProfile.id is null', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({
          driverProfile: { id: null, commissionRate: 0.2, user: { id: 'driver-1' } },
        }),
      );
      await service.processPayment('ride-1');
      expect(txMock.driverWallet.upsert).not.toHaveBeenCalled();
    });
  });

  describe('confirmCashPayment()', () => {
    it('throws NotFoundException when ride not found', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.confirmCashPayment('ride-1', 'driver-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when driver does not own ride', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({ paymentMethod: 'CASH' }),
      );
      await expect(
        service.confirmCashPayment('ride-1', 'other-driver'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when ride status is not COMPLETED', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({ paymentMethod: 'CASH', status: 'STARTED' }),
      );
      await expect(
        service.confirmCashPayment('ride-1', 'driver-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when paymentStatus is not PENDING', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({ paymentMethod: 'CASH', paymentStatus: 'COMPLETED' }),
      );
      await expect(
        service.confirmCashPayment('ride-1', 'driver-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when paymentMethod is not CASH', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({ paymentMethod: 'GCASH' }),
      );
      await expect(
        service.confirmCashPayment('ride-1', 'driver-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully confirms cash payment', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({ paymentMethod: 'CASH' }),
      );
      const result = await service.confirmCashPayment('ride-1', 'driver-1');
      expect(result).toEqual({ success: true });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const createCall = txMock.transaction.create.mock.calls[0][0];
      expect(createCall.data.paymentReference).toMatch(/^CASH-\d+$/);
      expect(createCall.data.paymentGateway).toBe('CASH');
    });

    it('calls auditService.log after cash confirmation', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(
        makeRide({ paymentMethod: 'CASH', totalFare: 150 }),
      );
      await service.confirmCashPayment('ride-1', 'driver-1');
      expect(auditService.log).toHaveBeenCalledWith(
        'driver-1',
        expect.anything(),
        'Ride',
        'ride-1',
        expect.objectContaining({ action: 'cash_confirmed', amount: 150 }),
      );
    });
  });
});
