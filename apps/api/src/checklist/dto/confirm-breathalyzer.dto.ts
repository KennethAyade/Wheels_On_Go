import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmBreathalyzerDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  rideId: string;
}
