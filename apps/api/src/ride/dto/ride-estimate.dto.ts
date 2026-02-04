import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for requesting a ride fare estimate
 */
export class RideEstimateRequestDto {
  // Pickup Location
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  pickupLatitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  pickupLongitude: number;

  // Dropoff Location
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  dropoffLatitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  dropoffLongitude: number;

  @IsOptional()
  @IsString()
  promoCode?: string;
}

/**
 * Response DTO for ride fare estimate
 */
export class RideEstimateResponseDto {
  // Distance & Duration
  distanceMeters: number;
  distanceKm: number;
  distanceText: string;
  durationSeconds: number;
  durationMinutes: number;
  durationText: string;

  // Fare Breakdown
  baseFare: number;
  distanceFare: number; // costPerKm × distance
  timeFare: number; // costPerMin × duration
  surgePricing: number; // Surge multiplier amount
  surgeMultiplier: number;
  promoDiscount: number;

  // Total
  estimatedFare: number;
  currency: string; // PHP

  // Pricing Config (for transparency)
  costPerKm: number;
  costPerMinute: number;
}

/**
 * Update ride status DTO
 */
export class UpdateRideStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  reason?: string; // For cancellations

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number; // Driver's current location

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;
}

/**
 * Cancel ride DTO
 */
export class CancelRideDto {
  @IsString()
  reason: string;
}

/**
 * Ride response DTO (full details)
 */
export class RideResponseDto {
  id: string;
  riderId: string;
  driverId?: string;
  status: string;
  rideType: string;

  // Pickup
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  pickupPlaceId?: string;

  // Dropoff
  dropoffLatitude: number;
  dropoffLongitude: number;
  dropoffAddress: string;
  dropoffPlaceId?: string;

  // Estimates
  estimatedDistance?: number;
  estimatedDuration?: number;
  estimatedFare?: number;

  // Actuals (after ride completion)
  actualDistance?: number;
  actualDuration?: number;
  actualFare?: number;

  // Fare breakdown
  baseFare?: number;
  costPerKm?: number;
  costPerMin?: number;
  surgePricing?: number;
  promoDiscount?: number;

  // Payment
  paymentMethod: string;
  paymentStatus?: string;

  // Timestamps
  createdAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  scheduledPickupTime?: Date;

  // Related data - rider is User, driver is User, driverProfile has vehicle
  driver?: {
    id: string;
    userId: string;
    phoneNumber?: string;
    driverProfile?: {
      id: string;
      vehicle?: {
        make: string;
        model: string;
        color: string;
        plateNumber: string;
      };
    };
  };

  rider?: {
    id: string;
    userId: string;
    phoneNumber?: string;
  };
}
