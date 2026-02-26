import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class FatigueCheckDto {
  @IsString()
  imageBase64: string;

  @IsBoolean()
  @IsOptional()
  isOnRide?: boolean;

  @IsString()
  @IsOptional()
  currentRideId?: string;
}
