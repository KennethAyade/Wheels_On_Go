import { IsNotEmpty, IsString } from 'class-validator';

export class RejectDriverDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
