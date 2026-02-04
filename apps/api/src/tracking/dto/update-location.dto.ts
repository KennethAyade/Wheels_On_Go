import {
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for updating driver location
 */
export class UpdateLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accuracy?: number; // meters

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  speed?: number; // m/s

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  @Type(() => Number)
  heading?: number; // degrees from north

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  altitude?: number; // meters
}

/**
 * Response DTO for location update
 */
export class LocationUpdateResponseDto {
  success: boolean;
  timestamp: Date;
  latitude: number;
  longitude: number;
}

/**
 * DTO for driver location broadcast
 */
export class DriverLocationBroadcastDto {
  driverProfileId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
  eta?: number; // seconds to destination
}
