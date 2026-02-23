/**
 * Backfill Script: Encrypt Existing PII Data
 *
 * This script encrypts any existing unencrypted PII data in the database.
 * It processes User records that have plaintext phoneNumber or email fields
 * and encrypts them using the EncryptionService.
 *
 * Usage:
 *   npx tsx scripts/backfill-encrypt-pii.ts [--dry-run]
 *
 * Options:
 *   --dry-run  Simulate the encryption without writing to the database
 *
 * Safety:
 *   - Processes records in batches to avoid memory issues
 *   - Skips already encrypted fields
 *   - Creates audit log entries for each encryption operation
 *   - Supports dry-run mode for testing
 */

import { PrismaClient } from '@prisma/client';
import { createCipheriv, createHmac, randomBytes } from 'crypto';

// Encryption configuration (matches EncryptionService)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

// Batch processing configuration
const BATCH_SIZE = 100;

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Simple encryption function (matches EncryptionService.encrypt)
 */
function encrypt(plaintext: string, key: Buffer): string {
  if (!plaintext) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Create deterministic hash for searchable fields (matches EncryptionService.hashForSearch)
 */
function hashForSearch(value: string, key: Buffer): string {
  if (!value) return '';

  const hmac = createHmac('sha256', key);
  hmac.update(value.toLowerCase().trim());
  return hmac.digest('hex');
}

/**
 * Check if a value is already encrypted
 */
function isEncrypted(value: string): boolean {
  if (!value) return false;

  const parts = value.split(':');
  if (parts.length !== 3) return false;

  try {
    parts.forEach((part) => {
      Buffer.from(part, 'base64');
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Main backfill function
 */
async function backfillEncryptPii(dryRun: boolean = false) {
  console.log('🔐 PII Encryption Backfill Script');
  console.log('='.repeat(50));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  // Get encryption key from environment
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY environment variable must be 64 hex characters (32 bytes)',
    );
  }
  const key = Buffer.from(keyHex, 'hex');
  console.log('✓ Encryption key loaded');

  // Statistics
  let totalUsers = 0;
  let encryptedPhones = 0;
  let encryptedEmails = 0;
  let skippedPhones = 0;
  let skippedEmails = 0;
  let errors = 0;

  try {
    // Get total count of users
    const userCount = await prisma.user.count();
    console.log(`\nFound ${userCount} users to process`);
    console.log('');

    // Process users in batches
    let skip = 0;
    while (skip < userCount) {
      console.log(
        `Processing batch ${Math.floor(skip / BATCH_SIZE) + 1}/${Math.ceil(userCount / BATCH_SIZE)}...`,
      );

      // Fetch batch of users
      // Note: We need to use $queryRaw to bypass Prisma middleware
      const users = await prisma.$queryRaw<
        Array<{
          id: string;
          phoneNumber: string | null;
          email: string | null;
          phoneNumberHash: string | null;
          emailHash: string | null;
        }>
      >`
        SELECT id, "phoneNumber", email, "phoneNumberHash", "emailHash"
        FROM "User"
        LIMIT ${BATCH_SIZE} OFFSET ${skip}
      `;

      for (const user of users) {
        totalUsers++;

        try {
          const updates: any = {};
          let needsUpdate = false;

          // Process phoneNumber
          if (user.phoneNumber) {
            if (isEncrypted(user.phoneNumber)) {
              skippedPhones++;
              console.log(`  [${user.id}] Phone already encrypted, skipping`);
            } else {
              updates.phoneNumber = encrypt(user.phoneNumber, key);
              updates.phoneNumberHash = hashForSearch(user.phoneNumber, key);
              encryptedPhones++;
              needsUpdate = true;
              console.log(
                `  [${user.id}] Encrypting phone: ${user.phoneNumber.slice(0, 4)}****`,
              );
            }
          }

          // Process email
          if (user.email) {
            if (isEncrypted(user.email)) {
              skippedEmails++;
              console.log(`  [${user.id}] Email already encrypted, skipping`);
            } else {
              const emailParts = user.email.split('@');
              const maskedEmail = `${emailParts[0].slice(0, 2)}****@${emailParts[1]}`;

              updates.email = encrypt(user.email, key);
              updates.emailHash = hashForSearch(user.email, key);
              encryptedEmails++;
              needsUpdate = true;
              console.log(`  [${user.id}] Encrypting email: ${maskedEmail}`);
            }
          }

          // Update database (unless dry run)
          if (needsUpdate && !dryRun) {
            // Use $executeRaw to bypass Prisma middleware
            await prisma.$executeRaw`
              UPDATE "User"
              SET
                "phoneNumber" = COALESCE(${updates.phoneNumber}, "phoneNumber"),
                "phoneNumberHash" = COALESCE(${updates.phoneNumberHash}, "phoneNumberHash"),
                "email" = COALESCE(${updates.email}, "email"),
                "emailHash" = COALESCE(${updates.emailHash}, "emailHash")
              WHERE id = ${user.id}
            `;

            // Create audit log entry
            await prisma.auditLog.create({
              data: {
                actorUserId: null,
                action: 'PII_ENCRYPTED_BACKFILL',
                targetType: 'User',
                targetId: user.id,
                metadata: {
                  encryptedPhone: !!updates.phoneNumber,
                  encryptedEmail: !!updates.email,
                  timestamp: new Date().toISOString(),
                },
              },
            });
          }
        } catch (error) {
          errors++;
          console.error(
            `  [${user.id}] Error encrypting:`,
            error instanceof Error ? error.message : error,
          );
        }
      }

      skip += BATCH_SIZE;
    }

    // Print summary
    console.log('');
    console.log('='.repeat(50));
    console.log('Summary:');
    console.log(`  Total users processed: ${totalUsers}`);
    console.log(`  Phone numbers encrypted: ${encryptedPhones}`);
    console.log(`  Phone numbers skipped (already encrypted): ${skippedPhones}`);
    console.log(`  Emails encrypted: ${encryptedEmails}`);
    console.log(`  Emails skipped (already encrypted): ${skippedEmails}`);
    console.log(`  Errors: ${errors}`);
    console.log('');

    if (dryRun) {
      console.log('⚠️  DRY RUN MODE: No changes were written to the database');
    } else {
      console.log('✅ Backfill completed successfully!');
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run the backfill
backfillEncryptPii(dryRun).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
