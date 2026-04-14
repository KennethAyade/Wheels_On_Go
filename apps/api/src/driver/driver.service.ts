import {
  BadRequestException,
  Injectable,
  Logger,
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
import { FatigueService } from '../fatigue/fatigue.service';
import { VerificationService } from '../verification/verification.service';
import { RequestKycUploadDto } from './dto/request-kyc-upload.dto';
import { ConfirmKycUploadDto } from './dto/confirm-kyc-upload.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { AvailableDriversQueryDto, AvailableDriverDto } from './dto/available-drivers.dto';
import { DriverProfileSetupDto } from './dto/driver-profile-setup.dto';
import { DriverPublicProfileDto } from './dto/driver-public-profile.dto';
import { AdminDriverListQueryDto } from './dto/admin-driver-list.dto';

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly locationService: LocationService,
    private readonly fatigueService: FatigueService,
    private readonly verificationService: VerificationService,
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
        if ((doc.status === DocumentStatus.UPLOADED || doc.status === DocumentStatus.VERIFIED) && doc.storageKey) {
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
        (d) =>
          d.type === type &&
          (d.status === DocumentStatus.UPLOADED ||
            d.status === DocumentStatus.VERIFIED),
      ),
    );
    const allVerified = requiredTypes.every((type) =>
      documents.some(
        (d) =>
          d.type === type &&
          (d.status === DocumentStatus.VERIFIED ||
            (d.type === DriverDocumentType.PROFILE_PHOTO &&
              d.status === DocumentStatus.UPLOADED)),
      ),
    );

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
      // Sync onto User.profilePhotoUrl so GET /auth/me (and the Settings avatar) reflects it.
      await this.prisma.user.update({
        where: { id: userId },
        data: { profilePhotoUrl: updated.storageKey } as any,
      });
    }

    await this.auditService.log(userId, 'KYC_UPLOAD_CONFIRMED', 'driver', profile.id, {
      type: dto.type,
      key: dto.key,
    });

    // AI verification for ID documents (skip for PROFILE_PHOTO)
    if (dto.type !== DriverDocumentType.PROFILE_PHOTO) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      const verificationResult =
        await this.verificationService.verifyIdDocument({
          storageKey: updated.storageKey,
          documentType: dto.type as 'LICENSE' | 'GOVERNMENT_ID',
          mimeType: updated.mimeType,
          driverFirstName: user?.firstName ?? undefined,
          driverLastName: user?.lastName ?? undefined,
        });

      if (verificationResult.requiresManualReview) {
        await this.auditService.log(
          userId,
          'KYC_VERIFICATION_DEFERRED',
          'driver',
          profile.id,
          {
            type: dto.type,
            details: verificationResult.details,
          },
        );
        return updated;
      }

      if (
        !verificationResult.isValid ||
        !verificationResult.isAuthentic ||
        verificationResult.nameMatch === false
      ) {
        const rejected = await this.prisma.driverDocument.update({
          where: { id: document.id },
          data: {
            status: DocumentStatus.REJECTED,
            rejectionReason:
              verificationResult.rejectionReason ||
              'Document verification failed. Please upload a valid, authentic ID document.',
          },
        });

        await this.auditService.log(
          userId,
          'KYC_VERIFICATION_FAILED',
          'driver',
          profile.id,
          {
            type: dto.type,
            reason: verificationResult.rejectionReason,
            details: verificationResult.details,
            confidence: verificationResult.confidence,
          },
        );

        return rejected;
      }

      // Verification passed
      const verified = await this.prisma.driverDocument.update({
        where: { id: document.id },
        data: { status: DocumentStatus.VERIFIED },
      });

      await this.auditService.log(
        userId,
        'KYC_VERIFICATION_PASSED',
        'driver',
        profile.id,
        {
          type: dto.type,
          confidence: verificationResult.confidence,
          details: verificationResult.details,
        },
      );

      return verified;
    }

    return updated;
  }

  async setupDriverProfile(userId: string, dto: DriverProfileSetupDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { firstName: dto.firstName, lastName: dto.lastName } as any,
    });
    await this.prisma.driverProfile.update({
      where: { userId },
      data: {
        licenseNumber: dto.licenseNumber,
        licenseExpiryDate: new Date(dto.licenseExpiryDate),
      },
    });
    return {
      firstName: dto.firstName,
      lastName: dto.lastName,
      licenseNumber: dto.licenseNumber,
      isProfileComplete: true,
    };
  }

  async updateOnlineStatus(userId: string, dto: UpdateDriverStatusDto) {
    const profile = await this.ensureProfile(userId);

    if (dto.isOnline) {
      const [user, driverProfile] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        }),
        this.prisma.driverProfile.findUnique({
          where: { userId },
          select: { licenseNumber: true, licenseExpiryDate: true },
        }),
      ]);
      if (
        !user?.firstName ||
        !user?.lastName ||
        !driverProfile?.licenseNumber ||
        !driverProfile?.licenseExpiryDate
      ) {
        throw new BadRequestException(
          'Please complete your profile setup before going online.',
        );
      }

      // Approval status gate — only APPROVED drivers can go online
      if (profile.status !== DriverStatus.APPROVED) {
        const msg =
          profile.status === DriverStatus.PENDING
            ? 'Your documents are under review. You can go online once your account is approved.'
            : profile.status === DriverStatus.REJECTED
              ? 'Your documents have been rejected. Please contact support.'
              : 'Your account is suspended. Please contact support.';
        throw new BadRequestException(msg);
      }

      // Fatigue safety gate — face enrollment + fatigue check required
      const fatigueStatus = await this.fatigueService.canGoOnline(profile.id);
      if (!fatigueStatus.allowed) {
        throw new BadRequestException(fatigueStatus.reason);
      }
    }

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
      include: {
        documents: true,
        user: true,
        vehicle: true,
        fatigueDetectionLogs: {
          orderBy: { detectedAt: 'desc' },
          take: 10,
        },
      },
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
        if ((doc.status === DocumentStatus.UPLOADED || doc.status === DocumentStatus.VERIFIED) && doc.storageKey) {
          try {
            const downloadUrl = await this.storageService.getDownloadUrl(
              doc.storageKey,
              900,
            );
            return { ...doc, downloadUrl };
          } catch (err) {
            // Don't fail the whole request if one presign fails — let the
            // client render an "uploaded but unviewable" state and retry.
            this.logger.warn(
              `Failed to presign document ${doc.id} (type=${doc.type}, keyLen=${doc.storageKey?.length ?? 0}): ${(err as Error)?.message ?? err}`,
            );
            return { ...doc, downloadUrl: null };
          }
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
    const DEFAULT_RADIUS_KM = 15;
    const MAX_RADIUS_KM = 50;
    const STALE_GPS_SECONDS = 120;
    const clientProvidedRadius = dto.radiusKm != null;
    const initialRadius = clientProvidedRadius
      ? Math.min(dto.radiusKm, MAX_RADIUS_KM)
      : DEFAULT_RADIUS_KM;

    const runQuery = async (radiusKm: number) => {
      const earthRadiusKm = 6371;
      return this.prisma.$queryRawUnsafe<any[]>(`
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
          AND dp."currentLocationUpdatedAt" IS NOT NULL
          AND dp."currentLocationUpdatedAt" > (NOW() - INTERVAL '${STALE_GPS_SECONDS} seconds')
          AND (${earthRadiusKm} * acos(
            cos(radians(${dto.pickupLatitude})) * cos(radians(dp."currentLatitude")) *
            cos(radians(dp."currentLongitude") - radians(${dto.pickupLongitude})) +
            sin(radians(${dto.pickupLatitude})) * sin(radians(dp."currentLatitude"))
          )) <= ${radiusKm}
        ORDER BY "distanceKm" ASC
        LIMIT 50
      `);
    };

    let drivers = await runQuery(initialRadius);

    // Auto-expand on empty iff the client didn't pin the radius. This lets
    // riders who didn't override the default still see nearby drivers instead
    // of a misleading empty list when the initial radius is too tight.
    if (drivers.length === 0 && !clientProvidedRadius) {
      const expandedRadius = Math.min(initialRadius * 2, MAX_RADIUS_KM);
      if (expandedRadius > initialRadius) {
        drivers = await runQuery(expandedRadius);
      }
    }

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

    // A driver is "verified" once their GOVERNMENT_ID is uploaded or admin-
    // approved. Previously we filtered `status: UPLOADED` only, which made the
    // verified badge disappear the moment admin moved a doc to VERIFIED.
    const driverProfileIds = drivers.map((d) => d.driverProfileId);
    const govIdDocs = driverProfileIds.length > 0
      ? await this.prisma.driverDocument.findMany({
          where: {
            driverProfileId: { in: driverProfileIds },
            type: DriverDocumentType.GOVERNMENT_ID,
            status: { in: [DocumentStatus.UPLOADED, DocumentStatus.VERIFIED] },
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
          currentLatitude: d.currentLatitude,
          currentLongitude: d.currentLongitude,
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
          where: {
            type: DriverDocumentType.GOVERNMENT_ID,
            status: { in: [DocumentStatus.UPLOADED, DocumentStatus.VERIFIED] },
          },
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
      fatigueDetection: !!profile.faceEnrolledAt,
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
