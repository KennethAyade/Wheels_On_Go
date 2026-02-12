import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(phoneNumber: string, code: string) {
    const provider = this.configService.get<string>('SMS_PROVIDER', 'console');

    if (provider === 'twilio') {
      await this.sendWithTwilio(phoneNumber, code);
      return;
    }

    if (provider === 'textbelt') {
      await this.sendWithTextbelt(phoneNumber, code);
      return;
    }

    // Default to console for development.
    this.logger.log(`SMS (mock) -> ${phoneNumber}: Your verification code is ${code}`);
  }

  private async sendWithTextbelt(phoneNumber: string, code: string) {
    const apiKey = this.configService.get<string>('TEXTBELT_API_KEY', 'textbelt');

    const response = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phoneNumber,
        message: `Wheels On Go: Your verification code is ${code}`,
        key: apiKey,
      }),
    });

    const result = (await response.json()) as { success: boolean; error?: string; quotaRemaining?: number };

    if (!result.success) {
      this.logger.error(`Textbelt send failed: ${result.error}`);
      throw new InternalServerErrorException('Failed to dispatch OTP SMS');
    }

    this.logger.log(`SMS sent via Textbelt. Quota remaining: ${result.quotaRemaining}`);
  }

  private async sendWithTwilio(phoneNumber: string, code: string) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      throw new InternalServerErrorException('Twilio SMS is not configured');
    }

    const body = new URLSearchParams({
      Body: `Wheels On Go: Your verification code is ${code}`,
      From: fromNumber,
      To: phoneNumber,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Twilio send failed: ${errorText}`);
      throw new InternalServerErrorException('Failed to dispatch OTP SMS');
    }
  }
}
