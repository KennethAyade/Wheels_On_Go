import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SosIncidentStatus } from '@prisma/client';

export class UpdateIncidentDto {
  @IsEnum(SosIncidentStatus)
  status: SosIncidentStatus;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
