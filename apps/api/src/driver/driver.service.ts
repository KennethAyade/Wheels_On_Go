import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentStatus,
  DriverDocumentType,
  DriverProfile,
  DriverStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LocationService } from '../location/location.service';
import { RequestKycUploadDto } from './dto/request-kyc-upload.dto';
import { ConfirmKycUploadDto } from './dto/confirm-kyc-upload.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { AvailableDriversQueryDto, AvailableDriverDto } from './dto/available-drivers.dto';
import { DriverPublicProfileDto } from './dto/driver-public-profile.dto';
import { AdminDriverListQueryDto } from './dto/admin-driver-list.dto';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly locationService: LocationService,
  ) {}

  async getKycStatus(userId: string) {
    const profile = await this.ensureProfile(userId);
    const documents = await this.prisma.driverDocument.findMany({
      where: { driverProfileId: profile.id },
    });

    const requiredTypes = [
      DriverDocumentType.LICENSE,
      DriverDocumentType.GOVERNMENT_ID,
      DriverDocumentType.PROFILE_PHOTO,
    ];

    // Enrich documents with presigned download URLs for viewing
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        if (doc.status === DocumentStatus.UPLOADED && doc.storageKey) {
          const downloadUrl = await this.storageService.getDownloadUrl(
            doc.storageKey,
            900,
          );
          return { ...doc, downloadUrl };
        }
        return { ...doc, downloadUrl: null };
      }),
    );

    const allUploaded = requiredTypes.every((type) =>
      documents.some(
        (d) => d.type === type && d.status === DocumentStatus.UPLOADED,
      ),
    );
    // No VERIFIED status yet — allVerified is future-proofing
    const allVerified = false;

    return { documents: enrichedDocuments, allUploaded, allVerified };
  }

  async getMine(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: { documents: true, user: true },
    });

    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }

    return profile;
  }

  async requestKycUpload(userId: string, dto: RequestKycUploadDto) {
    const profile = await this.ensureProfile(userId);
    const key = this.buildKey(profile, dto.type, dto.fileName);
    const uploadUrl = await this.storageService.getUploadUrl({
      key,
      contentType: dto.mimeType,
    });

    await this.prisma.driverDocument.upsert({
      where: {
        driverProfileId_type: {
          driverProfileId: profile.id,
          type: dto.type,
        },
      },
      update: {
        storageKey: key,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        status: DocumentStatus.PENDING_UPLOAD,
        size: dto.size,
        uploadedAt: null,
      },
      create: {
        driverProfileId: profile.id,
        type: dto.type,
        storageKey: key,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        status: DocumentStatus.PENDING_UPLOAD,
        size: dto.size,
      },
    });

    await this.auditService.log(userId, 'KYC_UPLOAD_REQUESTED', 'driver', profile.id, {
      type: dto.type,
    });

    return { uploadUrl, key, expiresIn: 900 };
  }

  async confirmKycUpload(userId: string, dto: ConfirmKycUploadDto) {
    const profile = await this.ensureProfile(userId);
    const document = await this.prisma.driverDocument.findUnique({
      where: {
        driverProfileId_type: {
          driverProfileId: profile.id,
          type: dto.type,
        },
      },
    });

    if (!document) {
      throw new BadRequestException('No upload request for this document');
    }

    const updated = await this.prisma.driverDocument.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.UPLOADED,
        size: dto.size ?? document.size,
        uploadedAt: new Date(),
        storageKey: dto.key ?? document.storageKey,
      },
    });

    if (dto.type === DriverDocumentType.PROFILE_PHOTO) {
      await this.prisma.driverProfile.update({
        where: { id: profile.id },
        data: {
          profilePhotoKey: updated.storageKey,
          profilePhotoUploadedAt: new Date(),
        },
      });
    }

    await this.auditService.log(userId, 'KYC_UPLOAD_CONFIRMED', 'driver', profile.id, {
      type: dto.type,
      key: dto.key,
    });

    return updated;
  }

  async updateOnlineStatus(userId: string, dto: UpdateDriverStatusDto) {
    const profile = await this.ensureProfile(userId);

    const data: any = {
      isOnline: dto.isOnline,
      lastOnlineAt: new Date(),
    };

    if (dto.latitude != null && dto.longitude != null) {
      data.currentLatitude = dto.latitude;
      data.currentLongitude = dto.longitude;
      data.currentLocationUpdatedAt = new Date();
    }

    const updated = await this.prisma.driverProfile.update({
      where: { id: profile.id },
      data,
    });

    await this.auditService.log(userId, 'DRIVER_STATUS_UPDATED', 'driver', profile.id, {
      isOnline: dto.isOnline,
    });

    return updated;
  }

  async listPendingDrivers() {
    const drivers = await this.prisma.driverProfile.findMany({
      where: { status: DriverStatus.PENDING },
      include: { documents: true, user: true },
    });

    // Enrich documents with presigned download URLs for admin review
    return Promise.all(
      drivers.map(async (driver) => ({
        ...driver,
        documents: await this.enrichDocumentsWithUrls(driver.documents),
      })),
    );
  }

  async listAllDrivers(query: AdminDriverListQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.user = {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { phoneNumber: { contains: query.search } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.driverProfile.findMany({
        where,
        include: { documents: true, user: true, vehicle: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.driverProfile.count({ where }),
    ]);

    // Enrich documents with presigned download URLs
    const enrichedData = await Promise.all(
      data.map(async (driver) => ({
        ...driver,
        documents: await this.enrichDocumentsWithUrls(driver.documents),
      })),
    );

    return {
      data: enrichedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDriverDetailForAdmin(driverId: string) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: { documents: true, user: true, vehicle: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    return {
      ...driver,
      documents: await this.enrichDocumentsWithUrls(driver.documents),
    };
  }

  private async enrichDocumentsWithUrls(documents: any[]) {
    return Promise.all(
      documents.map(async (doc) => {
        if (doc.status === DocumentStatus.UPLOADED && doc.storageKey) {
          const downloadUrl = await this.storageService.getDownloadUrl(
            doc.storageKey,
            900,
          );
          return { ...doc, downloadUrl };
        }
        return { ...doc, downloadUrl: null };
      }),
    );
  }

  async approveDriver(driverId: string, adminUserId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
    });

    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }

    await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: { status: DriverStatus.APPROVED, rejectionReason: null },
    });

    await this.auditService.log(adminUserId, 'DRIVER_APPROVED', 'driver', driverId);
    return this.getDriverDetailForAdmin(driverId);
  }

  async rejectDriver(driverId: string, adminUserId: string, reason: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
    });

    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }

    await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: { status: DriverStatus.REJECTED, rejectionReason: reason },
    });

    await this.auditService.log(adminUserId, 'DRIVER_REJECTED', 'driver', driverId, {
      reason,
    });
    return this.getDriverDetailForAdmin(driverId);
  }

  async findAvailableDrivers(dto: AvailableDriversQueryDto): Promise<AvailableDriverDto[]> {
    const radiusKm = dto.radiusKm || 10;
    const earthRadiusKm = 6371;

    // Find online, approved drivers within radius using Haversine
    const drivers = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        dp.id as "driverProfileId",
        dp."userId" as "userId",
        dp."currentLatitude",
        dp."currentLongitude",
        dp."totalRides",
        dp."profilePhotoKey",
        u."firstName",
        u."lastName",
        u."averageRating",
        u."totalRatings",
        v.make as "vehicleMake",
        v.model as "vehicleModel",
        v.year as "vehicleYear",
        v.color as "vehicleColor",
        v."plateNumber" as "vehiclePlateNumber",
        v."vehicleType" as "vehicleType",
        (${earthRadiusKm} * acos(
          cos(radians(${dto.pickupLatitude})) * cos(radians(dp."currentLatitude")) *
          cos(radians(dp."currentLongitude") - radians(${dto.pickupLongitude})) +
          sin(radians(${dto.pickupLatitude})) * sin(radians(dp."currentLatitude"))
        )) as "distanceKm"
      FROM "DriverProfile" dp
      JOIN "User" u ON u.id = dp."userId"
      LEFT JOIN "Vehicle" v ON v."driverProfileId" = dp.id AND v."isActive" = true
      WHERE dp."isOnline" = true
        AND dp."status" = '${DriverStatus.APPROVED}'
        AND dp."currentLatitude" IS NOT NULL
        AND dp."currentLongitude" IS NOT NULL
        AND (${earthRadiusKm} * acos(
          cos(radians(${dto.pickupLatitude})) * cos(radians(dp."currentLatitude")) *
          cos(radians(dp."currentLongitude") - radians(${dto.pickupLongitude})) +
          sin(radians(${dto.pickupLatitude})) * sin(radians(dp."currentLatitude"))
        )) <= ${radiusKm}
      ORDER BY "distanceKm" ASC
      LIMIT 50
    `);

    // Calculate fare estimate for each driver
    const estimate = await this.locationService.getDistanceMatrix({
      originLatitude: dto.pickupLatitude,
      originLongitude: dto.pickupLongitude,
      destinationLatitude: dto.dropoffLatitude,
      destinationLongitude: dto.dropoffLongitude,
    });

    const distanceKm = estimate.distanceKm;
    const durationMinutes = (estimate.durationSeconds || distanceKm * 3) / 60;
    const baseFare = 50;
    const costPerKm = 15;
    const costPerMinute = 2;
    const rawFare = baseFare + distanceKm * costPerKm + durationMinutes * costPerMinute;
    const estimatedFare = Math.max(Math.round(rawFare), 60);

    // Check which drivers have GOVERNMENT_ID uploaded (for idVerified)
    const driverProfileIds = drivers.map((d) => d.driverProfileId);
    const govIdDocs = driverProfileIds.length > 0
      ? await this.prisma.driverDocument.findMany({
          where: {
            driverProfileId: { in: driverProfileIds },
            type: DriverDocumentType.GOVERNMENT_ID,
            status: DocumentStatus.UPLOADED,
          },
          select: { driverProfileId: true },
        })
      : [];
    const verifiedSet = new Set(govIdDocs.map((d) => d.driverProfileId));

    return Promise.all(
      drivers.map(async (d) => {
        let profilePhotoUrl: string | null = null;
        if (d.profilePhotoKey) {
          profilePhotoUrl = await this.storageService.getDownloadUrl(d.profilePhotoKey, 3600);
        }
        return {
          driverProfileId: d.driverProfileId,
          userId: d.userId,
          firstName: d.firstName,
          lastName: d.lastName,
          profilePhotoUrl,
          isVerified: verifiedSet.has(d.driverProfileId),
          distanceKm: parseFloat(d.distanceKm),
          averageRating: d.averageRating,
          totalRides: d.totalRides,
          estimatedFare,
          vehicle: d.vehicleMake
            ? {
                make: d.vehicleMake,
                model: d.vehicleModel,
                year: d.vehicleYear,
                color: d.vehicleColor,
                plateNumber: d.vehiclePlateNumber,
                vehicleType: d.vehicleType,
              }
            : null,
        };
      }),
    );
  }

  async getPublicProfile(driverProfileId: string): Promise<DriverPublicProfileDto> {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
      include: {
        user: true,
        vehicle: true,
        documents: {
          where: { type: DriverDocumentType.GOVERNMENT_ID, status: DocumentStatus.UPLOADED },
          select: { id: true },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }

    // Get reviews for this driver
    const reviews = await this.prisma.rating.findMany({
      where: { revieweeId: profile.userId, isRiderToDriver: true },
      include: { reviewer: { select: { firstName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    let profilePhotoUrl: string | null = null;
    if (profile.profilePhotoKey) {
      profilePhotoUrl = await this.storageService.getDownloadUrl(profile.profilePhotoKey, 3600);
    }

    const idVerified = profile.documents.length > 0;

    return {
      driverProfileId: profile.id,
      userId: profile.userId,
      firstName: profile.user.firstName,
      lastName: profile.user.lastName,
      profilePhotoUrl,
      isOnline: profile.isOnline,
      isVerified: idVerified,
      licenseNumber: profile.licenseNumber,
      licenseExpiryDate: profile.licenseExpiryDate,
      memberSince: profile.createdAt,
      // Safety & Verification — static except idVerified and fatigueDetection
      nbiClearance: true,
      drugTest: true,
      healthCertificate: true,
      idVerified,
      fatigueDetection: false, // Coming Soon — Phase 3
      // Activity Summary
      totalRides: profile.totalRides,
      averageRating: profile.user.averageRating,
      totalRatings: profile.user.totalRatings,
      acceptanceRate: profile.acceptanceRate,
      completionRate: profile.completionRate,
      vehicle: profile.vehicle
        ? {
            make: profile.vehicle.make,
            model: profile.vehicle.model,
            year: profile.vehicle.year,
            color: profile.vehicle.color,
            plateNumber: profile.vehicle.plateNumber,
            vehicleType: profile.vehicle.vehicleType,
            seatingCapacity: profile.vehicle.seatingCapacity,
            registrationExpiry: profile.vehicle.registrationExpiry,
            insuranceExpiry: profile.vehicle.insuranceExpiry,
          }
        : null,
      reviews: reviews.map((r) => ({
        rating: r.rating,
        review: r.review,
        reviewerFirstName: r.reviewer.firstName,
        createdAt: r.createdAt,
        punctualityRating: r.punctualityRating,
        safetyRating: r.safetyRating,
        cleanlinessRating: r.cleanlinessRating,
        communicationRating: r.communicationRating,
      })),
    };
  }

  private async ensureProfile(userId: string): Promise<DriverProfile> {
    let profile = await this.prisma.driverProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await this.prisma.driverProfile.create({ data: { userId } });
    }
    return profile;
  }

  private buildKey(profile: DriverProfile, type: DriverDocumentType, fileName: string) {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    return `drivers/${profile.id}/${type.toLowerCase()}/${Date.now()}-${randomUUID()}-${safeFileName}`;
  }
}
