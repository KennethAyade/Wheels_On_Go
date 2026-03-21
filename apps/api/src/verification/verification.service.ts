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
}

export interface BreathalyzerVerificationResult {
  isBreathalyzerDevice: boolean;
  isReadingVisible: boolean;
  bacReading: number | null;
  result: 'PASS' | 'FAIL' | 'INVALID_IMAGE';
  confidence: number;
  details: string;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.anthropic = new Anthropic({ apiKey });
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
        return this.passThrough('Could not download image for verification');
      }

      const base64Image = Buffer.from(imageBytes).toString('base64');

      const mediaType = this.mapMimeType(params.mimeType);
      if (!mediaType) {
        this.logger.warn(
          `Unsupported mime type: ${params.mimeType}, passing through`,
        );
        return this.passThrough(`Unsupported image type: ${params.mimeType}`);
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
        return this.passThrough('AI returned no text response');
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
        `AI verification failed, passing through: ${error.message}`,
        error.stack,
      );
      return this.passThrough('AI verification temporarily unavailable');
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
- "is_reading_visible" (boolean): Can you clearly see and read the BAC (Blood Alcohol Content) reading on the device?
- "bac_reading" (number or null): The BAC reading shown on the device (e.g., 0.00, 0.02, 0.08). null if not readable.
- "confidence" (number 0-1): Your confidence in the reading accuracy.
- "reasoning" (string): Brief explanation of your assessment (1-2 sentences).

Important: BAC readings are typically decimal values like 0.00, 0.02, 0.05, 0.08. A reading of 0.05 or below is considered safe for driving. Above 0.05 is unsafe.

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
      const bacReading =
        typeof parsed.bac_reading === 'number' ? parsed.bac_reading : null;
      const confidence =
        typeof parsed.confidence === 'number' ? parsed.confidence : 0;

      if (!isBreathalyzerDevice || !isReadingVisible || bacReading === null) {
        return {
          isBreathalyzerDevice,
          isReadingVisible,
          bacReading: null,
          result: 'INVALID_IMAGE',
          confidence,
          details: parsed.reasoning || 'Could not identify a valid breathalyzer reading',
        };
      }

      const result = bacReading <= 0.05 ? 'PASS' : 'FAIL';

      return {
        isBreathalyzerDevice: true,
        isReadingVisible: true,
        bacReading,
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
      result: 'INVALID_IMAGE',
      confidence: 0,
      details,
    };
  }

  private passThrough(details: string): VerificationResult {
    return {
      isValid: true,
      isAuthentic: true,
      nameMatch: null,
      confidence: 0,
      details,
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
