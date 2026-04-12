import { ConfigService } from '@nestjs/config';
import { VerificationService } from '../src/verification/verification.service';
import { StorageService } from '../src/storage/storage.service';

/**
 * Bug 7 regression guard — fail-closed on AI verification.
 *
 * The prior behaviour auto-approved documents when AI verification couldn't
 * complete (passThrough). These tests lock in the corrected behaviour:
 * any path that can't reach a definitive AI verdict must set
 * `requiresManualReview: true` with `isValid: false`, never auto-pass.
 */

const makeService = (
  anthropicMock: any,
  storageMock: Partial<StorageService> = {},
  configOverrides: Record<string, string> = {},
) => {
  const configValues: Record<string, string> = {
    ANTHROPIC_API_KEY: 'test-key',
    ...configOverrides,
  };
  const config = {
    get: jest.fn((key: string, defaultVal?: string) =>
      configValues[key] ?? defaultVal,
    ),
  } as unknown as ConfigService;
  const storage = {
    getObjectBytes: jest.fn().mockResolvedValue(Buffer.from('fake-image-bytes')),
    ...storageMock,
  } as unknown as StorageService;
  const service = new VerificationService(config, storage);
  (service as any).anthropic = anthropicMock;
  return { service, storage };
};

const breathalyzerAiResponse = (payload: {
  is_breathalyzer_device?: boolean;
  is_reading_visible?: boolean;
  bac_value?: number | null;
  bac_unit?: string | null;
  confidence?: number;
  reasoning?: string;
}) => {
  // Use object spread so explicit null in `payload` overrides defaults
  // (null ?? default would incorrectly fall back to the default).
  const defaults = {
    is_breathalyzer_device: true,
    is_reading_visible: true,
    bac_value: 0.0,
    bac_unit: 'g/L',
    confidence: 0.95,
    reasoning: 'Clear device reading',
  };
  return aiResponse({ ...defaults, ...payload });
};

const aiResponse = (payload: Record<string, unknown>) => ({
  content: [{ type: 'text', text: JSON.stringify(payload) }],
});

describe('VerificationService', () => {
  describe('verifyIdDocument() — fail-closed guarantees', () => {
    it('returns isValid=false + rejectionReason when AI says it is not a real document', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            aiResponse({
              is_real_document: false,
              is_authentic: false,
              name_match: null,
              confidence: 0.9,
              reasoning: 'Image is a selfie, not an ID',
            }),
          ),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyIdDocument({
        storageKey: 'drivers/p1/license.jpg',
        documentType: 'LICENSE',
        mimeType: 'image/jpeg',
      });

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toMatch(/driver's license/);
      expect(result.requiresManualReview).toBeUndefined();
    });

    it('defers to manual review when AI throws (NEVER auto-approves)', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockRejectedValue(new Error('AI service down')),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyIdDocument({
        storageKey: 'drivers/p1/license.jpg',
        documentType: 'LICENSE',
        mimeType: 'image/jpeg',
      });

      expect(result.requiresManualReview).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.isAuthentic).toBe(false);
    });

    it('defers to manual review when storage returns empty bytes', async () => {
      const anthropic = { messages: { create: jest.fn() } };
      const { service } = makeService(anthropic, {
        getObjectBytes: jest.fn().mockResolvedValue(Buffer.alloc(0)),
      } as any);

      const result = await service.verifyIdDocument({
        storageKey: 'drivers/p1/license.jpg',
        documentType: 'LICENSE',
        mimeType: 'image/jpeg',
      });

      expect(result.requiresManualReview).toBe(true);
      expect(anthropic.messages.create).not.toHaveBeenCalled();
    });

    it('defers to manual review when mime type is unsupported', async () => {
      const anthropic = { messages: { create: jest.fn() } };
      const { service } = makeService(anthropic);

      const result = await service.verifyIdDocument({
        storageKey: 'drivers/p1/license.pdf',
        documentType: 'LICENSE',
        mimeType: 'application/pdf',
      });

      expect(result.requiresManualReview).toBe(true);
      expect(anthropic.messages.create).not.toHaveBeenCalled();
    });

    it('defers to manual review when AI response contains no text block', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue({ content: [] }),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyIdDocument({
        storageKey: 'drivers/p1/id.jpg',
        documentType: 'GOVERNMENT_ID',
        mimeType: 'image/jpeg',
      });

      expect(result.requiresManualReview).toBe(true);
    });

    it('accepts document when AI confirms real + authentic with no registered name', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            aiResponse({
              is_real_document: true,
              is_authentic: true,
              name_match: null,
              confidence: 0.95,
              reasoning: 'Clear LTO license',
            }),
          ),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyIdDocument({
        storageKey: 'drivers/p1/license.jpg',
        documentType: 'LICENSE',
        mimeType: 'image/jpeg',
      });

      expect(result.isValid).toBe(true);
      expect(result.isAuthentic).toBe(true);
      expect(result.rejectionReason).toBeUndefined();
      expect(result.requiresManualReview).toBeUndefined();
    });

    it('rejects with name-mismatch reason when registered name is provided but mismatches', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            aiResponse({
              is_real_document: true,
              is_authentic: true,
              name_match: false,
              confidence: 0.9,
              reasoning: 'Name on license differs',
            }),
          ),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyIdDocument({
        storageKey: 'drivers/p1/id.jpg',
        documentType: 'GOVERNMENT_ID',
        mimeType: 'image/jpeg',
        driverFirstName: 'Juan',
        driverLastName: 'Cruz',
      });

      expect(result.nameMatch).toBe(false);
      expect(result.rejectionReason).toMatch(/does not match/i);
    });
  });

  describe('verifyBreathalyzerResult() — fail-closed guarantees', () => {
    it('returns INVALID_IMAGE when AI throws (never passes the safety check)', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockRejectedValue(new Error('AI unavailable')),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyBreathalyzerResult({
        storageKey: 'drivers/p1/breath.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.result).toBe('INVALID_IMAGE');
      expect(result.bacReading).toBeNull();
      expect(result.isBreathalyzerDevice).toBe(false);
    });

    it('returns INVALID_IMAGE when AI cannot identify the unit label', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            breathalyzerAiResponse({ bac_value: 0.02, bac_unit: null }),
          ),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyBreathalyzerResult({
        storageKey: 'drivers/p1/breath.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.result).toBe('INVALID_IMAGE');
      expect(result.bacValueRaw).toBe(0.02);
      expect(result.bacUnitRaw).toBeNull();
      expect(result.bacNormalizedGPerL).toBeNull();
    });

    it('returns INVALID_IMAGE when AI returns an unrecognised unit', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            breathalyzerAiResponse({ bac_value: 0.02, bac_unit: 'ppm' }),
          ),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyBreathalyzerResult({
        storageKey: 'drivers/p1/breath.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.result).toBe('INVALID_IMAGE');
      expect(result.bacUnitRaw).toBeNull();
    });

    it('returns INVALID_IMAGE when AI confidence is below min threshold', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            breathalyzerAiResponse({
              bac_value: 0.02,
              bac_unit: 'g/L',
              confidence: 0.4,
            }),
          ),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyBreathalyzerResult({
        storageKey: 'drivers/p1/breath.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.result).toBe('INVALID_IMAGE');
    });
  });

  describe('verifyBreathalyzerResult() — threshold enforcement (default 0.05 g/L)', () => {
    it('passes when reading is below threshold (0.04 g/L)', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            breathalyzerAiResponse({ bac_value: 0.04, bac_unit: 'g/L' }),
          ),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyBreathalyzerResult({
        storageKey: 'drivers/p1/breath.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.result).toBe('PASS');
      expect(result.bacNormalizedGPerL).toBeCloseTo(0.04);
      expect(result.thresholdGPerL).toBe(0.05);
    });

    it('FAILS at the exact boundary (0.05 g/L) — inclusive per client rule', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            breathalyzerAiResponse({ bac_value: 0.05, bac_unit: 'g/L' }),
          ),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyBreathalyzerResult({
        storageKey: 'drivers/p1/breath.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.result).toBe('FAIL');
    });

    it('FAILS above threshold (0.06 g/L)', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            breathalyzerAiResponse({ bac_value: 0.06, bac_unit: 'g/L' }),
          ),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyBreathalyzerResult({
        storageKey: 'drivers/p1/breath.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.result).toBe('FAIL');
      expect(result.bacNormalizedGPerL).toBeCloseTo(0.06);
    });
  });

  describe('verifyBreathalyzerResult() — unit normalization', () => {
    it('normalizes %BAC to g/L (0.005 %BAC → 0.05 g/L → FAIL at boundary)', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            breathalyzerAiResponse({ bac_value: 0.005, bac_unit: '%BAC' }),
          ),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyBreathalyzerResult({
        storageKey: 'drivers/p1/breath.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.bacValueRaw).toBe(0.005);
      expect(result.bacUnitRaw).toBe('%BAC');
      expect(result.bacNormalizedGPerL).toBeCloseTo(0.05);
      expect(result.result).toBe('FAIL');
    });

    it('normalizes mg/L breath to g/L blood (0.02 mg/L → 0.064 g/L → FAIL)', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            breathalyzerAiResponse({ bac_value: 0.02, bac_unit: 'mg/L' }),
          ),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyBreathalyzerResult({
        storageKey: 'drivers/p1/breath.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.bacUnitRaw).toBe('mg/L');
      expect(result.bacNormalizedGPerL).toBeCloseTo(0.064);
      expect(result.result).toBe('FAIL');
    });

    it('passes a safe %BAC reading (0.002 %BAC → 0.02 g/L → PASS)', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            breathalyzerAiResponse({ bac_value: 0.002, bac_unit: '%BAC' }),
          ),
        },
      };
      const { service } = makeService(anthropic);

      const result = await service.verifyBreathalyzerResult({
        storageKey: 'drivers/p1/breath.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.bacNormalizedGPerL).toBeCloseTo(0.02);
      expect(result.result).toBe('PASS');
    });
  });

  describe('verifyBreathalyzerResult() — configurable threshold', () => {
    it('tightens via BREATHALYZER_FAIL_THRESHOLD_G_PER_L=0.03 (0.04 g/L now FAILs)', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            breathalyzerAiResponse({ bac_value: 0.04, bac_unit: 'g/L' }),
          ),
        },
      };
      const { service } = makeService(anthropic, {}, {
        BREATHALYZER_FAIL_THRESHOLD_G_PER_L: '0.03',
      });

      const result = await service.verifyBreathalyzerResult({
        storageKey: 'drivers/p1/breath.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.result).toBe('FAIL');
      expect(result.thresholdGPerL).toBe(0.03);
    });

    it('snapshot of threshold-in-effect is returned for audit', async () => {
      const anthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(
            breathalyzerAiResponse({ bac_value: 0.02, bac_unit: 'g/L' }),
          ),
        },
      };
      const { service } = makeService(anthropic, {}, {
        BREATHALYZER_FAIL_THRESHOLD_G_PER_L: '0.08',
      });

      const result = await service.verifyBreathalyzerResult({
        storageKey: 'drivers/p1/breath.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.thresholdGPerL).toBe(0.08);
      expect(result.result).toBe('PASS');
    });
  });
});
