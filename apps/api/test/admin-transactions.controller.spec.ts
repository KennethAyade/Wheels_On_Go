import { AdminTransactionsController } from '../src/admin/admin-transactions.controller';
import { PrismaService } from '../src/prisma/prisma.service';

const createPrismaMock = () =>
  ({
    transaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as PrismaService);

const makeTx = (overrides: any = {}) => ({
  id: 'tx-1',
  type: 'RIDE_PAYMENT',
  amount: 100,
  status: 'COMPLETED',
  paymentMethod: 'GCASH',
  paymentReference: 'SIM-123',
  grossAmount: 100,
  commissionAmount: 20,
  commissionRate: 0.2,
  netAmount: 80,
  processedAt: new Date('2026-03-12T10:00:00Z'),
  createdAt: new Date('2026-03-12T10:00:00Z'),
  user: { id: 'u1', firstName: 'John', lastName: 'Doe' },
  driverProfile: {
    user: { id: 'd1', firstName: 'Jane', lastName: 'Smith' },
  },
  ride: { id: 'ride-1', pickupAddress: 'A', dropoffAddress: 'B' },
  ...overrides,
});

describe('AdminTransactionsController', () => {
  let controller: AdminTransactionsController;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = createPrismaMock();
    controller = new AdminTransactionsController(prisma);
  });

  it('returns paginated transactions with correct mapping', async () => {
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([makeTx()]);
    (prisma.transaction.count as jest.Mock).mockResolvedValue(1);

    const result = await controller.listTransactions({} as any);
    expect(result.data[0].rider).toEqual({ id: 'u1', firstName: 'John', lastName: 'Doe' });
    expect(result.data[0].driver).toEqual({ id: 'd1', firstName: 'Jane', lastName: 'Smith' });
    expect(result.data[0].ride).toEqual({ id: 'ride-1', pickupAddress: 'A', dropoffAddress: 'B' });
  });

  it('applies type/status/paymentMethod filters', async () => {
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.transaction.count as jest.Mock).mockResolvedValue(0);

    await controller.listTransactions({
      type: 'RIDE_PAYMENT',
      status: 'COMPLETED',
      paymentMethod: 'CASH',
    } as any);

    const findCall = (prisma.transaction.findMany as jest.Mock).mock.calls[0][0];
    expect(findCall.where.type).toBe('RIDE_PAYMENT');
    expect(findCall.where.status).toBe('COMPLETED');
    expect(findCall.where.paymentMethod).toBe('CASH');
  });

  it('applies dateFrom/dateTo range filters', async () => {
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.transaction.count as jest.Mock).mockResolvedValue(0);

    await controller.listTransactions({
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
    } as any);

    const findCall = (prisma.transaction.findMany as jest.Mock).mock.calls[0][0];
    expect(findCall.where.createdAt.gte).toEqual(new Date('2026-03-01'));
    expect(findCall.where.createdAt.lte).toEqual(new Date('2026-03-31'));
  });

  it('defaults to page=1 and limit=20', async () => {
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.transaction.count as jest.Mock).mockResolvedValue(0);

    const result = await controller.listTransactions({} as any);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('clamps limit to 100', async () => {
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.transaction.count as jest.Mock).mockResolvedValue(0);

    await controller.listTransactions({ limit: '500' } as any);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it('calculates totalPages correctly', async () => {
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.transaction.count as jest.Mock).mockResolvedValue(45);

    const result = await controller.listTransactions({ limit: '10' } as any);
    expect(result.totalPages).toBe(5);
  });
});
