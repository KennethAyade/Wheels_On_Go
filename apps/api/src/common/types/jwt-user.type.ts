import { UserRole } from '@prisma/client';

export type JwtUser = {
  sub: string;
  role: UserRole;
  phoneNumber: string;
  tokenType?: 'access' | 'biometric';
};
