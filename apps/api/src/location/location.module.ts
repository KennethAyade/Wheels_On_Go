import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';

/**
 * Location module for Google Maps API operations
 * - Geocoding / Reverse Geocoding
 * - Places Autocomplete
 * - Place Details
 * - Distance Matrix
 * - Haversine distance calculation
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 second timeout for API calls
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
