import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BiometricGuard } from '../src/auth/guards/biometric.guard';

const JWT_SECRET = 'test-secret';

const createMockContext = (authHeader?: string) => {
  const request = {
    headers: authHeader ? { authorization: authHeader } : {},
    user: undefined as any,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    request,
  };
};

describe('BiometricGuard', () => {
  let guard: BiometricGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({ secret: JWT_SECRET });
    const config = new ConfigService({ JWT_SECRET });
    guard = new BiometricGuard(jwtService, config);
  });

  describe('canActivate()', () => {
    it('throws UnauthorizedException when no token in header', () => {
      const ctx = createMockContext();

      expect(() => guard.canActivate(ctx as any)).toThrow(UnauthorizedException);
    });

    it('verifies JWT signature via JwtService', () => {
      const token = jwtService.sign(
        { sub: 'user-1', role: 'DRIVER', phoneNumber: '+639171234567', tokenType: 'biometric' },
        { secret: JWT_SECRET },
      );
      const ctx = createMockContext(`Bearer ${token}`);

      const result = guard.canActivate(ctx as any);

      expect(result).toBe(true);
    });

    it('throws UnauthorizedException when tokenType != "biometric"', () => {
      const token = jwtService.sign(
        { sub: 'user-1', role: 'DRIVER', phoneNumber: '+639171234567', tokenType: 'access' },
        { secret: JWT_SECRET },
      );
      const ctx = createMockContext(`Bearer ${token}`);

      expect(() => guard.canActivate(ctx as any)).toThrow(UnauthorizedException);
    });

    it('accepts valid biometric token and sets request.user', () => {
      const payload = { sub: 'user-1', role: 'DRIVER', phoneNumber: '+639171234567', tokenType: 'biometric' };
      const token = jwtService.sign(payload, { secret: JWT_SECRET });
      const ctx = createMockContext(`Bearer ${token}`);

      guard.canActivate(ctx as any);

      expect(ctx.request.user).toEqual(
        expect.objectContaining({
          sub: 'user-1',
          role: 'DRIVER',
          tokenType: 'biometric',
        }),
      );
    });

    it('rejects access tokens (tokenType="access")', () => {
      const token = jwtService.sign(
        { sub: 'user-1', role: 'DRIVER', phoneNumber: '+639171234567', tokenType: 'access' },
        { secret: JWT_SECRET },
      );
      const ctx = createMockContext(`Bearer ${token}`);

      expect(() => guard.canActivate(ctx as any)).toThrow(UnauthorizedException);
    });
  });
});
