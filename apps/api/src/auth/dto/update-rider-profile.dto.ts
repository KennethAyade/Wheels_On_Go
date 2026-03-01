import { IsString, MinLength, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRiderProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(16)
  @Max(100)
  age?: number;

  @IsOptional()
  @IsString()
  @MinLength(5)
  address?: string;
}
