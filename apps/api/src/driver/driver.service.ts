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
import { RequestKycUploadDto } from './dto/request-kyc-upload.dto';
import { ConfirmKycUploadDto } from './dto/confirm-kyc-upload.dto';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

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

  async listPendingDrivers() {
    return this.prisma.driverProfile.findMany({
      where: { status: DriverStatus.PENDING },
      include: { documents: true, user: true },
    });
  }

  async approveDriver(driverId: string, adminUserId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
    });

    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }

    const updated = await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: { status: DriverStatus.APPROVED, rejectionReason: null },
    });

    await this.auditService.log(adminUserId, 'DRIVER_APPROVED', 'driver', driverId);
    return updated;
  }

  async rejectDriver(driverId: string, adminUserId: string, reason: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
    });

    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }

    const updated = await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: { status: DriverStatus.REJECTED, rejectionReason: reason },
    });

    await this.auditService.log(adminUserId, 'DRIVER_REJECTED', 'driver', driverId, {
      reason,
    });
    return updated;
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
