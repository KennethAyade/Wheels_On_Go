import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  DriverStatus,
  DriverDocumentType,
  DocumentStatus,
  VehicleType,
  PaymentMethod,
} from '@prisma/client';
import { createHmac } from 'crypto';

const prisma = new PrismaClient();

const TARGET_DRIVERS = 315;
const TARGET_RIDERS = 327;

const DEMO_EMAIL_SUFFIX = '@wheelsongo.test';
const DRIVER_EMAIL_PREFIX = 'demo-drv-';
const RIDER_EMAIL_PREFIX = 'demo-own-';

function hashForSearch(value: string): string {
  if (!value) return '';
  const keyHex = process.env.ENCRYPTION_KEY;
  const DEFAULT_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const resolvedKey = keyHex && keyHex.length === 64 ? keyHex : DEFAULT_KEY;
  return createHmac('sha256', Buffer.from(resolvedKey, 'hex'))
    .update(value.toLowerCase().trim())
    .digest('hex');
}

const pad = (n: number, len = 3) => String(n).padStart(len, '0');
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const VEHICLE_POOL = [
  { make: 'Toyota', model: 'Vios', year: 2020, color: 'White' },
  { make: 'Honda', model: 'City', year: 2021, color: 'Silver' },
  { make: 'Mitsubishi', model: 'Mirage G4', year: 2019, color: 'Red' },
  { make: 'Toyota', model: 'Innova', year: 2022, color: 'Gray' },
  { make: 'Hyundai', model: 'Accent', year: 2020, color: 'Black' },
  { make: 'Nissan', model: 'Almera', year: 2021, color: 'Blue' },
  { make: 'Suzuki', model: 'Ertiga', year: 2022, color: 'White' },
  { make: 'Ford', model: 'EcoSport', year: 2020, color: 'Silver' },
];

const VEHICLE_TYPES: VehicleType[] = [
  VehicleType.SEDAN,
  VehicleType.SUV,
  VehicleType.VAN,
  VehicleType.HATCHBACK,
  VehicleType.MOTORCYCLE,
];

async function nextDemoIndex(prefix: string): Promise<number> {
  const last = await prisma.user.findFirst({
    where: { email: { startsWith: prefix, endsWith: DEMO_EMAIL_SUFFIX } },
    orderBy: { email: 'desc' },
    select: { email: true },
  });
  if (!last?.email) return 1;
  const match = last.email.match(new RegExp(`^${prefix}(\\d+)`));
  return match ? parseInt(match[1], 10) + 1 : 1;
}

async function reactivateSomeDemoRiders(need: number): Promise<number> {
  if (need <= 0) return 0;
  const deactivated = await prisma.user.findMany({
    where: {
      role: UserRole.RIDER,
      isActive: false,
      email: { startsWith: RIDER_EMAIL_PREFIX, endsWith: DEMO_EMAIL_SUFFIX },
    },
    take: need,
    select: { id: true },
  });
  if (!deactivated.length) return 0;
  const res = await prisma.user.updateMany({
    where: { id: { in: deactivated.map((u) => u.id) } },
    data: { isActive: true },
  });
  return res.count;
}

async function main() {
  console.log('\n=== Dashboard Demo Top-Up ===');
  console.log(`Targets: ${TARGET_DRIVERS} drivers, ${TARGET_RIDERS} car owners\n`);

  const [currentDrivers, currentRiders] = await Promise.all([
    prisma.driverProfile.count({ where: { isOnline: true, status: DriverStatus.APPROVED } }),
    prisma.user.count({ where: { role: UserRole.RIDER, isActive: true } }),
  ]);

  let driverDelta = TARGET_DRIVERS - currentDrivers;
  let riderDelta = TARGET_RIDERS - currentRiders;
  console.log(`Current: drivers=${currentDrivers}, riders=${currentRiders}`);
  console.log(`Delta:   drivers=${driverDelta >= 0 ? '+' : ''}${driverDelta}, riders=${riderDelta >= 0 ? '+' : ''}${riderDelta}\n`);

  if (driverDelta === 0 && riderDelta === 0) {
    console.log('Already on target. Nothing to do.');
    return;
  }

  // -------- Riders --------
  if (riderDelta > 0) {
    const reactivated = await reactivateSomeDemoRiders(riderDelta);
    if (reactivated > 0) console.log(`[riders] Reactivated ${reactivated} previously deactivated demo riders`);
    riderDelta -= reactivated;
  }

  if (riderDelta > 0) {
    const startIdx = await nextDemoIndex(RIDER_EMAIL_PREFIX);
    console.log(`[riders] Creating ${riderDelta} new car owners starting at index ${startIdx}...`);
    const now = Date.now();
    const data = Array.from({ length: riderDelta }, (_, off) => {
      const i = startIdx + off;
      const email = `${RIDER_EMAIL_PREFIX}${pad(i)}${DEMO_EMAIL_SUFFIX}`;
      const phoneNumber = `+63999920${pad(i, 4)}`;
      return {
        email,
        emailHash: hashForSearch(email),
        phoneNumber,
        phoneNumberHash: hashForSearch(phoneNumber),
        role: UserRole.RIDER,
        isActive: true,
        firstName: 'Demo',
        lastName: `Owner ${i}`,
        averageRating: +rand(4.2, 5.0).toFixed(2),
        totalRatings: randInt(0, 30),
        createdAt: new Date(now - randInt(1, 365) * 86_400_000),
      };
    });
    await prisma.user.createMany({ data, skipDuplicates: true });

    const created = await prisma.user.findMany({
      where: { email: { in: data.map((d) => d.email) } },
      select: { id: true },
    });
    await prisma.riderProfile.createMany({
      data: created.map((u) => ({
        userId: u.id,
        defaultPaymentMethod: pick([PaymentMethod.CASH, PaymentMethod.WALLET, PaymentMethod.GCASH]),
      })),
      skipDuplicates: true,
    });
    const profiles = await prisma.riderProfile.findMany({
      where: { userId: { in: created.map((u) => u.id) } },
      select: { id: true },
    });
    await prisma.riderPreference.createMany({
      data: profiles.map((p) => ({ riderProfileId: p.id })),
      skipDuplicates: true,
    });
    console.log(`[riders] \u2713 ${created.length} created`);
  } else if (riderDelta < 0) {
    // too many — deactivate some demo riders (highest index first)
    const extra = -riderDelta;
    const demoRiders = await prisma.user.findMany({
      where: {
        role: UserRole.RIDER,
        isActive: true,
        email: { startsWith: RIDER_EMAIL_PREFIX, endsWith: DEMO_EMAIL_SUFFIX },
      },
      orderBy: { email: 'desc' },
      take: extra,
      select: { id: true, email: true },
    });
    const res = await prisma.user.updateMany({
      where: { id: { in: demoRiders.map((u) => u.id) } },
      data: { isActive: false },
    });
    console.log(`[riders] Deactivated ${res.count} demo riders`);
  }

  // -------- Drivers --------
  if (driverDelta > 0) {
    const startIdx = await nextDemoIndex(DRIVER_EMAIL_PREFIX);
    console.log(`\n[drivers] Creating ${driverDelta} new drivers starting at index ${startIdx}...`);
    const now = Date.now();
    const userData = Array.from({ length: driverDelta }, (_, off) => {
      const i = startIdx + off;
      const email = `${DRIVER_EMAIL_PREFIX}${pad(i)}${DEMO_EMAIL_SUFFIX}`;
      const phoneNumber = `+63999910${pad(i, 4)}`;
      return {
        email,
        emailHash: hashForSearch(email),
        phoneNumber,
        phoneNumberHash: hashForSearch(phoneNumber),
        role: UserRole.DRIVER,
        isActive: true,
        firstName: 'Demo',
        lastName: `Driver ${i}`,
        averageRating: +rand(4.0, 5.0).toFixed(2),
        totalRatings: randInt(5, 60),
        createdAt: new Date(now - randInt(1, 180) * 86_400_000),
      };
    });
    await prisma.user.createMany({ data: userData, skipDuplicates: true });
    const created = await prisma.user.findMany({
      where: { email: { in: userData.map((d) => d.email) } },
      select: { id: true, createdAt: true, email: true },
      orderBy: { email: 'asc' },
    });

    await prisma.driverProfile.createMany({
      data: created.map((u, off) => {
        const i = startIdx + off;
        return {
          userId: u.id,
          status: DriverStatus.APPROVED,
          isOnline: true,
          licenseNumber: `DEMO-LIC-${pad(i, 4)}`,
          licenseExpiryDate: new Date(now + randInt(365, 1095) * 86_400_000),
          acceptanceRate: +rand(0.7, 0.98).toFixed(2),
          completionRate: +rand(0.85, 1.0).toFixed(2),
          totalRides: randInt(5, 200),
          totalEarnings: +rand(500, 20000).toFixed(2),
          walletBalance: +rand(100, 2500).toFixed(2),
          createdAt: u.createdAt,
        };
      }),
      skipDuplicates: true,
    });
    const profiles = await prisma.driverProfile.findMany({
      where: { userId: { in: created.map((u) => u.id) } },
      select: { id: true, walletBalance: true, createdAt: true },
    });

    await prisma.driverWallet.createMany({
      data: profiles.map((p) => ({
        driverProfileId: p.id,
        balance: p.walletBalance,
        pendingBalance: 0,
      })),
      skipDuplicates: true,
    });

    await prisma.vehicle.createMany({
      data: profiles.map((p, off) => {
        const i = startIdx + off;
        const veh = pick(VEHICLE_POOL);
        return {
          driverProfileId: p.id,
          make: veh.make,
          model: veh.model,
          year: veh.year,
          color: veh.color,
          plateNumber: `DEMO-V-${pad(i, 4)}`,
          registrationNumber: `DEMO-R-${pad(i, 4)}`,
          registrationExpiry: new Date(now + randInt(180, 730) * 86_400_000),
          vehicleType: pick(VEHICLE_TYPES),
          isActive: true,
        };
      }),
      skipDuplicates: true,
    });

    const DOC_TYPES: DriverDocumentType[] = [
      DriverDocumentType.LICENSE,
      DriverDocumentType.ORCR,
      DriverDocumentType.GOVERNMENT_ID,
    ];
    const docData = [];
    for (const p of profiles) {
      for (const type of DOC_TYPES) {
        docData.push({
          driverProfileId: p.id,
          type,
          storageKey: `demo/${p.id}/${type}.jpg`,
          fileName: `${type}.jpg`,
          mimeType: 'image/jpeg',
          status: DocumentStatus.VERIFIED,
          uploadedAt: new Date(p.createdAt.getTime() + 86_400_000),
        });
      }
    }
    for (let i = 0; i < docData.length; i += 500) {
      await prisma.driverDocument.createMany({
        data: docData.slice(i, i + 500),
        skipDuplicates: true,
      });
    }
    console.log(`[drivers] \u2713 ${created.length} created with profiles, wallets, vehicles, documents`);
  } else if (driverDelta < 0) {
    const extra = -driverDelta;
    const demoDrivers = await prisma.driverProfile.findMany({
      where: {
        isOnline: true,
        status: DriverStatus.APPROVED,
        user: { email: { startsWith: DRIVER_EMAIL_PREFIX, endsWith: DEMO_EMAIL_SUFFIX } },
      },
      orderBy: { licenseNumber: 'desc' },
      take: extra,
      select: { id: true },
    });
    const res = await prisma.driverProfile.updateMany({
      where: { id: { in: demoDrivers.map((p) => p.id) } },
      data: { isOnline: false },
    });
    console.log(`[drivers] Marked ${res.count} demo drivers offline`);
  }

  // -------- Reconcile --------
  for (let attempt = 0; attempt < 3; attempt++) {
    const [d, r] = await Promise.all([
      prisma.driverProfile.count({ where: { isOnline: true, status: DriverStatus.APPROVED } }),
      prisma.user.count({ where: { role: UserRole.RIDER, isActive: true } }),
    ]);
    if (d === TARGET_DRIVERS && r === TARGET_RIDERS) break;
    console.log(`\n[reconcile] drivers=${d}, riders=${r}; adjusting...`);
    if (r > TARGET_RIDERS) {
      const demoRiders = await prisma.user.findMany({
        where: {
          role: UserRole.RIDER,
          isActive: true,
          email: { startsWith: RIDER_EMAIL_PREFIX, endsWith: DEMO_EMAIL_SUFFIX },
        },
        orderBy: { email: 'desc' },
        take: r - TARGET_RIDERS,
        select: { id: true },
      });
      await prisma.user.updateMany({
        where: { id: { in: demoRiders.map((u) => u.id) } },
        data: { isActive: false },
      });
    } else if (r < TARGET_RIDERS) {
      await reactivateSomeDemoRiders(TARGET_RIDERS - r);
    }
    if (d > TARGET_DRIVERS) {
      const demoDrivers = await prisma.driverProfile.findMany({
        where: {
          isOnline: true,
          status: DriverStatus.APPROVED,
          user: { email: { startsWith: DRIVER_EMAIL_PREFIX, endsWith: DEMO_EMAIL_SUFFIX } },
        },
        orderBy: { licenseNumber: 'desc' },
        take: d - TARGET_DRIVERS,
        select: { id: true },
      });
      await prisma.driverProfile.updateMany({
        where: { id: { in: demoDrivers.map((p) => p.id) } },
        data: { isOnline: false },
      });
    } else if (d < TARGET_DRIVERS) {
      const offline = await prisma.driverProfile.findMany({
        where: {
          isOnline: false,
          status: DriverStatus.APPROVED,
          user: { email: { startsWith: DRIVER_EMAIL_PREFIX, endsWith: DEMO_EMAIL_SUFFIX } },
        },
        take: TARGET_DRIVERS - d,
        select: { id: true },
      });
      await prisma.driverProfile.updateMany({
        where: { id: { in: offline.map((p) => p.id) } },
        data: { isOnline: true },
      });
    }
  }

  const [dFinal, rFinal, revFinal] = await Promise.all([
    prisma.driverProfile.count({ where: { isOnline: true, status: DriverStatus.APPROVED } }),
    prisma.user.count({ where: { role: UserRole.RIDER, isActive: true } }),
    prisma.ride.aggregate({ where: { status: 'COMPLETED' }, _sum: { totalFare: true } }),
  ]);
  console.log('\n=== Final dashboard numbers ===');
  console.log(`  Drivers:    ${dFinal}`);
  console.log(`  Car Owners: ${rFinal}`);
  console.log(`  Revenue:    \u20B1${Number(revFinal._sum.totalFare || 0).toLocaleString()}`);
  console.log('\n\u2713 Top-up complete.\n');
}

main()
  .catch((e) => {
    console.error('\u2716 Top-up failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
