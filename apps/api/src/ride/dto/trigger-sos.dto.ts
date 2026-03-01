import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { SosIncidentType } from '@prisma/client';

export class TriggerSosDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SosIncidentType)
  incidentType?: SosIncidentType;
}
