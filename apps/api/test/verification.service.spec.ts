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

const makeService = (anthropicMock: any, storageMock: Partial<StorageService> = {}) => {
  const config = {
    get: jest.fn((key: string) => (key === 'ANTHROPIC_API_KEY' ? 'test-key' : undefined)),
  } as unknown as ConfigService;
  const storage = {
    getObjectBytes: jest.fn().mockResolvedValue(Buffer.from('fake-image-bytes')),
    ...storageMock,
  } as unknown as StorageService;
  const service = new VerificationService(config, storage);
  (service as any).anthropic = anthropicMock;
  return { service, storage };
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
  });
});
