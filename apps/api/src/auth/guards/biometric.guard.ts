import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt } from 'passport-jwt';
import { JwtUser } from '../../common/types/jwt-user.type';

@Injectable()
export class BiometricGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    if (!token) {
      throw new UnauthorizedException('Missing biometric token');
    }

    const payload = this.jwtService.verify<JwtUser>(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    if (payload.tokenType !== 'biometric') {
      throw new UnauthorizedException('Invalid biometric token');
    }

    request.user = payload;
    return true;
  }
}
