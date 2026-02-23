import { IsString, MinLength, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRiderProfileDto {
  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @Type(() => Number)
  @IsInt()
  @Min(16)
  @Max(100)
  age: number;

  @IsString()
  @MinLength(5)
  address: string;
}
