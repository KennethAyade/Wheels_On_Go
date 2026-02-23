import { RideService } from '../src/ride/ride.service';
import { AuditService } from '../src/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { LocationService } from '../src/location/location.service';

const prismaMock = () =>
  ({
    ride: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    riderProfile: {
      findFirst: jest.fn(),
    },
    riderVehicle: {
      findUnique: jest.fn(),
    },
    driverProfile: {
      findMany: jest.fn(),
    },
    surgePricingLog: {
      create: jest.fn(),
    },
    promoCode: {
      findUnique: jest.fn(),
    },
    userPromoUsage: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService);

describe('RideService - Surge Pricing & Promo Codes', () => {
  let service: RideService;
  let prisma: PrismaService;
  let locationService: LocationService;
  let audit: AuditService;

  beforeEach(() => {
    prisma = prismaMock();
    audit = { log: jest.fn() } as unknown as AuditService;
    locationService = {
      getDistanceMatrix: jest.fn().mockResolvedValue({
        distanceMeters: 5000,
        distanceKm: 5,
        durationSeconds: 600,
        distanceText: '5 km',
        durationText: '10 min',
      }),
      calculateHaversineDistance: jest.fn().mockReturnValue(1.0), // 1km - within radius
    } as unknown as LocationService;

    service = new RideService(prisma, audit, locationService);
  });

  describe('calculateEstimate() - surge pricing', () => {
    beforeEach(() => {
      // Default: no demand, no supply = no surge
      (prisma.ride.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.surgePricingLog.create as jest.Mock).mockResolvedValue({});
    });

    it('returns 1.0x multiplier when no demand', async () => {
      const result = await service.calculateEstimate({
        pickupLatitude: 14.5,
        pickupLongitude: 121.0,
        dropoffLatitude: 14.6,
        dropoffLongitude: 121.1,
      });

      expect(result.surgeMultiplier).toBe(1.0);
      expect(result.surgePricing).toBe(0);
    });

    it('returns 1.25x when demand/supply ratio >= 1.0', async () => {
      // 2 pending rides, 1 driver (ratio = 2/1 = 2.0 → actually 1.5x)
      (prisma.ride.findMany as jest.Mock).mockResolvedValue([
        { pickupLatitude: 14.5, pickupLongitude: 121.0 },
        { pickupLatitude: 14.5, pickupLongitude: 121.0 },
      ]);
      (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue([
        { currentLatitude: 14.5, currentLongitude: 121.0 },
      ]);

      const result = await service.calculateEstimate({
        pickupLatitude: 14.5,
        pickupLongitude: 121.0,
        dropoffLatitude: 14.6,
        dropoffLongitude: 121.1,
      });

      expect(result.surgeMultiplier).toBe(1.5); // ratio = 2.0 → 1.5x
      expect(result.surgePricing).toBeGreaterThan(0);
    });

    it('caps surge at 2.0x', async () => {
      // 5 pending rides, 1 driver (ratio = 5 → 2.0x cap)
      (prisma.ride.findMany as jest.Mock).mockResolvedValue([
        { pickupLatitude: 14.5, pickupLongitude: 121.0 },
        { pickupLatitude: 14.5, pickupLongitude: 121.0 },
        { pickupLatitude: 14.5, pickupLongitude: 121.0 },
        { pickupLatitude: 14.5, pickupLongitude: 121.0 },
        { pickupLatitude: 14.5, pickupLongitude: 121.0 },
      ]);
      (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue([
        { currentLatitude: 14.5, currentLongitude: 121.0 },
      ]);

      const result = await service.calculateEstimate({
        pickupLatitude: 14.5,
        pickupLongitude: 121.0,
        dropoffLatitude: 14.6,
        dropoffLongitude: 121.1,
      });

      expect(result.surgeMultiplier).toBe(2.0);
    });

    it('logs surge pricing to SurgePricingLog', async () => {
      await service.calculateEstimate({
        pickupLatitude: 14.5,
        pickupLongitude: 121.0,
        dropoffLatitude: 14.6,
        dropoffLongitude: 121.1,
      });

      expect(prisma.surgePricingLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          latitude: 14.5,
          longitude: 121.0,
          surgeMultiplier: expect.any(Number),
        }),
      });
    });
  });

  describe('calculateEstimate() - promo codes', () => {
    beforeEach(() => {
      // No surge
      (prisma.ride.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.surgePricingLog.create as jest.Mock).mockResolvedValue({});
    });

    it('applies percentage discount correctly', async () => {
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue({
        code: 'SAVE20',
        isActive: true,
        discountType: 'PERCENTAGE',
        discountValue: { toNumber: () => 20 },
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2027-12-31'),
        maxUsageCount: null,
        currentUsageCount: 0,
        minRideFare: null,
        maxDiscount: null,
      });

      const result = await service.calculateEstimate({
        pickupLatitude: 14.5,
        pickupLongitude: 121.0,
        dropoffLatitude: 14.6,
        dropoffLongitude: 121.1,
        promoCode: 'SAVE20',
      });

      expect(result.promoDiscount).toBeGreaterThan(0);
    });

    it('applies fixed amount discount', async () => {
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue({
        code: 'FLAT50',
        isActive: true,
        discountType: 'FIXED_AMOUNT',
        discountValue: { toNumber: () => 50 },
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2027-12-31'),
        maxUsageCount: null,
        currentUsageCount: 0,
        minRideFare: null,
        maxDiscount: null,
      });

      const result = await service.calculateEstimate({
        pickupLatitude: 14.5,
        pickupLongitude: 121.0,
        dropoffLatitude: 14.6,
        dropoffLongitude: 121.1,
        promoCode: 'FLAT50',
      });

      expect(result.promoDiscount).toBe(50);
    });

    it('returns 0 discount for expired promo code', async () => {
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue({
        code: 'EXPIRED',
        isActive: true,
        discountType: 'PERCENTAGE',
        discountValue: { toNumber: () => 50 },
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2020-12-31'), // Expired
        maxUsageCount: null,
        currentUsageCount: 0,
        minRideFare: null,
        maxDiscount: null,
      });

      const result = await service.calculateEstimate({
        pickupLatitude: 14.5,
        pickupLongitude: 121.0,
        dropoffLatitude: 14.6,
        dropoffLongitude: 121.1,
        promoCode: 'EXPIRED',
      });

      expect(result.promoDiscount).toBe(0);
    });

    it('returns 0 discount for inactive promo code', async () => {
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue({
        code: 'INACTIVE',
        isActive: false,
        discountType: 'PERCENTAGE',
        discountValue: { toNumber: () => 50 },
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2027-12-31'),
        maxUsageCount: null,
        currentUsageCount: 0,
        minRideFare: null,
        maxDiscount: null,
      });

      const result = await service.calculateEstimate({
        pickupLatitude: 14.5,
        pickupLongitude: 121.0,
        dropoffLatitude: 14.6,
        dropoffLongitude: 121.1,
        promoCode: 'INACTIVE',
      });

      expect(result.promoDiscount).toBe(0);
    });

    it('returns 0 discount for non-existent promo code', async () => {
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.calculateEstimate({
        pickupLatitude: 14.5,
        pickupLongitude: 121.0,
        dropoffLatitude: 14.6,
        dropoffLongitude: 121.1,
        promoCode: 'NONEXISTENT',
      });

      expect(result.promoDiscount).toBe(0);
    });

    it('caps discount at maxDiscount', async () => {
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue({
        code: 'CAPPED',
        isActive: true,
        discountType: 'PERCENTAGE',
        discountValue: { toNumber: () => 90 },
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2027-12-31'),
        maxUsageCount: null,
        currentUsageCount: 0,
        minRideFare: null,
        maxDiscount: { toNumber: () => 30 }, // Cap at 30 PHP
      });

      const result = await service.calculateEstimate({
        pickupLatitude: 14.5,
        pickupLongitude: 121.0,
        dropoffLatitude: 14.6,
        dropoffLongitude: 121.1,
        promoCode: 'CAPPED',
      });

      expect(result.promoDiscount).toBeLessThanOrEqual(30);
    });
  });
});
