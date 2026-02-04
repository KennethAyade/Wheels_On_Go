import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LocationService } from './location.service';
import {
  GeocodeRequestDto,
  GeocodeResponseDto,
  ReverseGeocodeRequestDto,
  DistanceRequestDto,
  DistanceResponseDto,
  PlaceAutocompleteRequestDto,
  PlaceAutocompleteResponseDto,
  PlaceDetailsResponseDto,
} from './dto';

/**
 * Controller for location-related operations
 * All endpoints require authentication
 */
@Controller('location')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * Geocode an address to coordinates
   * POST /location/geocode
   */
  @Post('geocode')
  async geocode(@Body() dto: GeocodeRequestDto): Promise<GeocodeResponseDto> {
    return this.locationService.geocode(dto);
  }

  /**
   * Reverse geocode coordinates to address
   * POST /location/reverse-geocode
   */
  @Post('reverse-geocode')
  async reverseGeocode(
    @Body() dto: ReverseGeocodeRequestDto,
  ): Promise<GeocodeResponseDto> {
    return this.locationService.reverseGeocode(dto);
  }

  /**
   * Get place autocomplete suggestions
   * GET /location/autocomplete?input=...&sessionToken=...&latitude=...&longitude=...
   */
  @Get('autocomplete')
  async getAutocomplete(
    @Query() dto: PlaceAutocompleteRequestDto,
  ): Promise<PlaceAutocompleteResponseDto> {
    return this.locationService.getPlaceAutocomplete(dto);
  }

  /**
   * Get place details by place ID
   * GET /location/place/:placeId
   */
  @Get('place/:placeId')
  async getPlaceDetails(
    @Param('placeId') placeId: string,
    @Query('sessionToken') sessionToken?: string,
    @Query('language') language?: string,
  ): Promise<PlaceDetailsResponseDto> {
    return this.locationService.getPlaceDetails({
      placeId,
      sessionToken,
      language,
    });
  }

  /**
   * Calculate distance between two points
   * POST /location/distance
   */
  @Post('distance')
  async getDistance(@Body() dto: DistanceRequestDto): Promise<DistanceResponseDto> {
    return this.locationService.getDistanceMatrix(dto);
  }

  /**
   * Calculate Haversine distance (no API call)
   * GET /location/haversine-distance?originLatitude=...&originLongitude=...&destinationLatitude=...&destinationLongitude=...
   */
  @Get('haversine-distance')
  async getHaversineDistance(
    @Query() dto: DistanceRequestDto,
  ): Promise<DistanceResponseDto> {
    const distanceKm = this.locationService.calculateHaversineDistance(
      dto.originLatitude,
      dto.originLongitude,
      dto.destinationLatitude,
      dto.destinationLongitude,
    );

    return {
      distanceMeters: Math.round(distanceKm * 1000),
      distanceKm,
      distanceText: `${distanceKm.toFixed(2)} km (straight line)`,
    };
  }
}
