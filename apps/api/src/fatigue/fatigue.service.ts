import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FatigueLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export interface FatigueCheckResult {
  isFatigued: boolean;
  fatigueLevel: FatigueLevel;
  confidence: number;
  reasons: string[];
  cooldownMinutes: number;
  leftEyeProbability: number;
  rightEyeProbability: number;
  avgEyeProbability: number;
}

export interface CanGoOnlineResult {
  allowed: boolean;
  reason?: string;
  cooldownUntil?: Date;
  lastCheckAt?: Date;
}

@Injectable()
export class FatigueService {
  private readonly logger = new Logger(FatigueService.name);
  private readonly mode: string;
  private model: any = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {
    this.mode = this.configService.get<string>('FATIGUE_MODE', 'mock');
    this.initGemini();
  }

  private async initGemini() {
    if (this.mode === 'mock') return;

    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY not set, fatigue detection will use mock mode',
      );
      return;
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      this.logger.log('Gemini Vision model initialized for fatigue detection');
    } catch (e) {
      this.logger.error('Failed to initialize Gemini:', e);
    }
  }

  async checkFatigue(
    driverProfileId: string,
    imageBase64: string,
    isOnRide = false,
    currentRideId?: string,
  ): Promise<FatigueCheckResult> {
    if (this.mode === 'mock' || !this.model) {
      const mockResult: FatigueCheckResult = {
        isFatigued: false,
        fatigueLevel: FatigueLevel.NORMAL,
        confidence: 0.95,
        reasons: [],
        cooldownMinutes: 0,
        leftEyeProbability: 0.95,
        rightEyeProbability: 0.95,
        avgEyeProbability: 0.95,
      };
      await this.recordResult(
        driverProfileId,
        mockResult,
        isOnRide,
        currentRideId,
      );
      await this.updateDriverProfile(driverProfileId, mockResult);
      return mockResult;
    }

    const result = await this.analyzeWithGemini(imageBase64);
    await this.recordResult(
      driverProfileId,
      result,
      isOnRide,
      currentRideId,
    );
    await this.updateDriverProfile(driverProfileId, result);
    return result;
  }

  async canGoOnline(driverProfileId: string): Promise<CanGoOnlineResult> {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
      select: {
        faceEnrolledAt: true,
        lastFatigueCheckAt: true,
        lastFatigueLevel: true,
        fatigueCooldownUntil: true,
      },
    });

    if (!profile) {
      return { allowed: false, reason: 'Driver profile not found' };
    }

    if (!profile.faceEnrolledAt) {
      return { allowed: false, reason: 'Face enrollment required' };
    }

    if (
      profile.fatigueCooldownUntil &&
      profile.fatigueCooldownUntil > new Date()
    ) {
      return {
        allowed: false,
        reason: 'Fatigue cooldown active',
        cooldownUntil: profile.fatigueCooldownUntil,
      };
    }

    const checkIntervalMs = 2 * 60 * 60 * 1000; // 2 hours
    if (
      !profile.lastFatigueCheckAt ||
      Date.now() - profile.lastFatigueCheckAt.getTime() > checkIntervalMs
    ) {
      return {
        allowed: false,
        reason: 'Fatigue check required',
        lastCheckAt: profile.lastFatigueCheckAt ?? undefined,
      };
    }

    return { allowed: true };
  }

  async enrollFace(
    driverProfileId: string,
    imageBase64: string,
  ): Promise<{ success: boolean; enrolledAt: string }> {
    const buffer = Buffer.from(imageBase64, 'base64');
    const key = `drivers/${driverProfileId}/enrolled-face/${Date.now()}.jpg`;
    await this.storageService.putBuffer(key, buffer, 'image/jpeg');

    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
      select: { profilePhotoKey: true },
    });

    await this.prisma.driverProfile.update({
      where: { id: driverProfileId },
      data: {
        enrolledFaceKey: key,
        faceEnrolledAt: new Date(),
        ...(profile && !profile.profilePhotoKey
          ? {
              profilePhotoKey: key,
              profilePhotoUploadedAt: new Date(),
            }
          : {}),
      },
    });

    return { success: true, enrolledAt: new Date().toISOString() };
  }

  private async analyzeWithGemini(
    imageBase64: string,
  ): Promise<FatigueCheckResult> {
    const prompt = `You are a driver fatigue detection AI for a ride-hailing safety system. Analyze this face image for signs of drowsiness and fatigue.

Evaluate these indicators:
1. Eye openness (0.0 = fully closed, 1.0 = fully open) for left and right eyes
2. Yawning (mouth wide open)
3. Head tilt or drooping
4. Blank/unfocused stare
5. Heavy eyelids (partially closed eyes)

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "leftEyeProbability": <float 0-1>,
  "rightEyeProbability": <float 0-1>,
  "isFatigued": <boolean>,
  "fatigueLevel": "<NORMAL|MILD|MODERATE|SEVERE>",
  "confidence": <float 0-1>,
  "reasons": ["<reason1>", "<reason2>"]
}

Classification rules:
- NORMAL: Both eyes > 0.7, no yawning, alert appearance. confidence > 0.8
- MILD: One or both eyes 0.5-0.7, slight drowsiness signs. cooldown: 30 min
- MODERATE: One or both eyes 0.3-0.5, yawning or head drooping. cooldown: 60 min
- SEVERE: One or both eyes < 0.3, multiple fatigue indicators. cooldown: 120 min

If the image is unclear, too dark, or doesn't show a face, return fatigueLevel "NORMAL" with confidence 0.0 and reasons ["Unable to detect face clearly"].`;

    try {
      const result = await this.model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64,
          },
        },
      ]);

      const responseText = result.response.text();
      const cleaned = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      const fatigueLevel = this.parseFatigueLevel(parsed.fatigueLevel);
      const isFatigued = fatigueLevel !== FatigueLevel.NORMAL;

      return {
        isFatigued,
        fatigueLevel,
        confidence: parsed.confidence ?? 0.5,
        reasons: parsed.reasons ?? [],
        cooldownMinutes: this.getCooldownMinutes(fatigueLevel),
        leftEyeProbability: parsed.leftEyeProbability ?? 0.5,
        rightEyeProbability: parsed.rightEyeProbability ?? 0.5,
        avgEyeProbability:
          ((parsed.leftEyeProbability ?? 0.5) +
            (parsed.rightEyeProbability ?? 0.5)) /
          2,
      };
    } catch (e) {
      this.logger.error('Failed to analyze image with Gemini:', e);
      // Fail-open: allow driver to proceed if AI fails
      return {
        isFatigued: false,
        fatigueLevel: FatigueLevel.NORMAL,
        confidence: 0,
        reasons: ['AI analysis failed - defaulting to NORMAL'],
        cooldownMinutes: 0,
        leftEyeProbability: 0.5,
        rightEyeProbability: 0.5,
        avgEyeProbability: 0.5,
      };
    }
  }

  private parseFatigueLevel(level: string): FatigueLevel {
    switch (level?.toUpperCase()) {
      case 'MILD':
        return FatigueLevel.MILD;
      case 'MODERATE':
        return FatigueLevel.MODERATE;
      case 'SEVERE':
        return FatigueLevel.SEVERE;
      default:
        return FatigueLevel.NORMAL;
    }
  }

  private getCooldownMinutes(level: FatigueLevel): number {
    switch (level) {
      case FatigueLevel.MILD:
        return 30;
      case FatigueLevel.MODERATE:
        return 60;
      case FatigueLevel.SEVERE:
        return 120;
      default:
        return 0;
    }
  }

  private async updateDriverProfile(
    driverProfileId: string,
    result: FatigueCheckResult,
  ) {
    const updateData: any = {
      lastFatigueCheckAt: new Date(),
      lastFatigueLevel: result.fatigueLevel,
    };

    if (result.isFatigued && result.cooldownMinutes > 0) {
      updateData.fatigueCooldownUntil = new Date(
        Date.now() + result.cooldownMinutes * 60 * 1000,
      );
    } else {
      updateData.fatigueCooldownUntil = null;
    }

    await this.prisma.driverProfile.update({
      where: { id: driverProfileId },
      data: updateData,
    });
  }

  private async recordResult(
    driverProfileId: string,
    result: FatigueCheckResult,
    isOnRide: boolean,
    currentRideId?: string,
    geminiRaw?: string,
  ) {
    await this.prisma.fatigueDetectionLog.create({
      data: {
        driverProfileId,
        leftEyeProbability: result.leftEyeProbability,
        rightEyeProbability: result.rightEyeProbability,
        avgEyeProbability: result.avgEyeProbability,
        isFatigued: result.isFatigued,
        fatigueLevel: result.fatigueLevel,
        isOnRide,
        currentRideId,
        confidence: result.confidence,
        reasons: result.reasons,
        cooldownMinutes: result.cooldownMinutes,
        geminiRawResponse: geminiRaw,
      },
    });
  }
}
