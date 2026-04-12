import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { StorageService } from '../storage/storage.service';

export interface VerificationResult {
  isValid: boolean;
  isAuthentic: boolean;
  nameMatch: boolean | null;
  rejectionReason?: string;
  confidence: number;
  details: string;
  /**
   * True when AI verification could not be completed (service unavailable,
   * unparseable response, etc.). Callers must NOT auto-approve or auto-reject
   * — the document should be left in UPLOADED status for admin review.
   */
  requiresManualReview?: boolean;
}

export type BreathalyzerUnit = 'g/L' | 'mg/L' | '%BAC';

export interface BreathalyzerVerificationResult {
  isBreathalyzerDevice: boolean;
  isReadingVisible: boolean;
  /**
   * Normalized value in g/L blood. Kept for backward compatibility with older
   * callers. New callers should prefer `bacNormalizedGPerL`.
   */
  bacReading: number | null;
  bacValueRaw: number | null;
  bacUnitRaw: BreathalyzerUnit | null;
  bacNormalizedGPerL: number | null;
  thresholdGPerL: number;
  result: 'PASS' | 'FAIL' | 'INVALID_IMAGE';
  confidence: number;
  details: string;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly anthropic: Anthropic;
  private readonly breathalyzerFailThresholdGPerL: number;
  private readonly breathalyzerMinAiConfidence: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.anthropic = new Anthropic({ apiKey });

    const rawThreshold = this.configService.get<string>(
      'BREATHALYZER_FAIL_THRESHOLD_G_PER_L',
      '0.05',
    );
    const parsedThreshold = parseFloat(rawThreshold);
    this.breathalyzerFailThresholdGPerL = Number.isFinite(parsedThreshold)
      ? parsedThreshold
      : 0.05;

    const rawMinConfidence = this.configService.get<string>(
      'BREATHALYZER_MIN_AI_CONFIDENCE',
      '0.7',
    );
    const parsedMinConfidence = parseFloat(rawMinConfidence);
    this.breathalyzerMinAiConfidence = Number.isFinite(parsedMinConfidence)
      ? parsedMinConfidence
      : 0.7;
  }

  /**
   * Convert a raw device reading into the canonical unit (g/L blood).
   *
   * Conversion factors derived from the device manual's equivalence table
   * (0.080%BAC == 0.80 g/L blood == 0.25 mg/L breath):
   *   - g/L blood → identity
   *   - %BAC      → value * 10
   *   - mg/L breath → value * 3.2
   *
   * Returns null when the unit is unknown / unrecognised. Callers must treat
   * null as INVALID_IMAGE (fail-closed) — never guess the unit.
   */
  private normalizeToGPerL(
    value: number,
    unit: BreathalyzerUnit | null,
  ): number | null {
    switch (unit) {
      case 'g/L':
        return value;
      case '%BAC':
        return value * 10;
      case 'mg/L':
        return value * 3.2;
      default:
        return null;
    }
  }

  private parseUnit(raw: unknown): BreathalyzerUnit | null {
    if (typeof raw !== 'string') return null;
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, '');
    if (normalized === 'g/l' || normalized === 'gperl') return 'g/L';
    if (normalized === 'mg/l' || normalized === 'mgperl') return 'mg/L';
    if (
      normalized === '%bac' ||
      normalized === 'bac%' ||
      normalized === 'percent' ||
      normalized === 'pct' ||
      normalized === 'pctbac'
    ) {
      return '%BAC';
    }
    return null;
  }

  async verifyIdDocument(params: {
    storageKey: string;
    documentType: 'LICENSE' | 'GOVERNMENT_ID';
    mimeType: string;
    driverFirstName?: string;
    driverLastName?: string;
  }): Promise<VerificationResult> {
    try {
      const imageBytes = await this.storageService.getObjectBytes(
        params.storageKey,
      );

      if (!imageBytes || imageBytes.length === 0) {
        this.logger.warn(
          `Empty image bytes for key: ${params.storageKey}, passing through`,
        );
        return this.deferToManualReview('Could not download image for verification');
      }

      const base64Image = Buffer.from(imageBytes).toString('base64');

      const mediaType = this.mapMimeType(params.mimeType);
      if (!mediaType) {
        this.logger.warn(
          `Unsupported mime type: ${params.mimeType}, passing through`,
        );
        return this.deferToManualReview(`Unsupported image type: ${params.mimeType}`);
      }

      const docLabel =
        params.documentType === 'LICENSE'
          ? "driver's license"
          : 'government-issued ID';

      const nameInstruction =
        params.driverFirstName || params.driverLastName
          ? `\nThe driver's registered name is: ${params.driverFirstName ?? ''} ${params.driverLastName ?? ''}. Check if the name on the document matches or is reasonably similar (accounting for middle names, suffixes, or minor spelling variations).`
          : '\nNo registered name is available yet — skip name matching and set name_match to null.';

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `You are verifying an uploaded ${docLabel} document for a ride-sharing driver registration. Analyze this image carefully and respond ONLY with valid JSON (no markdown, no code fences) with these fields:

- "is_real_document" (boolean): Is this image actually a ${docLabel}? It should NOT be a selfie, random photo, screenshot of text, meme, or any non-ID image.
- "is_authentic" (boolean): Does this appear to be a genuine, unedited document? Check for obvious signs of forgery like mismatched fonts, poor image quality suggesting digital manipulation, clearly fake information, or placeholder/sample text.
- "detected_name" (string or null): The full name visible on the document, if readable.
- "name_match" (boolean or null): Whether the detected name matches the registered name. null if no registered name is provided or name is unreadable.
- "confidence" (number 0-1): Your overall confidence in this assessment.
- "reasoning" (string): Brief explanation of your assessment (1-2 sentences).
${nameInstruction}

Respond with JSON only.`,
              },
            ],
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        this.logger.warn('No text response from Claude, passing through');
        return this.deferToManualReview('AI returned no text response');
      }

      const parsed = JSON.parse(textContent.text);

      const isValid = parsed.is_real_document === true;
      const isAuthentic = parsed.is_authentic === true;
      const nameMatch =
        parsed.name_match === null ? null : parsed.name_match === true;
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;

      let rejectionReason: string | undefined;

      if (!isValid) {
        rejectionReason = `This does not appear to be a valid ${docLabel}. Please upload a clear photo of your actual ${docLabel}.`;
      } else if (!isAuthentic) {
        rejectionReason = `This document appears to be invalid or tampered with. Please upload a genuine ${docLabel}.`;
      } else if (nameMatch === false) {
        rejectionReason = `The name on the document does not match your registered name. Please upload a ${docLabel} that matches your registration details.`;
      }

      return {
        isValid,
        isAuthentic,
        nameMatch,
        rejectionReason,
        confidence,
        details: parsed.reasoning || '',
      };
    } catch (error) {
      this.logger.error(
        `AI verification failed; deferring to manual review: ${error.message}`,
        error.stack,
      );
      return this.deferToManualReview('AI verification temporarily unavailable');
    }
  }

  async verifyBreathalyzerResult(params: {
    storageKey: string;
    mimeType: string;
  }): Promise<BreathalyzerVerificationResult> {
    try {
      const imageBytes = await this.storageService.getObjectBytes(
        params.storageKey,
      );

      if (!imageBytes || imageBytes.length === 0) {
        this.logger.warn(
          `Empty image bytes for breathalyzer key: ${params.storageKey}`,
        );
        return this.failClosed('Could not download image for verification');
      }

      const base64Image = Buffer.from(imageBytes).toString('base64');

      const mediaType = this.mapMimeType(params.mimeType);
      if (!mediaType) {
        this.logger.warn(
          `Unsupported mime type for breathalyzer: ${params.mimeType}`,
        );
        return this.failClosed(`Unsupported image type: ${params.mimeType}`);
      }

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `You are analyzing a photo of a breathalyzer test result for a ride-sharing driver safety check. Analyze this image carefully and respond ONLY with valid JSON (no markdown, no code fences) with these fields:

- "is_breathalyzer_device" (boolean): Is this image showing an actual breathalyzer device or breathalyzer test result screen? It should NOT be a random photo, selfie, screenshot, or unrelated image.
- "is_reading_visible" (boolean): Can you clearly see and read the alcohol measurement value on the device display.
- "bac_value" (number or null): The exact numeric value shown on the device display (e.g., 0.00, 0.02, 0.40, 0.80). null if not readable. Do NOT convert units — return the number exactly as shown.
- "bac_unit" (string or null): The unit label printed on or around the device display. MUST be one of exactly: "g/L" (grams per liter of blood), "mg/L" (milligrams per liter of breath), "%BAC" (percent blood alcohol). Return null if the unit label is not visible or unclear. Do NOT guess — if uncertain, return null and explain in reasoning.
- "confidence" (number 0-1): Your confidence in the reading AND unit identification. Low confidence (<0.7) if either value or unit is unclear.
- "reasoning" (string): Brief explanation (1-2 sentences). If you can see the value but not the unit label, say so explicitly.

Respond with JSON only.`,
              },
            ],
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        this.logger.warn('No text response from Claude for breathalyzer');
        return this.failClosed('AI returned no text response');
      }

      const parsed = JSON.parse(textContent.text);

      const isBreathalyzerDevice = parsed.is_breathalyzer_device === true;
      const isReadingVisible = parsed.is_reading_visible === true;
      const bacValueRaw =
        typeof parsed.bac_value === 'number' ? parsed.bac_value : null;
      const bacUnitRaw = this.parseUnit(parsed.bac_unit);
      const confidence =
        typeof parsed.confidence === 'number' ? parsed.confidence : 0;

      if (
        !isBreathalyzerDevice ||
        !isReadingVisible ||
        bacValueRaw === null ||
        bacUnitRaw === null ||
        confidence < this.breathalyzerMinAiConfidence
      ) {
        const reason =
          !isBreathalyzerDevice
            ? 'Image is not a breathalyzer device'
            : !isReadingVisible
              ? 'Reading is not clearly visible'
              : bacValueRaw === null
                ? 'Reading value could not be read'
                : bacUnitRaw === null
                  ? 'Unit label (g/L, mg/L, or %BAC) could not be identified — please retake with unit label visible'
                  : 'AI confidence too low to rely on reading';
        return {
          isBreathalyzerDevice,
          isReadingVisible,
          bacReading: null,
          bacValueRaw,
          bacUnitRaw,
          bacNormalizedGPerL: null,
          thresholdGPerL: this.breathalyzerFailThresholdGPerL,
          result: 'INVALID_IMAGE',
          confidence,
          details: parsed.reasoning || reason,
        };
      }

      const bacNormalizedGPerL = this.normalizeToGPerL(bacValueRaw, bacUnitRaw);
      if (bacNormalizedGPerL === null) {
        return {
          isBreathalyzerDevice,
          isReadingVisible,
          bacReading: null,
          bacValueRaw,
          bacUnitRaw: null,
          bacNormalizedGPerL: null,
          thresholdGPerL: this.breathalyzerFailThresholdGPerL,
          result: 'INVALID_IMAGE',
          confidence,
          details: parsed.reasoning || 'Unrecognised unit — please retake the photo',
        };
      }

      const result: 'PASS' | 'FAIL' =
        bacNormalizedGPerL >= this.breathalyzerFailThresholdGPerL ? 'FAIL' : 'PASS';

      return {
        isBreathalyzerDevice: true,
        isReadingVisible: true,
        bacReading: bacNormalizedGPerL,
        bacValueRaw,
        bacUnitRaw,
        bacNormalizedGPerL,
        thresholdGPerL: this.breathalyzerFailThresholdGPerL,
        result,
        confidence,
        details: parsed.reasoning || '',
      };
    } catch (error) {
      this.logger.error(
        `Breathalyzer AI verification failed (fail-closed): ${error.message}`,
        error.stack,
      );
      return this.failClosed('Image verification unavailable. Please try again.');
    }
  }

  private failClosed(details: string): BreathalyzerVerificationResult {
    return {
      isBreathalyzerDevice: false,
      isReadingVisible: false,
      bacReading: null,
      bacValueRaw: null,
      bacUnitRaw: null,
      bacNormalizedGPerL: null,
      thresholdGPerL: this.breathalyzerFailThresholdGPerL,
      result: 'INVALID_IMAGE',
      confidence: 0,
      details,
    };
  }

  /**
   * Returned when AI verification cannot be completed (service down, bad image
   * download, unparseable response). Callers MUST interpret this as "leave the
   * document in UPLOADED state for admin review" — never auto-approve.
   */
  private deferToManualReview(details: string): VerificationResult {
    return {
      isValid: false,
      isAuthentic: false,
      nameMatch: null,
      confidence: 0,
      details,
      requiresManualReview: true,
    };
  }

  private mapMimeType(
    mimeType: string,
  ): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | null {
    const normalized = mimeType.toLowerCase();
    if (normalized === 'image/jpeg' || normalized === 'image/jpg')
      return 'image/jpeg';
    if (normalized === 'image/png') return 'image/png';
    if (normalized === 'image/gif') return 'image/gif';
    if (normalized === 'image/webp') return 'image/webp';
    return null;
  }
}
