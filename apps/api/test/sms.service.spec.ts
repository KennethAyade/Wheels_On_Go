import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsService } from '../src/auth/sms.service';

describe('SmsService', () => {
  describe('sendOtp()', () => {
    it('logs to console when SMS_PROVIDER=console', async () => {
      const config = new ConfigService({ SMS_PROVIDER: 'console' });
      const service = new SmsService(config);

      const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation();

      await service.sendOtp('+639171234567', '123456');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('+639171234567'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('123456'),
      );
    });

    it('calls Twilio API when SMS_PROVIDER=twilio', async () => {
      const config = new ConfigService({
        SMS_PROVIDER: 'twilio',
        TWILIO_ACCOUNT_SID: 'AC-test',
        TWILIO_AUTH_TOKEN: 'auth-token',
        TWILIO_FROM_NUMBER: '+15551234567',
      });
      const service = new SmsService(config);

      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      await service.sendOtp('+639171234567', '123456');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('AC-test'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws InternalServerErrorException when Twilio credentials missing', async () => {
      const config = new ConfigService({
        SMS_PROVIDER: 'twilio',
        // Missing credentials
      });
      const service = new SmsService(config);

      await expect(
        service.sendOtp('+639171234567', '123456'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException on Twilio API error', async () => {
      const config = new ConfigService({
        SMS_PROVIDER: 'twilio',
        TWILIO_ACCOUNT_SID: 'AC-test',
        TWILIO_AUTH_TOKEN: 'auth-token',
        TWILIO_FROM_NUMBER: '+15551234567',
      });
      const service = new SmsService(config);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Error from Twilio'),
      });

      await expect(
        service.sendOtp('+639171234567', '123456'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
