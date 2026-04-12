import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RideStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { VerificationService } from '../verification/verification.service';
import { PresignBreathalyzerDto } from './dto/presign-breathalyzer.dto';
import { ConfirmBreathalyzerDto } from './dto/confirm-breathalyzer.dto';
import { SubmitBlowbagetsDto } from './dto/submit-blowbagets.dto';

@Injectable()
export class ChecklistService {
  private readonly logger = new Logger(ChecklistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly verificationService: VerificationService,
  ) {}

  // ── Breathalyzer ──────────────────────────────────────────

  async getBreathalyzerStatus(userId: string) {
    const profile = await this.ensureProfile(userId);

    if (
      profile.breathalyzerCooldownUntil &&
      profile.breathalyzerCooldownUntil > new Date()
    ) {
      return {
        allowed: false,
        cooldownUntil: profile.breathalyzerCooldownUntil.toISOString(),
      };
    }

    return { allowed: true };
  }

  async presignBreathalyzer(userId: string, dto: PresignBreathalyzerDto) {
    const profile = await this.ensureProfile(userId);

    // Check cooldown
    if (
      profile.breathalyzerCooldownUntil &&
      profile.breathalyzerCooldownUntil > new Date()
    ) {
      throw new BadRequestException(
        'You are currently blocked from accepting rides due to a failed breathalyzer test.',
      );
    }

    const sanitizedName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `drivers/${profile.id}/breathalyzer/${Date.now()}-${randomUUID()}-${sanitizedName}`;

    const uploadUrl = await this.storageService.getUploadUrl({
      key,
      contentType: dto.mimeType,
    });

    return { uploadUrl, key, expiresIn: 900 };
  }

  async confirmBreathalyzer(userId: string, dto: ConfirmBreathalyzerDto) {
    const profile = await this.ensureProfile(userId);

    // Verify ride exists and is in a dispatchable state (breathalyzer is a pre-acceptance gate)
    const ride = await this.prisma.ride.findFirst({
      where: {
        id: dto.rideId,
        status: RideStatus.PENDING,
      },
    });
    if (!ride) {
      throw new BadRequestException('Ride not found or no longer available.');
    }

    // Check cooldown
    if (
      profile.breathalyzerCooldownUntil &&
      profile.breathalyzerCooldownUntil > new Date()
    ) {
      throw new BadRequestException(
        'You are currently blocked from accepting rides due to a failed breathalyzer test.',
      );
    }

    // Determine mime type from key extension
    const mimeType = dto.key.match(/\.(png|jpg|jpeg|gif|webp)$/i)
      ? `image/${dto.key.split('.').pop()?.toLowerCase().replace('jpg', 'jpeg')}`
      : 'image/jpeg';

    // AI verification (fail-closed)
    let verification;
    try {
      verification = await this.verificationService.verifyBreathalyzerResult({
        storageKey: dto.key,
        mimeType,
      });
    } catch (error) {
      this.logger.error(
        `Breathalyzer verification error for driver ${profile.id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'Unable to verify image. Please try uploading again.',
      );
    }

    this.logger.log(
      `Breathalyzer verification for driver ${profile.id}: result=${verification.result}, ` +
        `raw=${verification.bacValueRaw} ${verification.bacUnitRaw ?? '(no unit)'}, ` +
        `normalized=${verification.bacNormalizedGPerL} g/L, ` +
        `threshold=${verification.thresholdGPerL} g/L, ` +
        `confidence=${verification.confidence}`,
    );

    if (verification.result === 'PASS') {
      // Record the passing breathalyzer check
      await this.prisma.blowbagetsChecklist.create({
        data: {
          driverProfileId: profile.id,
          rideId: dto.rideId,
          breathalyzerImageKey: dto.key,
          breathalyzerMimeType: mimeType,
          breathalyzerVerified: true,
          breathalyzerBacReading: verification.bacNormalizedGPerL,
          breathalyzerBacUnit: verification.bacUnitRaw,
          breathalyzerBacNormalizedGPerL: verification.bacNormalizedGPerL,
          breathalyzerThresholdGPerL: verification.thresholdGPerL,
          breathalyzerResult: 'PASS',
          breathalyzerAiDetails: verification.details,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      });

      await this.auditService.log(
        userId,
        'BREATHALYZER_PASS',
        'driver',
        profile.id,
        {
          bacValueRaw: verification.bacValueRaw,
          bacUnitRaw: verification.bacUnitRaw,
          bacNormalizedGPerL: verification.bacNormalizedGPerL,
          thresholdGPerL: verification.thresholdGPerL,
          rideId: dto.rideId,
        },
      );

      return {
        passed: true,
        result: 'PASS',
        bacReading: verification.bacNormalizedGPerL,
        bacValueRaw: verification.bacValueRaw,
        bacUnitRaw: verification.bacUnitRaw,
        bacNormalizedGPerL: verification.bacNormalizedGPerL,
        thresholdGPerL: verification.thresholdGPerL,
      };
    }

    if (verification.result === 'FAIL') {
      // Set 8-hour cooldown
      const cooldownUntil = new Date(Date.now() + 8 * 60 * 60 * 1000);

      await this.prisma.driverProfile.update({
        where: { id: profile.id },
        data: { breathalyzerCooldownUntil: cooldownUntil },
      });

      // Record the failing breathalyzer check
      await this.prisma.blowbagetsChecklist.create({
        data: {
          driverProfileId: profile.id,
          rideId: dto.rideId,
          breathalyzerImageKey: dto.key,
          breathalyzerMimeType: mimeType,
          breathalyzerVerified: true,
          breathalyzerBacReading: verification.bacNormalizedGPerL,
          breathalyzerBacUnit: verification.bacUnitRaw,
          breathalyzerBacNormalizedGPerL: verification.bacNormalizedGPerL,
          breathalyzerThresholdGPerL: verification.thresholdGPerL,
          breathalyzerResult: 'FAIL',
          breathalyzerAiDetails: verification.details,
          expiresAt: cooldownUntil,
        },
      });

      await this.auditService.log(
        userId,
        'BREATHALYZER_FAIL',
        'driver',
        profile.id,
        {
          bacValueRaw: verification.bacValueRaw,
          bacUnitRaw: verification.bacUnitRaw,
          bacNormalizedGPerL: verification.bacNormalizedGPerL,
          thresholdGPerL: verification.thresholdGPerL,
          rideId: dto.rideId,
          cooldownUntil: cooldownUntil.toISOString(),
        },
      );

      const failMessage =
        `Reading: ${verification.bacNormalizedGPerL?.toFixed(2)} g/L ` +
        `(above ${verification.thresholdGPerL.toFixed(2)} g/L limit). ` +
        `You cannot accept rides for 8 hours.`;

      return {
        passed: false,
        result: 'FAIL',
        bacReading: verification.bacNormalizedGPerL,
        bacValueRaw: verification.bacValueRaw,
        bacUnitRaw: verification.bacUnitRaw,
        bacNormalizedGPerL: verification.bacNormalizedGPerL,
        thresholdGPerL: verification.thresholdGPerL,
        cooldownUntil: cooldownUntil.toISOString(),
        details: failMessage,
      };
    }

    // INVALID_IMAGE — no cooldown, can retry
    await this.auditService.log(
      userId,
      'BREATHALYZER_INVALID_IMAGE',
      'driver',
      profile.id,
      { details: verification.details, rideId: dto.rideId },
    );

    return {
      passed: false,
      result: 'INVALID_IMAGE',
      details: verification.details || 'Please upload a clear photo of your breathalyzer test result.',
    };
  }

  // ── BLOWBAGETS Checklist ──────────────────────────────────

  async submitBlowbagets(userId: string, dto: SubmitBlowbagetsDto) {
    const profile = await this.ensureProfile(userId);

    // Verify driver owns this ride
    const ride = await this.prisma.ride.findFirst({
      where: { id: dto.rideId, driverProfileId: profile.id },
    });
    if (!ride) {
      throw new BadRequestException('Ride not found or not assigned to you.');
    }

    const allChecked =
      dto.brakes &&
      dto.lights &&
      dto.oil &&
      dto.water &&
      dto.battery &&
      dto.air &&
      dto.gas &&
      dto.engine &&
      dto.tools &&
      dto.self;

    if (!allChecked) {
      throw new BadRequestException(
        'All vehicle safety inspection items must be checked before proceeding.',
      );
    }

    const checklist = await this.prisma.blowbagetsChecklist.create({
      data: {
        driverProfileId: profile.id,
        rideId: dto.rideId,
        brakes: dto.brakes,
        lights: dto.lights,
        oil: dto.oil,
        water: dto.water,
        battery: dto.battery,
        air: dto.air,
        gas: dto.gas,
        engine: dto.engine,
        tools: dto.tools,
        self: dto.self,
        allItemsChecked: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    await this.auditService.log(
      userId,
      'BLOWBAGETS_COMPLETED',
      'driver',
      profile.id,
      { rideId: dto.rideId, checklistId: checklist.id },
    );

    return checklist;
  }

  async getBlowbagetsForRide(userId: string, rideId: string) {
    const profile = await this.ensureProfile(userId);

    // Verify driver owns this ride
    const ride = await this.prisma.ride.findFirst({
      where: { id: rideId, driverProfileId: profile.id },
    });
    if (!ride) {
      throw new BadRequestException('Ride not found or not assigned to you.');
    }

    return this.prisma.blowbagetsChecklist.findFirst({
      where: {
        rideId,
        allItemsChecked: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  private async ensureProfile(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new BadRequestException('Driver profile not found');
    }

    return profile;
  }
}
