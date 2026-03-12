import { SubscriptionController } from '../src/subscription/subscription.controller';
import { SubscriptionService } from '../src/subscription/subscription.service';

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let service: SubscriptionService;

  beforeEach(() => {
    service = {
      listPlans: jest.fn().mockResolvedValue([{ id: 'plan-1' }]),
      getMySubscription: jest.fn().mockResolvedValue({ active: true }),
      subscribe: jest.fn().mockResolvedValue({ success: true }),
      cancelSubscription: jest.fn().mockResolvedValue({ success: true }),
    } as unknown as SubscriptionService;
    controller = new SubscriptionController(service);
  });

  it('listPlans delegates to service', async () => {
    const result = await controller.listPlans();
    expect(service.listPlans).toHaveBeenCalled();
    expect(result).toEqual([{ id: 'plan-1' }]);
  });

  it('getMySubscription passes user.sub to service', async () => {
    const user = { sub: 'user-1' } as any;
    await controller.getMySubscription(user);
    expect(service.getMySubscription).toHaveBeenCalledWith('user-1');
  });

  it('subscribe passes user.sub and dto.planId to service', async () => {
    const user = { sub: 'user-1' } as any;
    await controller.subscribe(user, { planId: 'plan-1' } as any);
    expect(service.subscribe).toHaveBeenCalledWith('user-1', 'plan-1');
  });

  it('cancelSubscription passes user.sub to service', async () => {
    const user = { sub: 'user-1' } as any;
    await controller.cancelSubscription(user);
    expect(service.cancelSubscription).toHaveBeenCalledWith('user-1');
  });
});
