import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyFee: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRidesPerMonth?: number;

  @IsOptional()
  @IsBoolean()
  priorityDispatch?: boolean;
}
