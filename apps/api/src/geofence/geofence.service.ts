import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocationService } from '../location/location.service';
import { GeofenceEventType, RideStatus } from '@prisma/client';

/**
 * Geofence configuration
 */
const GEOFENCE_CONFIG = {
  approachingRadiusMeters: 200, // Notify when driver is approaching
  arrivedRadiusMeters: 50, // Driver has arrived
};

/**
 * Service for geofence detection
 * - Detect when driver approaches/arrives at pickup/dropoff
 * - Create geofence events
 * - Trigger notifications
 */
@Injectable()
export class GeofenceService {
  private readonly logger = new Logger(GeofenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
  ) {}

  /**
   * Check if driver location triggers any geofence events
   * Called on each driver location update during an active ride
   */
  async checkGeofence(
    rideId: string,
    driverLat: number,
    driverLng: number,
  ): Promise<GeofenceEventType | null> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      return null;
    }

    // Determine which geofence to check based on ride status
    let targetLat: number;
    let targetLng: number;
    let approachingEvent: GeofenceEventType;
    let arrivedEvent: GeofenceEventType;

    if (ride.status === RideStatus.ACCEPTED) {
      // Check pickup geofence
      targetLat = ride.pickupLatitude;
      targetLng = ride.pickupLongitude;
      approachingEvent = GeofenceEventType.DRIVER_APPROACHING_PICKUP;
      arrivedEvent = GeofenceEventType.DRIVER_ARRIVED_PICKUP;
    } else if (ride.status === RideStatus.STARTED) {
      // Check dropoff geofence
      targetLat = ride.dropoffLatitude;
      targetLng = ride.dropoffLongitude;
      approachingEvent = GeofenceEventType.DRIVER_APPROACHING_DROPOFF;
      arrivedEvent = GeofenceEventType.DRIVER_ARRIVED_DROPOFF;
    } else {
      // No geofence to check
      return null;
    }

    // Calculate distance to target
    const distanceMeters =
      this.locationService.calculateHaversineDistance(
        driverLat,
        driverLng,
        targetLat,
        targetLng,
      ) * 1000; // Convert km to meters

    // Check existing events to avoid duplicates
    const existingEvents = await this.prisma.geofenceEvent.findMany({
      where: { rideId },
      select: { eventType: true },
    });

    const existingEventTypes = existingEvents.map((e) => e.eventType);

    // Check for arrived (higher priority)
    if (distanceMeters <= GEOFENCE_CONFIG.arrivedRadiusMeters) {
      if (!existingEventTypes.includes(arrivedEvent)) {
        await this.recordGeofenceEvent(rideId, arrivedEvent, driverLat, driverLng);
        this.logger.log(
          `Geofence: Driver arrived at ${arrivedEvent === GeofenceEventType.DRIVER_ARRIVED_PICKUP ? 'pickup' : 'dropoff'} for ride ${rideId}`,
        );
        return arrivedEvent;
      }
    }
    // Check for approaching
    else if (distanceMeters <= GEOFENCE_CONFIG.approachingRadiusMeters) {
      if (!existingEventTypes.includes(approachingEvent)) {
        await this.recordGeofenceEvent(rideId, approachingEvent, driverLat, driverLng);
        this.logger.log(
          `Geofence: Driver approaching ${approachingEvent === GeofenceEventType.DRIVER_APPROACHING_PICKUP ? 'pickup' : 'dropoff'} for ride ${rideId}`,
        );
        return approachingEvent;
      }
    }

    return null;
  }

  /**
   * Record a geofence event
   */
  async recordGeofenceEvent(
    rideId: string,
    eventType: GeofenceEventType,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await this.prisma.geofenceEvent.create({
      data: {
        rideId,
        eventType,
        latitude,
        longitude,
        radiusMeters:
          eventType.includes('ARRIVED')
            ? GEOFENCE_CONFIG.arrivedRadiusMeters
            : GEOFENCE_CONFIG.approachingRadiusMeters,
      },
    });
  }

  /**
   * Get geofence events for a ride
   */
  async getGeofenceEvents(rideId: string): Promise<any[]> {
    return this.prisma.geofenceEvent.findMany({
      where: { rideId },
      orderBy: { triggeredAt: 'asc' },
    });
  }

  /**
   * Check if driver is within a specific radius of a point
   */
  isWithinRadius(
    centerLat: number,
    centerLng: number,
    pointLat: number,
    pointLng: number,
    radiusMeters: number,
  ): boolean {
    return this.locationService.isWithinRadiusMeters(
      centerLat,
      centerLng,
      pointLat,
      pointLng,
      radiusMeters,
    );
  }

  /**
   * Get distance from driver to target
   */
  getDistanceToTarget(
    driverLat: number,
    driverLng: number,
    targetLat: number,
    targetLng: number,
  ): number {
    return (
      this.locationService.calculateHaversineDistance(
        driverLat,
        driverLng,
        targetLat,
        targetLng,
      ) * 1000
    ); // Return meters
  }
}
