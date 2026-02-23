import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from '../encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const testKey =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 hex chars

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY') return testKey;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt', () => {
    it('should encrypt plaintext to base64 format with three parts', () => {
      const plaintext = 'test@example.com';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3); // iv:authTag:ciphertext
    });

    it('should produce different ciphertexts for the same plaintext (due to random IV)', () => {
      const plaintext = 'sensitive-data';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
    });

    it('should return the input if plaintext is empty', () => {
      expect(service.encrypt('')).toBe('');
    });
  });

  describe('decrypt', () => {
    it('should decrypt ciphertext back to original plaintext', () => {
      const plaintext = 'my-secret-data';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle email encryption and decryption', () => {
      const email = 'user@wheelongo.com';
      const encrypted = service.encrypt(email);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(email);
    });

    it('should handle phone number encryption and decryption', () => {
      const phone = '+639171234567';
      const encrypted = service.encrypt(phone);
      const decrypted = service.decrypt(phone);

      expect(decrypted).toBe(phone);
    });

    it('should return the input if ciphertext is empty', () => {
      expect(service.decrypt('')).toBe('');
    });

    it('should return the input if ciphertext format is invalid (backwards compatibility)', () => {
      const invalidCiphertext = 'not-encrypted-data';
      expect(service.decrypt(invalidCiphertext)).toBe(invalidCiphertext);
    });

    it('should handle decryption errors gracefully and return original', () => {
      const invalidCiphertext = 'part1:part2:part3'; // Valid format but invalid data
      const result = service.decrypt(invalidCiphertext);

      // Should return original due to backwards compatibility
      expect(result).toBe(invalidCiphertext);
    });
  });

  describe('hashForSearch', () => {
    it('should create a deterministic hash for searchable fields', () => {
      const value = 'test@example.com';
      const hash1 = service.hashForSearch(value);
      const hash2 = service.hashForSearch(value);

      expect(hash1).toBe(hash2); // Deterministic
      expect(hash1).toMatch(/^[0-9a-f]{64}$/); // SHA256 hex (64 chars)
    });

    it('should normalize values (lowercase and trim) before hashing', () => {
      const hash1 = service.hashForSearch('  TEST@EXAMPLE.COM  ');
      const hash2 = service.hashForSearch('test@example.com');

      expect(hash1).toBe(hash2); // Should be the same after normalization
    });

    it('should produce different hashes for different values', () => {
      const hash1 = service.hashForSearch('user1@example.com');
      const hash2 = service.hashForSearch('user2@example.com');

      expect(hash1).not.toBe(hash2);
    });

    it('should return empty string for empty input', () => {
      expect(service.hashForSearch('')).toBe('');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted values', () => {
      const plaintext = 'test-data';
      const encrypted = service.encrypt(plaintext);

      expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for non-encrypted values', () => {
      expect(service.isEncrypted('plaintext')).toBe(false);
      expect(service.isEncrypted('part1:part2')).toBe(false); // Not 3 parts
    });

    it('should return false for empty string', () => {
      expect(service.isEncrypted('')).toBe(false);
    });

    it('should return false for invalid base64 format', () => {
      // Use strings that are definitely not valid base64
      expect(service.isEncrypted('!!!:###:@@@')).toBe(false);
    });
  });

  describe('end-to-end encryption workflow', () => {
    it('should encrypt, detect encryption, and decrypt correctly', () => {
      const originalData = '+639171234567';

      // Encrypt
      const encrypted = service.encrypt(originalData);
      expect(encrypted).not.toBe(originalData);

      // Check if encrypted
      expect(service.isEncrypted(encrypted)).toBe(true);
      expect(service.isEncrypted(originalData)).toBe(false);

      // Decrypt
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(originalData);

      // Create searchable hash
      const hash = service.hashForSearch(originalData);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should handle multiple PII fields', () => {
      const testData = {
        phoneNumber: '+639171234567',
        email: 'user@wheelongo.com',
        accountNumber: '1234567890',
        cardToken: 'tok_1234567890abcdef',
      };

      const encrypted = {
        phoneNumber: service.encrypt(testData.phoneNumber),
        email: service.encrypt(testData.email),
        accountNumber: service.encrypt(testData.accountNumber),
        cardToken: service.encrypt(testData.cardToken),
      };

      // All encrypted values should be different and in correct format
      Object.values(encrypted).forEach((value) => {
        expect(service.isEncrypted(value)).toBe(true);
        expect(value.split(':')).toHaveLength(3);
      });

      // All should decrypt correctly
      expect(service.decrypt(encrypted.phoneNumber)).toBe(testData.phoneNumber);
      expect(service.decrypt(encrypted.email)).toBe(testData.email);
      expect(service.decrypt(encrypted.accountNumber)).toBe(
        testData.accountNumber,
      );
      expect(service.decrypt(encrypted.cardToken)).toBe(testData.cardToken);
    });
  });

  describe('error handling', () => {
    it('should throw error in production if ENCRYPTION_KEY is missing', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const createServiceWithoutKey = async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            EncryptionService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn(() => null),
              },
            },
          ],
        }).compile();

        return module.get<EncryptionService>(EncryptionService);
      };

      await expect(createServiceWithoutKey()).rejects.toThrow(
        'ENCRYPTION_KEY must be 64 hex characters (32 bytes) in production',
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should throw error if ENCRYPTION_KEY has invalid length in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const createServiceWithInvalidKey = async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            EncryptionService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn(() => 'short-key'), // Invalid length
              },
            },
          ],
        }).compile();

        return module.get<EncryptionService>(EncryptionService);
      };

      await expect(createServiceWithInvalidKey()).rejects.toThrow(
        'ENCRYPTION_KEY must be 64 hex characters (32 bytes) in production',
      );

      process.env.NODE_ENV = originalEnv;
    });
  });
});
