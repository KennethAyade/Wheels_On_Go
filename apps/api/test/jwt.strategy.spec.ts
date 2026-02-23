import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../src/auth/jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const config = new ConfigService({ JWT_SECRET: 'test-secret' });
    strategy = new JwtStrategy(config);
  });

  describe('validate()', () => {
    const basePayload = {
      sub: 'user-1',
      role: 'RIDER' as any,
      phoneNumber: '+639171234567',
    };

    it('returns payload when tokenType is "access"', () => {
      const result = strategy.validate({ ...basePayload, tokenType: 'access' });

      expect(result).toEqual(expect.objectContaining({
        sub: 'user-1',
        role: 'RIDER',
        tokenType: 'access',
      }));
    });

    it('normalizes undefined tokenType to "access"', () => {
      const result = strategy.validate({ ...basePayload });

      expect(result.tokenType).toBe('access');
    });

    it('throws UnauthorizedException when tokenType is "biometric"', () => {
      expect(() =>
        strategy.validate({ ...basePayload, tokenType: 'biometric' }),
      ).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for unknown tokenType', () => {
      expect(() =>
        strategy.validate({ ...basePayload, tokenType: 'refresh' as any }),
      ).toThrow(UnauthorizedException);
    });
  });
});
