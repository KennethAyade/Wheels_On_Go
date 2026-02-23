import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RequestOtpDto {
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phoneNumber must be in E.164 format (e.g. +639XXXXXXXXX)',
  })
  phoneNumber: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsBoolean()
  debugMode?: boolean;
}
