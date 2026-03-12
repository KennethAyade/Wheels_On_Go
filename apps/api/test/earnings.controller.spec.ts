import { EarningsController } from '../src/earnings/earnings.controller';
import { EarningsService } from '../src/earnings/earnings.service';

describe('EarningsController', () => {
  let controller: EarningsController;
  let service: EarningsService;

  beforeEach(() => {
    service = {
      getEarningsSummary: jest.fn().mockResolvedValue({ today: {}, thisWeek: {}, thisMonth: {}, total: {} }),
      getTransactionHistory: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getWalletBalance: jest.fn().mockResolvedValue({ balance: 0 }),
    } as unknown as EarningsService;
    controller = new EarningsController(service);
  });

  it('getEarnings passes user.sub to getEarningsSummary', async () => {
    const user = { sub: 'driver-1' } as any;
    await controller.getEarnings(user);
    expect(service.getEarningsSummary).toHaveBeenCalledWith('driver-1');
  });

  it('getTransactions parses page/limit and clamps limit to 100', async () => {
    const user = { sub: 'driver-1' } as any;
    await controller.getTransactions(user, { page: '3', limit: '200' } as any);
    expect(service.getTransactionHistory).toHaveBeenCalledWith('driver-1', 3, 100);
  });

  it('getTransactions uses defaults when query is empty', async () => {
    const user = { sub: 'driver-1' } as any;
    await controller.getTransactions(user, {} as any);
    expect(service.getTransactionHistory).toHaveBeenCalledWith('driver-1', 1, 20);
  });

  it('getWallet passes user.sub to getWalletBalance', async () => {
    const user = { sub: 'driver-1' } as any;
    await controller.getWallet(user);
    expect(service.getWalletBalance).toHaveBeenCalledWith('driver-1');
  });
});
