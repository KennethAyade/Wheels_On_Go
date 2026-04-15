import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_EMAIL_SUFFIX = '@wheelsongo.test';
const DEMO_EMAIL_LIKE = 'demo-%@wheelsongo.test';

async function main() {
  console.log('\n=== Dashboard Demo Cleanup ===\n');

  const demoUsers = await prisma.user.findMany({
    where: {
      email: { endsWith: DEMO_EMAIL_SUFFIX, startsWith: 'demo-' },
    },
    select: { id: true, role: true },
  });

  if (demoUsers.length === 0) {
    console.log('No demo users found. Nothing to clean up.');
    return;
  }

  const userIds = demoUsers.map((u) => u.id);
  const driverUserIds = demoUsers.filter((u) => u.role === 'DRIVER').map((u) => u.id);
  const riderUserIds = demoUsers.filter((u) => u.role === 'RIDER').map((u) => u.id);
  console.log(`Found ${demoUsers.length} demo users (${driverUserIds.length} drivers, ${riderUserIds.length} riders). Cleaning...`);

  const demoDriverProfiles = await prisma.driverProfile.findMany({
    where: { userId: { in: driverUserIds } },
    select: { id: true },
  });
  const driverProfileIds = demoDriverProfiles.map((p) => p.id);

  const demoRiderProfiles = await prisma.riderProfile.findMany({
    where: { userId: { in: riderUserIds } },
    select: { id: true },
  });
  const riderProfileIds = demoRiderProfiles.map((p) => p.id);

  const demoRides = await prisma.ride.findMany({
    where: {
      OR: [
        { riderId: { in: userIds } },
        { driverId: { in: userIds } },
        { driverProfileId: { in: driverProfileIds } },
      ],
    },
    select: { id: true },
  });
  const rideIds = demoRides.map((r) => r.id);
  console.log(`   demo rides: ${rideIds.length}`);

  // Delete in FK-safe order
  const r1 = await prisma.rating.deleteMany({ where: { rideId: { in: rideIds } } });
  console.log(`   \u2713 ratings deleted: ${r1.count}`);

  const r2 = await prisma.transaction.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { rideId: { in: rideIds } }] },
  });
  console.log(`   \u2713 transactions deleted: ${r2.count}`);

  const r3 = await prisma.dispatchAttempt.deleteMany({ where: { rideId: { in: rideIds } } });
  console.log(`   \u2713 dispatch attempts deleted: ${r3.count}`);

  const r4 = await prisma.rideRoute.deleteMany({ where: { rideId: { in: rideIds } } });
  console.log(`   \u2713 ride routes deleted: ${r4.count}`);

  const r5 = await prisma.ride.deleteMany({ where: { id: { in: rideIds } } });
  console.log(`   \u2713 rides deleted: ${r5.count}`);

  const r6 = await prisma.driverDocument.deleteMany({
    where: { driverProfileId: { in: driverProfileIds } },
  });
  console.log(`   \u2713 driver documents deleted: ${r6.count}`);

  const r7 = await prisma.biometricVerification.deleteMany({
    where: { driverProfileId: { in: driverProfileIds } },
  });
  console.log(`   \u2713 biometric verifications deleted: ${r7.count}`);

  const r8 = await prisma.vehicle.deleteMany({ where: { driverProfileId: { in: driverProfileIds } } });
  console.log(`   \u2713 vehicles deleted: ${r8.count}`);

  const r9 = await prisma.driverWallet.deleteMany({
    where: { driverProfileId: { in: driverProfileIds } },
  });
  console.log(`   \u2713 driver wallets deleted: ${r9.count}`);

  const r10 = await prisma.driverProfile.deleteMany({ where: { id: { in: driverProfileIds } } });
  console.log(`   \u2713 driver profiles deleted: ${r10.count}`);

  const r11 = await prisma.emergencyContact.deleteMany({
    where: { riderProfileId: { in: riderProfileIds } },
  });
  console.log(`   \u2713 emergency contacts deleted: ${r11.count}`);

  const r12 = await prisma.savedLocation.deleteMany({
    where: { riderProfileId: { in: riderProfileIds } },
  });
  console.log(`   \u2713 saved locations deleted: ${r12.count}`);

  const r13 = await prisma.riderPreference.deleteMany({
    where: { riderProfileId: { in: riderProfileIds } },
  });
  console.log(`   \u2713 rider preferences deleted: ${r13.count}`);

  const r14 = await prisma.riderVehicle.deleteMany({
    where: { riderProfileId: { in: riderProfileIds } },
  });
  console.log(`   \u2713 rider vehicles deleted: ${r14.count}`);

  const r15 = await prisma.riderProfile.deleteMany({ where: { id: { in: riderProfileIds } } });
  console.log(`   \u2713 rider profiles deleted: ${r15.count}`);

  const r16 = await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  console.log(`   \u2713 refresh tokens deleted: ${r16.count}`);

  const r17 = await prisma.otpCode.deleteMany({ where: { userId: { in: userIds } } });
  console.log(`   \u2713 otp codes deleted: ${r17.count}`);

  const r18 = await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  console.log(`   \u2713 audit logs deleted: ${r18.count}`);

  const r19 = await prisma.user.deleteMany({
    where: { email: { endsWith: DEMO_EMAIL_SUFFIX, startsWith: 'demo-' } },
  });
  console.log(`   \u2713 users deleted: ${r19.count}`);

  console.log(`\n\u2713 Cleanup complete. (Pattern: ${DEMO_EMAIL_LIKE})\n`);
}

main()
  .catch((e) => {
    console.error('\u2716 Cleanup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
