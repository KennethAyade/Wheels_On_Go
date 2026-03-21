import { IsOptional, IsString } from 'class-validator';

export class AdminReportsQueryDto {
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
