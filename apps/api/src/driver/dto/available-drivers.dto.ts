import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AvailableDriversQueryDto {
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
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  radiusKm?: number;
}

export class AvailableDriverVehicleDto {
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  vehicleType: string;
}

export class AvailableDriverDto {
  driverProfileId: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  profilePhotoUrl: string | null;
  isVerified: boolean;
  distanceKm: number;
  averageRating: number | null;
  totalRides: number;
  estimatedFare: number;
  vehicle: AvailableDriverVehicleDto | null;
}
