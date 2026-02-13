import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class VerifyFirebaseDto {
  @IsNotEmpty()
  @IsString()
  firebaseIdToken: string;

  @IsEnum(UserRole)
  role: UserRole;
}
