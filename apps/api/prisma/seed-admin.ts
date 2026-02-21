import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';

const prisma = new PrismaClient();

// Replicates EncryptionService.hashForSearch() — must use same key + logic
function hashForSearch(value: string): string {
  if (!value) return '';
  const keyHex = process.env.ENCRYPTION_KEY;
  const DEFAULT_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const resolvedKey = keyHex && keyHex.length === 64 ? keyHex : DEFAULT_KEY;
  return createHmac('sha256', Buffer.from(resolvedKey, 'hex'))
    .update(value.toLowerCase().trim())
    .digest('hex');
}

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@wheelsongo.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const phoneNumber = process.env.ADMIN_PHONE || '+630000000000';

  const passwordHash = await bcrypt.hash(password, 12);
  const emailHash = hashForSearch(email);
  const phoneNumberHash = hashForSearch(phoneNumber);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, emailHash, phoneNumberHash },
    create: {
      email,
      emailHash,
      phoneNumber,
      phoneNumberHash,
      passwordHash,
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  console.log(`Admin user seeded: ${user.email} (ID: ${user.id})`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
