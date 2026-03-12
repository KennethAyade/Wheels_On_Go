import { PaymentController } from '../src/payment/payment.controller';
import { PaymentService } from '../src/payment/payment.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = {
      confirmCashPayment: jest.fn().mockResolvedValue({ success: true }),
    } as unknown as PaymentService;
    controller = new PaymentController(paymentService);
  });

  it('calls paymentService.confirmCashPayment with rideId and user.sub', async () => {
    const user = { sub: 'driver-1', role: 'DRIVER' } as any;
    await controller.confirmCashPayment(user, 'ride-1');
    expect(paymentService.confirmCashPayment).toHaveBeenCalledWith('ride-1', 'driver-1');
  });

  it('returns the service result', async () => {
    const user = { sub: 'driver-1', role: 'DRIVER' } as any;
    const result = await controller.confirmCashPayment(user, 'ride-1');
    expect(result).toEqual({ success: true });
  });
});
