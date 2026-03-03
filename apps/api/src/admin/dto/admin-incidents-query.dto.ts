import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { SosIncidentStatus, SosIncidentType } from '@prisma/client';

export class AdminIncidentsQueryDto {
  @IsOptional()
  @IsEnum(SosIncidentStatus)
  status?: SosIncidentStatus;

  @IsOptional()
  @IsEnum(SosIncidentType)
  type?: SosIncidentType;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
