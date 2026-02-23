import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Request DTO for Google Places Autocomplete
 */
export class PlaceAutocompleteRequestDto {
  @IsNotEmpty()
  @IsString()
  input: string;

  @IsOptional()
  @IsString()
  sessionToken?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  radius?: number; // meters, for biasing results

  @IsOptional()
  @IsString()
  language?: string; // e.g., 'en', 'fil'

  @IsOptional()
  @IsString()
  types?: string; // e.g., 'establishment', 'geocode', 'address'
}

/**
 * A single prediction from Places Autocomplete
 * Note: Google Places Autocomplete does not return lat/lng; use Place Details to resolve coordinates
 */
export class PlacePredictionDto {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
  // Not populated by Google Autocomplete. Place Details call is always required.
  latitude?: number;
  longitude?: number;
}

/**
 * Response DTO for Places Autocomplete
 */
export class PlaceAutocompleteResponseDto {
  predictions: PlacePredictionDto[];
  status: string;
}

/**
 * Request DTO for Place Details
 * Coordinates are not available from Google Autocomplete; controller passes only placeId + sessionToken + language
 */
export class PlaceDetailsRequestDto {
  @IsNotEmpty()
  @IsString()
  placeId: string;

  @IsOptional()
  @IsString()
  sessionToken?: string;

  @IsOptional()
  @IsString()
  language?: string;

  // Legacy — controller does not populate these. Retained for DTO compatibility.
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

/**
 * Response DTO for Place Details
 */
export class PlaceDetailsResponseDto {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  types: string[];
  formattedPhoneNumber?: string;
  website?: string;
  vicinity?: string;
}
