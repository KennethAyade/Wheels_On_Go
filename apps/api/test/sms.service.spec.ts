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

  describe('sendOtp() with provider override', () => {
    it('uses console when override is console and ALLOW_DEBUG_SMS=true', async () => {
      const config = new ConfigService({
        SMS_PROVIDER: 'textbelt',
        ALLOW_DEBUG_SMS: 'true',
      });
      const service = new SmsService(config);

      const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation();

      await service.sendOtp('+639171234567', '123456', 'console');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('console'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('123456'),
      );
    });

    it('ignores override when ALLOW_DEBUG_SMS=false and uses configured provider', async () => {
      const config = new ConfigService({
        SMS_PROVIDER: 'textbelt',
        ALLOW_DEBUG_SMS: 'false',
        TEXTBELT_API_KEY: 'textbelt',
      });
      const service = new SmsService(config);

      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();
      const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation();

      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, quotaRemaining: 10 }),
      });

      await service.sendOtp('+639171234567', '123456', 'console');

      // Should warn about denied override
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ALLOW_DEBUG_SMS is disabled'),
      );
      // Should call Textbelt instead of console
      expect(global.fetch).toHaveBeenCalledWith(
        'https://textbelt.com/text',
        expect.any(Object),
      );
    });

    it('uses configured provider when no override is given', async () => {
      const config = new ConfigService({
        SMS_PROVIDER: 'console',
        ALLOW_DEBUG_SMS: 'true',
      });
      const service = new SmsService(config);

      const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation();

      await service.sendOtp('+639171234567', '123456');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('123456'),
      );
    });
  });
});
