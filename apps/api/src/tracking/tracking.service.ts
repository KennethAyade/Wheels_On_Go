import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeofenceService } from '../geofence/geofence.service';
import { RideStatus } from '@prisma/client';
import { UpdateLocationDto, DriverLocationBroadcastDto } from './dto/update-location.dto';

/**
 * Tracking configuration
 */
const TRACKING_CONFIG = {
  locationHistoryRetentionDays: 30, // Archive older records
  minUpdateIntervalMs: 2000, // Minimum 2 seconds between updates
};

/**
 * Service for driver location tracking
 * - Update driver's current location
 * - Record location history
 * - Trigger geofence checks
 * - Calculate ETA
 */
@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  // In-memory cache of last update timestamps to prevent spam
  private lastUpdateTimestamps = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly geofenceService: GeofenceService,
  ) {}

  /**
   * Update driver's current location
   * Called by tracking gateway or HTTP controller
   */
  async updateDriverLocation(
    driverUserId: string,
    dto: UpdateLocationDto,
  ): Promise<{
    updated: boolean;
    geofenceEvent?: string;
    activeRide?: any;
  }> {
    // Rate limiting check
    const lastUpdate = this.lastUpdateTimestamps.get(driverUserId);
    const now = Date.now();
    if (lastUpdate && now - lastUpdate < TRACKING_CONFIG.minUpdateIntervalMs) {
      return { updated: false };
    }
    this.lastUpdateTimestamps.set(driverUserId, now);

    // Get driver profile
    const driverProfile = await this.prisma.driverProfile.findFirst({
      where: { userId: driverUserId },
    });

    if (!driverProfile) {
      this.logger.warn(`Driver profile not found for user ${driverUserId}`);
      return { updated: false };
    }

    // Update driver's current location
    await this.prisma.driverProfile.update({
      where: { id: driverProfile.id },
      data: {
        currentLatitude: dto.latitude,
        currentLongitude: dto.longitude,
        currentLocationUpdatedAt: new Date(),
      },
    });

    // Record to location history
    await this.recordLocationHistory(driverProfile.id, dto);

    // Check for active ride
    const activeRide = await this.getDriverActiveRide(driverProfile.id);

    let geofenceEvent: string | undefined;

    if (activeRide) {
      // Check geofence
      const event = await this.geofenceService.checkGeofence(
        activeRide.id,
        dto.latitude,
        dto.longitude,
      );

      if (event) {
        geofenceEvent = event;

        // Auto-update ride status on arrival
        if (event === 'DRIVER_ARRIVED_PICKUP' && activeRide.status === RideStatus.ACCEPTED) {
          await this.prisma.ride.update({
            where: { id: activeRide.id },
            data: {
              status: RideStatus.DRIVER_ARRIVED,
              driverArrivedAt: new Date(),
            },
          });
        }
      }
    }

    return {
      updated: true,
      geofenceEvent,
      activeRide,
    };
  }

  /**
   * Record location to history table
   */
  async recordLocationHistory(
    driverProfileId: string,
    dto: UpdateLocationDto,
  ): Promise<void> {
    await this.prisma.driverLocationHistory.create({
      data: {
        driverProfileId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        speed: dto.speed,
        heading: dto.heading,
        altitude: dto.altitude,
        recordedAt: new Date(),
      },
    });
  }

  /**
   * Get driver's current location
   */
  async getDriverLocation(driverProfileId: string): Promise<{
    latitude: number;
    longitude: number;
    updatedAt: Date;
  } | null> {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
      select: {
        currentLatitude: true,
        currentLongitude: true,
        currentLocationUpdatedAt: true,
      },
    });

    if (!driver?.currentLatitude || !driver?.currentLongitude) {
      return null;
    }

    return {
      latitude: driver.currentLatitude,
      longitude: driver.currentLongitude,
      updatedAt: driver.currentLocationUpdatedAt,
    };
  }

  /**
   * Get driver's active ride
   */
  async getDriverActiveRide(driverProfileId: string): Promise<any> {
    return this.prisma.ride.findFirst({
      where: {
        driverProfileId, // Use driverProfileId field
        status: {
          in: [RideStatus.ACCEPTED, RideStatus.DRIVER_ARRIVED, RideStatus.STARTED],
        },
      },
      include: {
        rider: { select: { id: true, phoneNumber: true } },
      },
    });
  }

  /**
   * Get location broadcast data for a ride
   */
  async getDriverLocationBroadcast(
    rideId: string,
  ): Promise<DriverLocationBroadcastDto | null> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driverProfile: {
          select: {
            id: true,
            currentLatitude: true,
            currentLongitude: true,
            currentLocationUpdatedAt: true,
          },
        },
      },
    });

    if (!ride?.driverProfile?.currentLatitude || !ride?.driverProfile?.currentLongitude) {
      return null;
    }

    // Get latest location history for heading/speed
    const latestHistory = await this.prisma.driverLocationHistory.findFirst({
      where: { driverProfileId: ride.driverProfileId! },
      orderBy: { recordedAt: 'desc' },
    });

    return {
      driverProfileId: ride.driverProfile.id,
      latitude: ride.driverProfile.currentLatitude,
      longitude: ride.driverProfile.currentLongitude,
      heading: latestHistory?.heading,
      speed: latestHistory?.speed,
      timestamp: ride.driverProfile.currentLocationUpdatedAt,
    };
  }

  /**
   * Archive old location history (> 30 days)
   * Should be run as a scheduled task
   */
  async archiveOldLocationHistory(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TRACKING_CONFIG.locationHistoryRetentionDays);

    const result = await this.prisma.driverLocationHistory.deleteMany({
      where: {
        recordedAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Archived ${result.count} old location history records`);
    return result.count;
  }

  /**
   * Get location history for a driver within a time range
   */
  async getLocationHistory(
    driverProfileId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    return this.prisma.driverLocationHistory.findMany({
      where: {
        driverProfileId,
        recordedAt: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }
}
