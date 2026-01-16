import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  register(_dto: RegisterDto) {
    return { status: 'NOT_IMPLEMENTED' };
  }

  login(_dto: LoginDto) {
    return { status: 'NOT_IMPLEMENTED' };
  }

  me() {
    return { status: 'NOT_IMPLEMENTED' };
  }
}
