import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit.constants';
import { LocationService } from '../location/location.service';
import { RideStatus, RideType, UserRole } from '@prisma/client';
import {
  CreateRideDto,
  CreateRideResponseDto,
  RideEstimateRequestDto,
  RideEstimateResponseDto,
  UpdateRideStatusDto,
  CancelRideDto,
  RideResponseDto,
} from './dto';

/**
 * Pricing configuration (can be moved to SystemConfiguration table later)
 */
const PRICING_CONFIG = {
  baseFare: 50, // PHP
  costPerKm: 15, // PHP per km
  costPerMinute: 2, // PHP per minute
  minimumFare: 60, // PHP minimum fare
  currency: 'PHP',
};

/**
 * Service for ride management
 * - Create ride requests
 * - Calculate fare estimates
 * - Update ride status
 * - Cancel rides
 */
@Injectable()
export class RideService {
  private readonly logger = new Logger(RideService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly locationService: LocationService,
  ) {}

  /**
   * Create a new ride request
   */
  async createRide(
    userId: string,
    dto: CreateRideDto,
  ): Promise<CreateRideResponseDto> {
    // Get rider profile
    const riderProfile = await this.prisma.riderProfile.findFirst({
      where: { userId },
    });

    if (!riderProfile) {
      throw new BadRequestException('Rider profile not found');
    }

    // Check for existing active ride
    const activeRide = await this.getActiveRide(userId);
    if (activeRide) {
      throw new BadRequestException('You already have an active ride');
    }

    // Validate rider vehicle if provided
    if (dto.riderVehicleId) {
      const riderVehicle = await this.prisma.riderVehicle.findUnique({
        where: { id: dto.riderVehicleId },
      });
      if (!riderVehicle) {
        throw new BadRequestException('Rider vehicle not found');
      }
      if (riderVehicle.riderProfileId !== riderProfile.id) {
        throw new ForbiddenException('This vehicle does not belong to you');
      }
    }

    // Get distance and fare estimate
    const estimate = await this.calculateEstimate({
      pickupLatitude: dto.pickupLatitude,
      pickupLongitude: dto.pickupLongitude,
      dropoffLatitude: dto.dropoffLatitude,
      dropoffLongitude: dto.dropoffLongitude,
      promoCode: dto.promoCode,
    });

    // Validate scheduled time for SCHEDULED rides
    if (dto.rideType === RideType.SCHEDULED) {
      if (!dto.scheduledPickupTime) {
        throw new BadRequestException('Scheduled pickup time is required for scheduled rides');
      }
      const scheduledTime = new Date(dto.scheduledPickupTime);
      if (scheduledTime <= new Date()) {
        throw new BadRequestException('Scheduled pickup time must be in the future');
      }
    }

    // Create the ride
    const ride = await this.prisma.ride.create({
      data: {
        riderId: userId, // riderId references User.id
        status: RideStatus.PENDING,
        rideType: dto.rideType,
        pickupLatitude: dto.pickupLatitude,
        pickupLongitude: dto.pickupLongitude,
        pickupAddress: dto.pickupAddress,
        pickupPlaceId: dto.pickupPlaceId,
        dropoffLatitude: dto.dropoffLatitude,
        dropoffLongitude: dto.dropoffLongitude,
        dropoffAddress: dto.dropoffAddress,
        dropoffPlaceId: dto.dropoffPlaceId,
        estimatedDistance: estimate.distanceMeters,
        estimatedDuration: estimate.durationSeconds,
        estimatedFare: estimate.estimatedFare,
        baseFare: PRICING_CONFIG.baseFare,
        costPerKm: PRICING_CONFIG.costPerKm,
        costPerMin: PRICING_CONFIG.costPerMinute,
        surgePricing: estimate.surgePricing,
        promoDiscount: estimate.promoDiscount,
        totalFare: estimate.estimatedFare, // Required field
        paymentMethod: dto.paymentMethod,
        riderVehicleId: dto.riderVehicleId || null,
        scheduledPickupTime: dto.scheduledPickupTime
          ? new Date(dto.scheduledPickupTime)
          : null,
      },
    });

    // Audit log
    await this.auditService.log(
      userId,
      AuditAction.RIDE_CREATED,
      'Ride',
      ride.id,
      { rideType: dto.rideType, estimatedFare: estimate.estimatedFare },
    );

    this.logger.log(`Ride created: ${ride.id} by rider ${riderProfile.id}`);

    return {
      id: ride.id,
      riderId: ride.riderId,
      status: ride.status,
      rideType: ride.rideType,
      pickupLatitude: ride.pickupLatitude,
      pickupLongitude: ride.pickupLongitude,
      pickupAddress: ride.pickupAddress,
      dropoffLatitude: ride.dropoffLatitude,
      dropoffLongitude: ride.dropoffLongitude,
      dropoffAddress: ride.dropoffAddress,
      estimatedDistance: ride.estimatedDistance,
      estimatedDuration: ride.estimatedDuration,
      estimatedFare: ride.estimatedFare.toNumber(),
      paymentMethod: ride.paymentMethod,
      createdAt: ride.createdAt,
      scheduledPickupTime: ride.scheduledPickupTime,
    };
  }

  /**
   * Calculate ride fare estimate
   */
  async calculateEstimate(
    dto: RideEstimateRequestDto,
  ): Promise<RideEstimateResponseDto> {
    // Get distance from Google Distance Matrix (or Haversine fallback)
    const distanceResult = await this.locationService.getDistanceMatrix({
      originLatitude: dto.pickupLatitude,
      originLongitude: dto.pickupLongitude,
      destinationLatitude: dto.dropoffLatitude,
      destinationLongitude: dto.dropoffLongitude,
    });

    const distanceKm = distanceResult.distanceKm;
    const durationMinutes = (distanceResult.durationSeconds || distanceKm * 3) / 60; // Estimate 3 min/km if no duration

    // Calculate fare components
    const distanceFare = distanceKm * PRICING_CONFIG.costPerKm;
    const timeFare = durationMinutes * PRICING_CONFIG.costPerMinute;

    // Get surge pricing (if any)
    const surgeMultiplier = await this.getSurgeMultiplier(
      dto.pickupLatitude,
      dto.pickupLongitude,
    );
    const surgePricing =
      surgeMultiplier > 1
        ? (PRICING_CONFIG.baseFare + distanceFare + timeFare) * (surgeMultiplier - 1)
        : 0;

    // Calculate promo discount
    let promoDiscount = 0;
    if (dto.promoCode) {
      promoDiscount = await this.calculatePromoDiscount(
        dto.promoCode,
        PRICING_CONFIG.baseFare + distanceFare + timeFare + surgePricing,
      );
    }

    // Calculate total
    let estimatedFare =
      PRICING_CONFIG.baseFare + distanceFare + timeFare + surgePricing - promoDiscount;

    // Apply minimum fare
    estimatedFare = Math.max(estimatedFare, PRICING_CONFIG.minimumFare);

    // Round to nearest peso
    estimatedFare = Math.round(estimatedFare);

    return {
      distanceMeters: distanceResult.distanceMeters,
      distanceKm,
      distanceText: distanceResult.distanceText || `${distanceKm.toFixed(1)} km`,
      durationSeconds: distanceResult.durationSeconds || Math.round(durationMinutes * 60),
      durationMinutes: Math.round(durationMinutes),
      durationText: distanceResult.durationText || `${Math.round(durationMinutes)} min`,
      baseFare: PRICING_CONFIG.baseFare,
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      surgePricing: Math.round(surgePricing),
      surgeMultiplier,
      promoDiscount: Math.round(promoDiscount),
      estimatedFare,
      currency: PRICING_CONFIG.currency,
      costPerKm: PRICING_CONFIG.costPerKm,
      costPerMinute: PRICING_CONFIG.costPerMinute,
    };
  }

  /**
   * Get ride by ID
   */
  async getRideById(rideId: string, userId: string): Promise<RideResponseDto> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
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

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Verify user has access to this ride
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const isRider = userId === ride.riderId;
    const isDriver = userId === ride.driverId;
    const isAdmin = user?.role === UserRole.ADMIN;

    if (!isRider && !isDriver && !isAdmin) {
      throw new ForbiddenException('You do not have access to this ride');
    }

    return this.mapRideToResponse(ride);
  }

  /**
   * Get active ride for user
   */
  async getActiveRide(userId: string): Promise<RideResponseDto | null> {
    const activeStatuses = [
      RideStatus.PENDING,
      RideStatus.ACCEPTED,
      RideStatus.DRIVER_ARRIVED,
      RideStatus.STARTED,
    ];

    let ride = null;

    // Check as rider (riderId is User ID)
    ride = await this.prisma.ride.findFirst({
      where: {
        riderId: userId,
        status: { in: activeStatuses },
      },
      include: {
        rider: { select: { id: true, phoneNumber: true } },
        driver: { select: { id: true, phoneNumber: true } },
        driverProfile: {
          include: { vehicle: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check as driver if not found as rider (driverId is User ID)
    if (!ride) {
      ride = await this.prisma.ride.findFirst({
        where: {
          driverId: userId,
          status: { in: activeStatuses },
        },
        include: {
          rider: { select: { id: true, phoneNumber: true } },
          driver: { select: { id: true, phoneNumber: true } },
          driverProfile: {
            include: { vehicle: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return ride ? this.mapRideToResponse(ride) : null;
  }

  /**
   * Update ride status
   */
  async updateRideStatus(
    rideId: string,
    userId: string,
    dto: UpdateRideStatusDto,
  ): Promise<RideResponseDto> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Validate status transition
    this.validateStatusTransition(ride.status, dto.status as RideStatus);

    // Update ride
    const updateData: any = {
      status: dto.status,
    };

    // Set timestamps based on status
    switch (dto.status) {
      case RideStatus.ACCEPTED:
        updateData.acceptedAt = new Date();
        break;
      case RideStatus.DRIVER_ARRIVED:
        updateData.driverArrivedAt = new Date();
        break;
      case RideStatus.STARTED:
        updateData.startedAt = new Date();
        break;
      case RideStatus.COMPLETED:
        updateData.completedAt = new Date();
        // Calculate actual fare if needed
        break;
    }

    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: updateData,
      include: {
        rider: { select: { id: true, phoneNumber: true } },
        driver: { select: { id: true, phoneNumber: true } },
        driverProfile: {
          include: { vehicle: true },
        },
      },
    });

    // Audit log
    await this.auditService.log(
      userId,
      AuditAction.RIDE_COMPLETED, // Will be overridden by specific action
      'Ride',
      rideId,
      { previousStatus: ride.status, newStatus: dto.status },
    );

    return this.mapRideToResponse(updatedRide);
  }

  /**
   * Cancel ride
   */
  async cancelRide(
    rideId: string,
    userId: string,
    dto: CancelRideDto,
  ): Promise<RideResponseDto> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Check if ride can be cancelled
    const cancellableStatuses: RideStatus[] = [
      RideStatus.PENDING,
      RideStatus.ACCEPTED,
      RideStatus.DRIVER_ARRIVED,
    ];

    if (!cancellableStatuses.includes(ride.status)) {
      throw new BadRequestException('This ride cannot be cancelled');
    }

    // Determine who is cancelling
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    let cancelStatus: RideStatus;
    let auditAction: AuditAction;

    if (userId === ride.riderId) {
      cancelStatus = RideStatus.CANCELLED_BY_RIDER;
      auditAction = AuditAction.RIDE_CANCELLED_BY_RIDER;
    } else if (userId === ride.driverId) {
      cancelStatus = RideStatus.CANCELLED_BY_DRIVER;
      auditAction = AuditAction.RIDE_CANCELLED_BY_DRIVER;
    } else if (user?.role === UserRole.ADMIN) {
      cancelStatus = RideStatus.CANCELLED_BY_SYSTEM;
      auditAction = AuditAction.RIDE_CANCELLED_BY_SYSTEM;
    } else {
      throw new ForbiddenException('You cannot cancel this ride');
    }

    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: cancelStatus,
        cancelledAt: new Date(),
        cancellationReason: dto.reason,
      },
      include: {
        rider: { select: { id: true, phoneNumber: true } },
        driver: { select: { id: true, phoneNumber: true } },
        driverProfile: {
          include: { vehicle: true },
        },
      },
    });

    // Audit log
    await this.auditService.log(userId, auditAction, 'Ride', rideId, {
      reason: dto.reason,
    });

    return this.mapRideToResponse(updatedRide);
  }

  /**
   * Get surge multiplier based on local demand/supply ratio
   */
  private async getSurgeMultiplier(
    latitude: number,
    longitude: number,
  ): Promise<number> {
    const SURGE_RADIUS_KM = 3;
    const SUPPLY_RADIUS_KM = 5;
    const MAX_SURGE = 2.0;
    const DEMAND_WINDOW_MINUTES = 15;

    const demandSince = new Date(
      Date.now() - DEMAND_WINDOW_MINUTES * 60 * 1000,
    );

    // Count recent PENDING rides in the area (demand)
    const allPendingRides = await this.prisma.ride.findMany({
      where: {
        status: RideStatus.PENDING,
        createdAt: { gte: demandSince },
      },
      select: { pickupLatitude: true, pickupLongitude: true },
    });

    const demandCount = allPendingRides.filter((r) => {
      const dist = this.locationService.calculateHaversineDistance(
        latitude,
        longitude,
        r.pickupLatitude,
        r.pickupLongitude,
      );
      return dist <= SURGE_RADIUS_KM;
    }).length;

    // Count available drivers in the area (supply)
    const allOnlineDrivers = await this.prisma.driverProfile.findMany({
      where: {
        isOnline: true,
        status: 'APPROVED',
        currentLatitude: { not: null },
        currentLongitude: { not: null },
      },
      select: { currentLatitude: true, currentLongitude: true },
    });

    const supplyCount = allOnlineDrivers.filter((d) => {
      const dist = this.locationService.calculateHaversineDistance(
        latitude,
        longitude,
        d.currentLatitude!,
        d.currentLongitude!,
      );
      return dist <= SUPPLY_RADIUS_KM;
    }).length;

    // Calculate surge multiplier from demand/supply ratio
    const ratio = demandCount / Math.max(supplyCount, 1);
    let multiplier = 1.0;
    if (ratio >= 3.0) multiplier = 2.0;
    else if (ratio >= 2.0) multiplier = 1.5;
    else if (ratio >= 1.0) multiplier = 1.25;

    multiplier = Math.min(multiplier, MAX_SURGE);

    // Log to SurgePricingLog
    await this.prisma.surgePricingLog.create({
      data: {
        latitude,
        longitude,
        radius: SURGE_RADIUS_KM,
        surgeMultiplier: multiplier,
        activeRideCount: demandCount,
        availableDriverCount: supplyCount,
      },
    });

    return multiplier;
  }

  /**
   * Calculate promo discount using PromoCode and UserPromoUsage tables
   */
  private async calculatePromoDiscount(
    promoCode: string,
    subtotal: number,
  ): Promise<number> {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: promoCode },
    });

    if (!promo) return 0;
    if (!promo.isActive) return 0;

    const now = new Date();
    if (now < promo.validFrom || now > promo.validUntil) return 0;

    // Check max usage count
    if (promo.maxUsageCount && promo.currentUsageCount >= promo.maxUsageCount) {
      return 0;
    }

    // Check minimum fare requirement
    if (promo.minRideFare && subtotal < promo.minRideFare.toNumber()) {
      return 0;
    }

    // Calculate discount
    let discount = 0;
    if (promo.discountType === 'PERCENTAGE') {
      discount = subtotal * (promo.discountValue.toNumber() / 100);
    } else {
      // FIXED_AMOUNT
      discount = promo.discountValue.toNumber();
    }

    // Cap at max discount
    if (promo.maxDiscount) {
      discount = Math.min(discount, promo.maxDiscount.toNumber());
    }

    // Cap at subtotal (can't have negative fare)
    discount = Math.min(discount, subtotal);

    return discount;
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: RideStatus,
    newStatus: RideStatus,
  ): void {
    const validTransitions: Record<RideStatus, RideStatus[]> = {
      [RideStatus.PENDING]: [
        RideStatus.ACCEPTED,
        RideStatus.CANCELLED_BY_RIDER,
        RideStatus.CANCELLED_BY_SYSTEM,
        RideStatus.EXPIRED,
      ],
      [RideStatus.ACCEPTED]: [
        RideStatus.DRIVER_ARRIVED,
        RideStatus.CANCELLED_BY_RIDER,
        RideStatus.CANCELLED_BY_DRIVER,
        RideStatus.CANCELLED_BY_SYSTEM,
      ],
      [RideStatus.DRIVER_ARRIVED]: [
        RideStatus.STARTED,
        RideStatus.CANCELLED_BY_RIDER,
        RideStatus.CANCELLED_BY_DRIVER,
        RideStatus.CANCELLED_BY_SYSTEM,
      ],
      [RideStatus.STARTED]: [
        RideStatus.COMPLETED,
        RideStatus.CANCELLED_BY_SYSTEM,
      ],
      [RideStatus.COMPLETED]: [],
      [RideStatus.CANCELLED_BY_RIDER]: [],
      [RideStatus.CANCELLED_BY_DRIVER]: [],
      [RideStatus.CANCELLED_BY_SYSTEM]: [],
      [RideStatus.EXPIRED]: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Map Prisma ride to response DTO
   */
  private mapRideToResponse(ride: any): RideResponseDto {
    return {
      id: ride.id,
      riderId: ride.riderId,
      driverId: ride.driverId,
      status: ride.status,
      rideType: ride.rideType,
      pickupLatitude: ride.pickupLatitude,
      pickupLongitude: ride.pickupLongitude,
      pickupAddress: ride.pickupAddress,
      pickupPlaceId: ride.pickupPlaceId,
      dropoffLatitude: ride.dropoffLatitude,
      dropoffLongitude: ride.dropoffLongitude,
      dropoffAddress: ride.dropoffAddress,
      dropoffPlaceId: ride.dropoffPlaceId,
      estimatedDistance: ride.estimatedDistance,
      estimatedDuration: ride.estimatedDuration,
      estimatedFare: ride.estimatedFare?.toNumber?.() || ride.estimatedFare,
      actualDistance: ride.actualDistance,
      actualDuration: ride.actualDuration,
      actualFare: ride.actualFare?.toNumber?.() || ride.actualFare,
      baseFare: ride.baseFare?.toNumber?.() || ride.baseFare,
      costPerKm: ride.costPerKm?.toNumber?.() || ride.costPerKm,
      costPerMin: ride.costPerMin?.toNumber?.() || ride.costPerMin,
      surgePricing: ride.surgePricing?.toNumber?.() || ride.surgePricing,
      promoDiscount: ride.promoDiscount?.toNumber?.() || ride.promoDiscount,
      paymentMethod: ride.paymentMethod,
      paymentStatus: ride.paymentStatus,
      createdAt: ride.createdAt,
      acceptedAt: ride.acceptedAt,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancelledAt,
      scheduledPickupTime: ride.scheduledPickupTime,
      driver: ride.driver
        ? {
            id: ride.driverId,
            userId: ride.driverId,
            phoneNumber: ride.driver.phoneNumber,
            driverProfile: ride.driverProfile
              ? {
                  id: ride.driverProfile.id,
                  vehicle: ride.driverProfile.vehicle
                    ? {
                        make: ride.driverProfile.vehicle.make,
                        model: ride.driverProfile.vehicle.model,
                        color: ride.driverProfile.vehicle.color,
                        plateNumber: ride.driverProfile.vehicle.plateNumber,
                      }
                    : undefined,
                }
              : undefined,
          }
        : undefined,
      rider: ride.rider
        ? {
            id: ride.riderId,
            userId: ride.riderId,
            phoneNumber: ride.rider.phoneNumber,
          }
        : undefined,
    };
  }
}
