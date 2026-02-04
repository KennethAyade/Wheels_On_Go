import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit.constants';
import { LocationService } from '../location/location.service';
import { DriverStatus, RideStatus } from '@prisma/client';

/**
 * Dispatch configuration
 */
const DISPATCH_CONFIG = {
  initialSearchRadiusKm: 5.0, // Start with 5km radius
  radiusExpansionKm: 2.0, // Expand by 2km each retry
  maxSearchRadiusKm: 15.0, // Maximum 15km
  maxDispatchAttempts: 10, // Max 10 drivers before giving up
  driverResponseTimeoutMs: 30000, // 30 seconds to respond
};

/**
 * Interface for nearby driver search result
 */
export interface NearbyDriver {
  driverProfileId: string;
  userId: string;
  currentLatitude: number;
  currentLongitude: number;
  distanceKm: number;
  averageRating: number | null;
  totalRides: number;
}

/**
 * Service for driver dispatch and matching
 * - Find nearby drivers using Haversine
 * - Dispatch ride to closest driver
 * - Handle driver accept/decline
 * - Expand search radius on all declines
 */
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly locationService: LocationService,
  ) {}

  /**
   * Find available drivers within a radius using Haversine formula
   */
  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusKm: number = DISPATCH_CONFIG.initialSearchRadiusKm,
    excludeDriverIds: string[] = [],
  ): Promise<NearbyDriver[]> {
    // Use raw SQL for Haversine calculation in PostgreSQL
    const earthRadiusKm = 6371;

    // Build exclude clause
    const excludeClause =
      excludeDriverIds.length > 0
        ? `AND dp.id NOT IN (${excludeDriverIds.map((id) => `'${id}'`).join(',')})`
        : '';

    const drivers = await this.prisma.$queryRawUnsafe<NearbyDriver[]>(`
      SELECT
        dp.id as "driverProfileId",
        dp."userId" as "userId",
        dp."currentLatitude",
        dp."currentLongitude",
        dp."acceptanceRate" as "averageRating",
        dp."totalRides",
        (${earthRadiusKm} * acos(
          cos(radians(${latitude})) * cos(radians(dp."currentLatitude")) *
          cos(radians(dp."currentLongitude") - radians(${longitude})) +
          sin(radians(${latitude})) * sin(radians(dp."currentLatitude"))
        )) as "distanceKm"
      FROM "DriverProfile" dp
      WHERE dp."isOnline" = true
        AND dp."status" = '${DriverStatus.APPROVED}'
        AND dp."currentLatitude" IS NOT NULL
        AND dp."currentLongitude" IS NOT NULL
        ${excludeClause}
        AND (${earthRadiusKm} * acos(
          cos(radians(${latitude})) * cos(radians(dp."currentLatitude")) *
          cos(radians(dp."currentLongitude") - radians(${longitude})) +
          sin(radians(${latitude})) * sin(radians(dp."currentLatitude"))
        )) <= ${radiusKm}
      ORDER BY "distanceKm" ASC
      LIMIT 20
    `);

    this.logger.log(
      `Found ${drivers.length} available drivers within ${radiusKm}km of (${latitude}, ${longitude})`,
    );

    return drivers;
  }

  /**
   * Dispatch a ride to the nearest available driver
   * Returns the dispatch attempt or null if no drivers available
   */
  async dispatchRide(rideId: string): Promise<any> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.PENDING) {
      throw new BadRequestException('Ride is not in PENDING status');
    }

    // Get existing dispatch attempts to exclude those drivers
    const existingAttempts = await this.prisma.dispatchAttempt.findMany({
      where: { rideId },
      select: { driverProfileId: true },
    });

    const attemptCount = existingAttempts.length;
    const excludeDriverIds = existingAttempts.map((a) => a.driverProfileId);

    // Check if we've hit max attempts
    if (attemptCount >= DISPATCH_CONFIG.maxDispatchAttempts) {
      this.logger.warn(`Max dispatch attempts reached for ride ${rideId}`);
      // Mark ride as expired
      await this.prisma.ride.update({
        where: { id: rideId },
        data: { status: RideStatus.EXPIRED },
      });
      return null;
    }

    // Calculate search radius (expand after initial attempts)
    const expansions = Math.floor(attemptCount / 3); // Expand every 3 attempts
    const searchRadius = Math.min(
      DISPATCH_CONFIG.initialSearchRadiusKm +
        expansions * DISPATCH_CONFIG.radiusExpansionKm,
      DISPATCH_CONFIG.maxSearchRadiusKm,
    );

    // Find nearby drivers
    const nearbyDrivers = await this.findNearbyDrivers(
      ride.pickupLatitude,
      ride.pickupLongitude,
      searchRadius,
      excludeDriverIds,
    );

    if (nearbyDrivers.length === 0) {
      // Try with expanded radius
      const expandedRadius = Math.min(
        searchRadius + DISPATCH_CONFIG.radiusExpansionKm,
        DISPATCH_CONFIG.maxSearchRadiusKm,
      );

      const driversExpanded = await this.findNearbyDrivers(
        ride.pickupLatitude,
        ride.pickupLongitude,
        expandedRadius,
        excludeDriverIds,
      );

      if (driversExpanded.length === 0) {
        this.logger.warn(
          `No available drivers within ${expandedRadius}km for ride ${rideId}`,
        );
        return null;
      }

      // Use expanded results
      nearbyDrivers.push(...driversExpanded);
    }

    // Get the closest driver
    const closestDriver = nearbyDrivers[0];

    // Create dispatch attempt
    const dispatchAttempt = await this.prisma.dispatchAttempt.create({
      data: {
        rideId,
        driverProfileId: closestDriver.driverProfileId,
        driverLatitude: closestDriver.currentLatitude,
        driverLongitude: closestDriver.currentLongitude,
        distanceToPickup: closestDriver.distanceKm * 1000, // Convert to meters
        sentAt: new Date(),
      },
    });

    this.logger.log(
      `Dispatched ride ${rideId} to driver ${closestDriver.driverProfileId} (${closestDriver.distanceKm.toFixed(2)}km away)`,
    );

    return {
      dispatchAttempt,
      driver: closestDriver,
    };
  }

  /**
   * Handle driver response to dispatch (accept/decline)
   */
  async handleDriverResponse(
    dispatchAttemptId: string,
    driverUserId: string,
    accepted: boolean,
    declineReason?: string,
  ): Promise<any> {
    // Get dispatch attempt
    const dispatchAttempt = await this.prisma.dispatchAttempt.findUnique({
      where: { id: dispatchAttemptId },
      include: { ride: true },
    });

    if (!dispatchAttempt) {
      throw new NotFoundException('Dispatch attempt not found');
    }

    // Get driver profile to verify ownership
    const driverProfile = await this.prisma.driverProfile.findFirst({
      where: {
        id: dispatchAttempt.driverProfileId,
        userId: driverUserId,
      },
    });

    if (!driverProfile) {
      throw new BadRequestException('You are not authorized to respond to this dispatch');
    }

    // Check if already responded
    if (dispatchAttempt.respondedAt) {
      throw new BadRequestException('You have already responded to this dispatch');
    }

    // Update dispatch attempt
    await this.prisma.dispatchAttempt.update({
      where: { id: dispatchAttemptId },
      data: {
        respondedAt: new Date(),
        accepted,
        declineReason: accepted ? null : declineReason,
      },
    });

    if (accepted) {
      // Accept the ride
      const updatedRide = await this.prisma.ride.update({
        where: { id: dispatchAttempt.rideId },
        data: {
          driverProfileId: dispatchAttempt.driverProfileId,
          driverId: driverUserId,
          status: RideStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: {
          rider: { select: { id: true, phoneNumber: true } },
          driver: { select: { id: true, phoneNumber: true } },
          driverProfile: {
            include: {
              vehicle: true,
            },
          },
        },
      });

      // Audit log
      await this.auditService.log(
        driverUserId,
        AuditAction.RIDE_ACCEPTED,
        'Ride',
        dispatchAttempt.rideId,
        { driverProfileId: dispatchAttempt.driverProfileId },
      );

      this.logger.log(
        `Driver ${dispatchAttempt.driverProfileId} accepted ride ${dispatchAttempt.rideId}`,
      );

      return { accepted: true, ride: updatedRide };
    } else {
      // Decline - try to dispatch to next driver
      this.logger.log(
        `Driver ${dispatchAttempt.driverProfileId} declined ride ${dispatchAttempt.rideId}: ${declineReason}`,
      );

      // Dispatch to next driver asynchronously
      const nextDispatch = await this.dispatchRide(dispatchAttempt.rideId);

      return {
        accepted: false,
        declineReason,
        nextDispatchAttempt: nextDispatch,
      };
    }
  }

  /**
   * Get dispatch attempts for a ride
   */
  async getDispatchAttempts(rideId: string): Promise<any[]> {
    const attempts = await this.prisma.dispatchAttempt.findMany({
      where: { rideId },
      orderBy: { sentAt: 'asc' },
    });

    // Get driver profiles separately
    const driverProfileIds = [...new Set(attempts.map((a) => a.driverProfileId))];
    const driverProfiles = await this.prisma.driverProfile.findMany({
      where: { id: { in: driverProfileIds } },
      include: { user: { select: { phoneNumber: true } } },
    });

    const profileMap = new Map(driverProfiles.map((p) => [p.id, p]));

    return attempts.map((attempt) => ({
      ...attempt,
      driverProfile: profileMap.get(attempt.driverProfileId),
    }));
  }

  /**
   * Get pending dispatch for driver
   */
  async getPendingDispatchForDriver(driverUserId: string): Promise<any> {
    const driverProfile = await this.prisma.driverProfile.findFirst({
      where: { userId: driverUserId },
    });

    if (!driverProfile) {
      return null;
    }

    // Find dispatch attempts without response
    const pendingDispatch = await this.prisma.dispatchAttempt.findFirst({
      where: {
        driverProfileId: driverProfile.id,
        respondedAt: null,
        ride: {
          status: RideStatus.PENDING,
        },
      },
      include: {
        ride: {
          include: {
            rider: { select: { id: true, phoneNumber: true } },
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    return pendingDispatch;
  }

  /**
   * Cancel all pending dispatch attempts for a ride
   */
  async cancelPendingDispatches(rideId: string): Promise<void> {
    await this.prisma.dispatchAttempt.updateMany({
      where: {
        rideId,
        respondedAt: null,
      },
      data: {
        respondedAt: new Date(),
        accepted: false,
        declineReason: 'Ride cancelled',
      },
    });
  }
}
