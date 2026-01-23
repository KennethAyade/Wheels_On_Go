import { DriverDocumentType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class RequestKycUploadDto {
  @IsEnum(DriverDocumentType)
  type: DriverDocumentType;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsOptional()
  @IsNumber()
  size?: number;
}
