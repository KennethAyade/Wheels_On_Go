import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RideType, PaymentMethod } from '@prisma/client';

/**
 * DTO for creating a new ride request
 */
export class CreateRideDto {
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

  @IsNotEmpty()
  @IsString()
  pickupAddress: string;

  @IsOptional()
  @IsString()
  pickupPlaceId?: string;

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

  @IsNotEmpty()
  @IsString()
  dropoffAddress: string;

  @IsOptional()
  @IsString()
  dropoffPlaceId?: string;

  // Ride Configuration
  @IsEnum(RideType)
  rideType: RideType;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsDateString()
  scheduledPickupTime?: string; // For SCHEDULED rides

  @IsOptional()
  @IsString()
  notes?: string; // Special instructions for driver

  @IsOptional()
  @IsUUID()
  riderVehicleId?: string; // Rider's own vehicle for driver-for-hire

  @IsOptional()
  @IsUUID()
  selectedDriverId?: string; // Driver chosen by rider from available list
}

/**
 * Response DTO for created ride
 */
export class CreateRideResponseDto {
  id: string;
  riderId: string;
  status: string;
  rideType: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  dropoffAddress: string;
  estimatedDistance: number;
  estimatedDuration: number;
  estimatedFare: number;
  paymentMethod: string;
  createdAt: Date;
  scheduledPickupTime?: Date;
}
