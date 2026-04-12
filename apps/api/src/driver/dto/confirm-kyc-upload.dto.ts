import { DriverDocumentType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  MAX_DOCUMENT_BYTES,
  MIN_DOCUMENT_BYTES,
} from './request-kyc-upload.dto';

export class ConfirmKycUploadDto {
  @IsEnum(DriverDocumentType)
  type: DriverDocumentType;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsOptional()
  @IsInt()
  @Min(MIN_DOCUMENT_BYTES)
  @Max(MAX_DOCUMENT_BYTES)
  size?: number;
}
