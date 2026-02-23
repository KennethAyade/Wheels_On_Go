import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  GeocodeRequestDto,
  GeocodeResponseDto,
  ReverseGeocodeRequestDto,
  DistanceRequestDto,
  DistanceResponseDto,
  PlaceAutocompleteRequestDto,
  PlaceAutocompleteResponseDto,
  PlacePredictionDto,
  PlaceDetailsRequestDto,
  PlaceDetailsResponseDto,
} from './dto';

/**
 * Service for Google Maps Platform location APIs
 * - Geocoding API:       geocode / reverseGeocode
 * - Places API:          getPlaceAutocomplete / getPlaceDetails
 * - Distance Matrix API: getDistanceMatrix
 * - Haversine:           pure-math distance (no API call, used by geofence + dispatch)
 */
@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly googleMapsApiKey: string;
  private static readonly GOOGLE_BASE = 'https://maps.googleapis.com/maps/api';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.googleMapsApiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY', '');
    this.logger.log('LocationService initialized with Google Maps API');
  }

  /**
   * Geocode an address to coordinates using Google Geocoding API
   */
  async geocode(dto: GeocodeRequestDto): Promise<GeocodeResponseDto> {
    const params: Record<string, string> = {
      address: dto.address,
      region: (dto.region || 'ph').toLowerCase(),
      key: this.googleMapsApiKey,
    };

    try {
      const response = await this.httpService.axiosRef.get(
        `${LocationService.GOOGLE_BASE}/geocode/json`,
        { params },
      );

      const data = response.data;
      if (data.status !== 'OK' || !data.results?.length) {
        this.logger.warn(`Geocoding failed for "${dto.address}": ${data.status}`);
        throw new BadRequestException('Unable to geocode address: No results found');
      }

      const result = data.results[0];
      return {
        address: dto.address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        placeId: result.place_id,
        formattedAddress: result.formatted_address,
        types: result.types || [],
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Geocoding error: ${error.message}`);
      throw new BadRequestException('Failed to geocode address');
    }
  }

  /**
   * Reverse geocode coordinates to address using Google Geocoding API
   */
  async reverseGeocode(dto: ReverseGeocodeRequestDto): Promise<GeocodeResponseDto> {
    const params: Record<string, string> = {
      latlng: `${dto.latitude},${dto.longitude}`,
      key: this.googleMapsApiKey,
    };

    try {
      const response = await this.httpService.axiosRef.get(
        `${LocationService.GOOGLE_BASE}/geocode/json`,
        { params },
      );

      const data = response.data;
      if (data.status !== 'OK' || !data.results?.length) {
        this.logger.warn(
          `Reverse geocoding failed for (${dto.latitude}, ${dto.longitude}): ${data.status}`,
        );
        throw new BadRequestException('Unable to reverse geocode: No results found');
      }

      const result = data.results[0];
      return {
        address: result.formatted_address || '',
        latitude: dto.latitude,
        longitude: dto.longitude,
        placeId: result.place_id,
        formattedAddress: result.formatted_address,
        types: result.types || [],
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Reverse geocoding error: ${error.message}`);
      throw new BadRequestException('Failed to reverse geocode coordinates');
    }
  }

  /**
   * Get place autocomplete suggestions using Google Places Autocomplete API
   * Note: Google does NOT return lat/lng in autocomplete — coordinates come from Place Details.
   */
  async getPlaceAutocomplete(
    dto: PlaceAutocompleteRequestDto,
  ): Promise<PlaceAutocompleteResponseDto> {
    const lat = dto.latitude ?? 14.5995;
    const lng = dto.longitude ?? 120.9842;

    const params: Record<string, string | number> = {
      input: dto.input,
      location: `${lat},${lng}`,
      radius: dto.radius ?? 50000,
      language: dto.language || 'en',
      key: this.googleMapsApiKey,
    };

    // Only add type filter when explicitly provided
    if (dto.types) {
      params.type = dto.types;
    }

    // Session token for billing optimisation (groups autocomplete + one Details call)
    if (dto.sessionToken) {
      params.sessiontoken = dto.sessionToken;
    }

    try {
      const response = await this.httpService.axiosRef.get(
        `${LocationService.GOOGLE_BASE}/place/autocomplete/json`,
        { params },
      );

      const data = response.data;

      // ZERO_RESULTS is a valid, non-error response
      if (data.status === 'ZERO_RESULTS') {
        return { predictions: [], status: 'OK' };
      }

      if (data.status !== 'OK') {
        this.logger.warn(`Google Places Autocomplete status: ${data.status}`);
        throw new BadRequestException(`Failed to get place suggestions: ${data.status}`);
      }

      const predictions: PlacePredictionDto[] = (data.predictions || []).map(
        (pred: any) => ({
          placeId: pred.place_id,
          description: pred.description,
          mainText: pred.structured_formatting?.main_text || pred.description || '',
          secondaryText: pred.structured_formatting?.secondary_text || '',
          types: pred.types || [],
          // latitude / longitude intentionally omitted — Google autocomplete does not return them
        }),
      );

      return {
        predictions,
        status: 'OK',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Places autocomplete error: ${error.message}`);
      throw new BadRequestException('Failed to get place suggestions');
    }
  }

  /**
   * Get place details by Google place_id using Google Place Details API
   * Uses field masking to stay in the cheapest billing tier.
   */
  async getPlaceDetails(dto: PlaceDetailsRequestDto): Promise<PlaceDetailsResponseDto> {
    const params: Record<string, string> = {
      place_id: dto.placeId,
      fields: 'name,formatted_address,geometry/location,types',
      key: this.googleMapsApiKey,
    };

    if (dto.language) {
      params.language = dto.language;
    }

    if (dto.sessionToken) {
      params.sessiontoken = dto.sessionToken;
    }

    try {
      const response = await this.httpService.axiosRef.get(
        `${LocationService.GOOGLE_BASE}/place/details/json`,
        { params },
      );

      const data = response.data;
      if (data.status !== 'OK') {
        this.logger.warn(`Place details status: ${data.status} for placeId: ${dto.placeId}`);
        throw new BadRequestException(`Unable to get place details: ${data.status}`);
      }

      const result = data.result;
      return {
        placeId: dto.placeId,
        name: result.name || '',
        address: result.formatted_address || '',
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        types: result.types || [],
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Place details error: ${error.message}`);
      throw new BadRequestException('Failed to get place details');
    }
  }

  /**
   * Get distance and duration between two points using Google Distance Matrix API.
   * Falls back to Haversine calculation if the API call fails or returns no route.
   */
  async getDistanceMatrix(dto: DistanceRequestDto): Promise<DistanceResponseDto> {
    const params: Record<string, string> = {
      origins: `${dto.originLatitude},${dto.originLongitude}`,
      destinations: `${dto.destinationLatitude},${dto.destinationLongitude}`,
      mode: 'driving',
      key: this.googleMapsApiKey,
    };

    try {
      const response = await this.httpService.axiosRef.get(
        `${LocationService.GOOGLE_BASE}/distancematrix/json`,
        { params },
      );

      const data = response.data;

      if (
        data.status !== 'OK' ||
        !data.rows?.length ||
        !data.rows[0].elements?.length
      ) {
        this.logger.warn(`Distance Matrix failed: ${data.status}`);
        return this.getHaversineFallback(dto);
      }

      const element = data.rows[0].elements[0];
      if (element.status !== 'OK') {
        this.logger.warn(`Distance Matrix element status: ${element.status}`);
        return this.getHaversineFallback(dto);
      }

      const distanceMeters = element.distance.value;
      const durationSeconds = element.duration.value;
      const distanceKm = distanceMeters / 1000;
      const durationMinutes = Math.round(durationSeconds / 60);

      return {
        distanceMeters,
        distanceKm,
        durationSeconds,
        durationText: this.formatDuration(durationMinutes),
        distanceText: `${distanceKm.toFixed(1)} km`,
      };
    } catch (error) {
      this.logger.error(`Distance Matrix error: ${error.message}`);
      return this.getHaversineFallback(dto);
    }
  }

  /**
   * Get Haversine-based distance fallback
   * Estimates duration based on average Manila traffic speed (~20 km/h)
   */
  private getHaversineFallback(dto: DistanceRequestDto): DistanceResponseDto {
    const haversineKm = this.calculateHaversineDistance(
      dto.originLatitude,
      dto.originLongitude,
      dto.destinationLatitude,
      dto.destinationLongitude,
    );

    // Estimate road distance as 1.3x straight-line distance (typical urban factor)
    const estimatedRoadKm = haversineKm * 1.3;
    // Estimate duration: ~20 km/h average in Manila traffic
    const estimatedMinutes = Math.round((estimatedRoadKm / 20) * 60);

    return {
      distanceMeters: Math.round(estimatedRoadKm * 1000),
      distanceKm: estimatedRoadKm,
      durationSeconds: estimatedMinutes * 60,
      durationText: this.formatDuration(estimatedMinutes),
      distanceText: `${estimatedRoadKm.toFixed(1)} km (estimated)`,
    };
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * No API call required - pure math
   * @returns Distance in kilometers
   */
  calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers

    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if a point is within a radius of a center point
   * @param radiusKm - Radius in kilometers
   */
  isWithinRadius(
    centerLat: number,
    centerLng: number,
    pointLat: number,
    pointLng: number,
    radiusKm: number,
  ): boolean {
    const distance = this.calculateHaversineDistance(
      centerLat,
      centerLng,
      pointLat,
      pointLng,
    );
    return distance <= radiusKm;
  }

  /**
   * Check if a point is within a radius in meters
   */
  isWithinRadiusMeters(
    centerLat: number,
    centerLng: number,
    pointLat: number,
    pointLng: number,
    radiusMeters: number,
  ): boolean {
    return this.isWithinRadius(
      centerLat,
      centerLng,
      pointLat,
      pointLng,
      radiusMeters / 1000,
    );
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
