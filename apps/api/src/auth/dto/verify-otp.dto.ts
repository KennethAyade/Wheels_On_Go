import { IsEnum, IsNotEmpty, Length, Matches, ValidateIf } from 'class-validator';
import { UserRole } from '@prisma/client';

export class VerifyOtpDto {
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phoneNumber must be in E.164 format (e.g. +639XXXXXXXXX)',
  })
  phoneNumber: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;

  @ValidateIf((o) => !!o.deviceId)
  @Length(3, 64)
  deviceId?: string;
}
