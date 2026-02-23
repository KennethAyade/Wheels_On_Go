import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Request DTO for geocoding an address to coordinates
 */
export class GeocodeRequestDto {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  region?: string; // Country code bias (e.g., 'PH')
}

/**
 * Request DTO for reverse geocoding coordinates to address
 */
export class ReverseGeocodeRequestDto {
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
}

/**
 * Response DTO for geocoding operations
 */
export class GeocodeResponseDto {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  formattedAddress?: string;
  types?: string[];
}

/**
 * Request DTO for distance calculation between two points
 */
export class DistanceRequestDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  originLatitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  originLongitude: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  destinationLatitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  destinationLongitude: number;
}

/**
 * Response DTO for distance calculation
 */
export class DistanceResponseDto {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds?: number;
  durationText?: string;
  distanceText?: string;
}
