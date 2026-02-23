import { DriverDocumentType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ConfirmKycUploadDto {
  @IsEnum(DriverDocumentType)
  type: DriverDocumentType;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsOptional()
  @IsNumber()
  size?: number;
}
