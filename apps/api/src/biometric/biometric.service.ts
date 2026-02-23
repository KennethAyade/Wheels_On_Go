import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CompareFacesCommand,
  RekognitionClient,
  RekognitionClientConfig,
} from '@aws-sdk/client-rekognition';
import { DriverProfile } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';

type VerifyResult = { match: boolean; confidence: number };

@Injectable()
export class BiometricService {
  private readonly logger = new Logger(BiometricService.name);
  private readonly client: RekognitionClient | null;
  private readonly mode: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {
    this.mode = this.configService.get<string>('BIOMETRIC_MODE', 'mock');

    if (this.mode !== 'mock') {
      const cfg: RekognitionClientConfig = {
        region: this.configService.get<string>('AWS_REGION'),
        credentials: {
          accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
          secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
        },
      };
      this.client = new RekognitionClient(cfg);
    } else {
      this.client = null;
    }
  }

  async verifyDriverFace(profile: DriverProfile, liveImageBase64: string): Promise<VerifyResult> {
    if (this.mode === 'mock') {
      await this.recordResult(profile.id, true, 100);
      return { match: true, confidence: 100 };
    }

    if (!this.client) {
      throw new InternalServerErrorException('Biometric provider not configured');
    }

    const storedBytes = await this.storageService.getObjectBytes(profile.profilePhotoKey!);
    const liveBytes = Buffer.from(liveImageBase64, 'base64');
    const minConfidence = Number(this.configService.get<number>('BIOMETRIC_MIN_CONFIDENCE', 90));

    const command = new CompareFacesCommand({
      SourceImage: { Bytes: liveBytes },
      TargetImage: { Bytes: storedBytes },
      SimilarityThreshold: minConfidence,
    });

    const response = await this.client.send(command);
    const bestMatch = response.FaceMatches?.[0];
    const confidence = bestMatch?.Similarity ?? 0;
    const match = !!bestMatch && confidence >= minConfidence;

    await this.recordResult(profile.id, match, confidence, match ? undefined : 'No facial match');

    if (!match) {
      this.logger.warn(`Biometric mismatch for driver ${profile.id}`);
    }

    return { match, confidence };
  }

  private async recordResult(
    driverProfileId: string,
    success: boolean,
    confidence: number,
    reason?: string,
  ) {
    await this.prisma.biometricVerification.create({
      data: {
        driverProfileId,
        success,
        confidence,
        reason,
      },
    });

    if (success) {
      await this.prisma.driverProfile.update({
        where: { id: driverProfileId },
        data: { biometricVerifiedAt: new Date() },
      });
    }
  }
}
