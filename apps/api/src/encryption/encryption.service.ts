import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>('ENCRYPTION_KEY');
    if (!keyHex || keyHex.length !== 64) {
      // In development/test, use a default key (NOT for production!)
      const defaultKey =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      this.key = Buffer.from(
        process.env.NODE_ENV === 'production' ? keyHex || defaultKey : defaultKey,
        'hex',
      );
      if (process.env.NODE_ENV === 'production' && (!keyHex || keyHex.length !== 64)) {
        throw new Error(
          'ENCRYPTION_KEY must be 64 hex characters (32 bytes) in production',
        );
      }
    } else {
      this.key = Buffer.from(keyHex, 'hex');
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM
   * @param plaintext - The text to encrypt
   * @returns Encrypted string in format: iv:authTag:ciphertext (all base64)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * Decrypts ciphertext that was encrypted with encrypt()
   * @param ciphertext - The encrypted string in format: iv:authTag:ciphertext
   * @returns Decrypted plaintext
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) return ciphertext;

    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      // Not encrypted, return as-is (for backwards compatibility)
      return ciphertext;
    }

    try {
      const [ivB64, authTagB64, encryptedB64] = parts;
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(authTagB64, 'base64');
      const encrypted = Buffer.from(encryptedB64, 'base64');

      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);

      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
        'utf8',
      );
    } catch {
      // If decryption fails, return original (for backwards compatibility)
      return ciphertext;
    }
  }

  /**
   * Creates a deterministic hash for searchable encrypted fields
   * Uses HMAC-SHA256 for consistent hashing
   * @param value - The value to hash
   * @returns Hex-encoded hash
   */
  hashForSearch(value: string): string {
    if (!value) return '';

    const hmac = createHmac('sha256', this.key);
    hmac.update(value.toLowerCase().trim());
    return hmac.digest('hex');
  }

  /**
   * Checks if a value appears to be encrypted
   * @param value - The value to check
   * @returns true if the value appears to be encrypted
   */
  isEncrypted(value: string): boolean {
    if (!value) return false;

    const parts = value.split(':');
    if (parts.length !== 3) return false;

    // Check if all parts are valid base64 and have expected lengths
    try {
      const [ivB64, authTagB64, ciphertextB64] = parts;

      // IV should decode to 12 bytes (16 base64 chars)
      const iv = Buffer.from(ivB64, 'base64');
      if (iv.length !== IV_LENGTH) return false;

      // Auth tag should decode to 16 bytes (24 base64 chars)
      const authTag = Buffer.from(authTagB64, 'base64');
      if (authTag.length !== 16) return false;

      // Ciphertext should be at least 1 byte
      const ciphertext = Buffer.from(ciphertextB64, 'base64');
      if (ciphertext.length < 1) return false;

      return true;
    } catch {
      return false;
    }
  }
}
