import { DriverDocumentType } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;

export const MIN_DOCUMENT_BYTES = 50 * 1024; // 50 KB
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export class RequestKycUploadDto {
  @IsEnum(DriverDocumentType)
  type: DriverDocumentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @IsIn(ALLOWED_DOCUMENT_MIME_TYPES as unknown as string[])
  mimeType: string;

  @IsOptional()
  @IsInt()
  @Min(MIN_DOCUMENT_BYTES)
  @Max(MAX_DOCUMENT_BYTES)
  size?: number;
}
