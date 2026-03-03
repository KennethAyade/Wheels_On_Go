import { IsString, MinLength } from 'class-validator';

export class SuspendUserDto {
  @IsString()
  @MinLength(5)
  reason: string;
}
