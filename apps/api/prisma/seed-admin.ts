import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@wheelsongo.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const phoneNumber = process.env.ADMIN_PHONE || '+630000000000';

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      phoneNumber,
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
