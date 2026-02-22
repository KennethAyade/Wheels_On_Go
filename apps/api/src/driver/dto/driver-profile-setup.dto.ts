import { IsString, MinLength, IsDateString } from 'class-validator';

export class DriverProfileSetupDto {
  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsString()
  @MinLength(3)
  licenseNumber: string;

  @IsDateString()
  licenseExpiryDate: string;
}
