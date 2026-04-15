import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  DriverStatus,
  DriverDocumentType,
  DocumentStatus,
  RideType,
  RideStatus,
  PaymentMethod,
  PaymentStatus,
  VehicleType,
  TransactionType,
} from '@prisma/client';
import { createHmac } from 'crypto';

const prisma = new PrismaClient();

const TARGET_DRIVERS = 315;
const TARGET_RIDERS = 327;
const TARGET_REVENUE = 50127;
const COMPLETED_RIDE_COUNT = 80;
const ACTIVE_RIDE_COUNT = 8;
const CANCELLED_RIDE_COUNT = 15;

const DEMO_EMAIL_SUFFIX = '@wheelsongo.test';
const DRIVER_EMAIL_PREFIX = 'demo-drv-';
const RIDER_EMAIL_PREFIX = 'demo-own-';

// Replicates EncryptionService.hashForSearch() (see seed-admin.ts)
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

const LOCATIONS = [
  { lat: 14.5547, lng: 121.0244, addr: 'Makati CBD, Makati' },
  { lat: 14.5764, lng: 121.0851, addr: 'Bonifacio Global City, Taguig' },
  { lat: 14.6349, lng: 121.0337, addr: 'Quezon City Hall, Quezon City' },
  { lat: 14.5378, lng: 121.0014, addr: 'Mall of Asia, Pasay' },
  { lat: 14.6760, lng: 121.0437, addr: 'Trinoma, Quezon City' },
  { lat: 14.5590, lng: 121.0223, addr: 'Glorietta, Makati' },
  { lat: 14.5995, lng: 120.9842, addr: 'Intramuros, Manila' },
  { lat: 14.5833, lng: 121.0614, addr: 'Ortigas Center, Pasig' },
  { lat: 14.6419, lng: 121.1049, addr: 'UP Diliman, Quezon City' },
  { lat: 14.5243, lng: 121.0195, addr: 'Bay Area, Pasay' },
];

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

async function main() {
  console.log('\n=== Dashboard Demo Seed ===');
  console.log(`Target: ${TARGET_DRIVERS} drivers, ${TARGET_RIDERS} car owners, \u20B1${TARGET_REVENUE} revenue\n`);

  const sentinel = await prisma.user.findFirst({
    where: { email: `${DRIVER_EMAIL_PREFIX}${pad(1)}${DEMO_EMAIL_SUFFIX}` },
  });
  if (sentinel) {
    console.error('\u2716 Demo data already exists. Run `npm run cleanup:demo-dashboard` first.');
    process.exit(1);
  }

  const [existingDrivers, existingRiders, existingAgg] = await Promise.all([
    prisma.driverProfile.count({ where: { isOnline: true, status: DriverStatus.APPROVED } }),
    prisma.user.count({ where: { role: UserRole.RIDER, isActive: true } }),
    prisma.ride.aggregate({
      where: { status: RideStatus.COMPLETED },
      _sum: { totalFare: true },
    }),
  ]);
  const existingRevenue = Number(existingAgg._sum.totalFare || 0);
  const driverDelta = TARGET_DRIVERS - existingDrivers;
  const riderDelta = TARGET_RIDERS - existingRiders;
  const targetRideRevenue = +(TARGET_REVENUE - existingRevenue).toFixed(2);

  console.log(
    `Baseline: drivers=${existingDrivers}, riders=${existingRiders}, revenue=\u20B1${existingRevenue.toLocaleString()}`,
  );
  console.log(
    `Delta to add: drivers=+${driverDelta}, riders=+${riderDelta}, revenue=+\u20B1${targetRideRevenue.toLocaleString()}\n`,
  );

  if (driverDelta <= 0 || riderDelta <= 0) {
    console.error(
      `\u2716 Baseline already meets or exceeds target for drivers or riders. Adjust targets or clean up real data first.`,
    );
    process.exit(1);
  }
  if (targetRideRevenue <= COMPLETED_RIDE_COUNT * 10) {
    console.error(
      `\u2716 Existing completed revenue (${existingRevenue}) is too close to or above target (${TARGET_REVENUE}). Clean up real data or run cleanup script first.`,
    );
    process.exit(1);
  }

  // -------- Phase 1: Car Owners (RIDER) --------
  console.log(`[1/4] Creating ${riderDelta} car owners...`);
  const now = Date.now();
  const riderUsersData = Array.from({ length: riderDelta }, (_, idx) => {
    const i = idx + 1;
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
  await prisma.user.createMany({ data: riderUsersData, skipDuplicates: true });
  const riderUsers = await prisma.user.findMany({
    where: {
      email: { startsWith: RIDER_EMAIL_PREFIX, endsWith: DEMO_EMAIL_SUFFIX },
    },
    orderBy: { email: 'asc' },
  });
  console.log(`   \u2713 ${riderUsers.length} car owner users`);

  await prisma.riderProfile.createMany({
    data: riderUsers.map((u) => ({
      userId: u.id,
      defaultPaymentMethod: pick([PaymentMethod.CASH, PaymentMethod.WALLET, PaymentMethod.GCASH]),
    })),
    skipDuplicates: true,
  });
  const riderProfiles = await prisma.riderProfile.findMany({
    where: { userId: { in: riderUsers.map((u) => u.id) } },
  });
  await prisma.riderPreference.createMany({
    data: riderProfiles.map((p) => ({ riderProfileId: p.id })),
    skipDuplicates: true,
  });

  const emergencyData = [];
  const savedLocData = [];
  for (const p of riderProfiles) {
    if (Math.random() < 0.4) {
      emergencyData.push({
        riderProfileId: p.id,
        name: 'Demo Emergency Contact',
        relationship: pick(['Spouse', 'Parent', 'Sibling', 'Friend']),
        phoneNumber: `+63999930${pad(randInt(1, 9999), 4)}`,
        isPrimary: true,
      });
    }
    if (Math.random() < 0.5) {
      const loc = pick(LOCATIONS);
      savedLocData.push({
        riderProfileId: p.id,
        label: pick(['Home', 'Work', 'Gym']),
        address: loc.addr,
        latitude: loc.lat,
        longitude: loc.lng,
        isDefault: true,
      });
    }
  }
  if (emergencyData.length) {
    await prisma.emergencyContact.createMany({ data: emergencyData });
  }
  if (savedLocData.length) {
    await prisma.savedLocation.createMany({ data: savedLocData });
  }

  const riderVehiclesData = [];
  for (let i = 0; i < Math.min(30, riderProfiles.length); i++) {
    const veh = pick(VEHICLE_POOL);
    riderVehiclesData.push({
      riderProfileId: riderProfiles[i].id,
      make: veh.make,
      model: veh.model,
      year: veh.year,
      color: veh.color,
      plateNumber: `DEMO-RV-${pad(i + 1, 4)}`,
      vehicleType: pick(VEHICLE_TYPES),
      isDefault: true,
    });
  }
  if (riderVehiclesData.length) {
    await prisma.riderVehicle.createMany({ data: riderVehiclesData });
  }

  // -------- Phase 2: Drivers --------
  console.log(`[2/4] Creating ${driverDelta} drivers...`);
  const driverUsersData = Array.from({ length: driverDelta }, (_, idx) => {
    const i = idx + 1;
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
  await prisma.user.createMany({ data: driverUsersData, skipDuplicates: true });
  const driverUsers = await prisma.user.findMany({
    where: {
      email: { startsWith: DRIVER_EMAIL_PREFIX, endsWith: DEMO_EMAIL_SUFFIX },
    },
    orderBy: { email: 'asc' },
  });
  console.log(`   \u2713 ${driverUsers.length} driver users`);

  await prisma.driverProfile.createMany({
    data: driverUsers.map((u, idx) => ({
      userId: u.id,
      status: DriverStatus.APPROVED,
      isOnline: true,
      licenseNumber: `DEMO-LIC-${pad(idx + 1, 4)}`,
      licenseExpiryDate: new Date(now + randInt(365, 1095) * 86_400_000),
      acceptanceRate: +rand(0.7, 0.98).toFixed(2),
      completionRate: +rand(0.85, 1.0).toFixed(2),
      totalRides: randInt(5, 200),
      totalEarnings: +rand(500, 20000).toFixed(2),
      walletBalance: +rand(100, 2500).toFixed(2),
      createdAt: u.createdAt,
    })),
    skipDuplicates: true,
  });
  const driverProfiles = await prisma.driverProfile.findMany({
    where: { userId: { in: driverUsers.map((u) => u.id) } },
  });
  const driverProfileByUserId = new Map(driverProfiles.map((p) => [p.userId, p]));

  await prisma.driverWallet.createMany({
    data: driverProfiles.map((p) => ({
      driverProfileId: p.id,
      balance: p.walletBalance,
      pendingBalance: 0,
    })),
    skipDuplicates: true,
  });

  await prisma.vehicle.createMany({
    data: driverProfiles.map((p, idx) => {
      const veh = pick(VEHICLE_POOL);
      return {
        driverProfileId: p.id,
        make: veh.make,
        model: veh.model,
        year: veh.year,
        color: veh.color,
        plateNumber: `DEMO-V-${pad(idx + 1, 4)}`,
        registrationNumber: `DEMO-R-${pad(idx + 1, 4)}`,
        registrationExpiry: new Date(now + randInt(180, 730) * 86_400_000),
        vehicleType: pick(VEHICLE_TYPES),
        isActive: true,
      };
    }),
    skipDuplicates: true,
  });
  const vehicles = await prisma.vehicle.findMany({
    where: { driverProfileId: { in: driverProfiles.map((p) => p.id) } },
  });
  const vehicleByProfileId = new Map(vehicles.map((v) => [v.driverProfileId, v]));

  const docData = [];
  const DOC_TYPES: DriverDocumentType[] = [
    DriverDocumentType.LICENSE,
    DriverDocumentType.ORCR,
    DriverDocumentType.GOVERNMENT_ID,
  ];
  for (const p of driverProfiles) {
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
  console.log(`   \u2713 drivers, profiles, wallets, vehicles, documents`);

  // -------- Phase 3: Completed Bookings + Payments + Ratings --------
  console.log(`[3/4] Creating ${COMPLETED_RIDE_COUNT} completed rides (total \u20B1${targetRideRevenue})...`);

  const fares: number[] = [];
  const avgFare = targetRideRevenue / COMPLETED_RIDE_COUNT;
  let running = 0;
  for (let i = 0; i < COMPLETED_RIDE_COUNT - 1; i++) {
    const jitter = rand(0.4, 1.6);
    const fare = Math.max(50, +(avgFare * jitter).toFixed(2));
    fares.push(fare);
    running += fare;
  }
  const lastFare = +(targetRideRevenue - running).toFixed(2);
  if (lastFare < 10) {
    // redistribute shortfall
    const deficit = 10 - lastFare;
    fares[fares.length - 1] = +(fares[fares.length - 1] - deficit).toFixed(2);
    fares.push(10);
  } else {
    fares.push(lastFare);
  }

  for (let i = 0; i < COMPLETED_RIDE_COUNT; i++) {
    const rider = pick(riderUsers);
    const driver = pick(driverUsers);
    const driverProfile = driverProfileByUserId.get(driver.id)!;
    const vehicle = vehicleByProfileId.get(driverProfile.id)!;
    const pickup = pick(LOCATIONS);
    let dropoff = pick(LOCATIONS);
    while (dropoff === pickup) dropoff = pick(LOCATIONS);

    const daysAgo = randInt(0, 29);
    const completedAt = new Date(
      now - daysAgo * 86_400_000 - randInt(0, 23) * 3_600_000 - randInt(0, 59) * 60_000,
    );
    const requestedAt = new Date(completedAt.getTime() - randInt(15, 60) * 60_000);
    const acceptedAt = new Date(requestedAt.getTime() + randInt(10, 90) * 1000);
    const driverArrivedAt = new Date(acceptedAt.getTime() + randInt(3, 10) * 60_000);
    const startedAt = new Date(driverArrivedAt.getTime() + randInt(1, 3) * 60_000);
    const totalFare = fares[i];
    const method = pick([PaymentMethod.CASH, PaymentMethod.WALLET, PaymentMethod.GCASH]);

    const ride = await prisma.ride.create({
      data: {
        riderId: rider.id,
        driverId: driver.id,
        driverProfileId: driverProfile.id,
        vehicleId: vehicle.id,
        rideType: RideType.INSTANT,
        status: RideStatus.COMPLETED,
        pickupLatitude: pickup.lat,
        pickupLongitude: pickup.lng,
        pickupAddress: pickup.addr,
        dropoffLatitude: dropoff.lat,
        dropoffLongitude: dropoff.lng,
        dropoffAddress: dropoff.addr,
        estimatedDistance: +rand(1, 15).toFixed(2),
        estimatedDuration: randInt(10, 45),
        actualDistance: +rand(1, 15).toFixed(2),
        actualDuration: randInt(10, 45),
        baseFare: 40,
        costPerKm: 12,
        costPerMin: 2,
        totalFare,
        paymentMethod: method,
        paymentStatus: PaymentStatus.COMPLETED,
        requestedAt,
        acceptedAt,
        driverArrivedAt,
        startedAt,
        completedAt,
        createdAt: requestedAt,
      },
    });

    const commission = +(totalFare * 0.2).toFixed(2);
    const net = +(totalFare - commission).toFixed(2);
    await prisma.transaction.create({
      data: {
        userId: rider.id,
        driverProfileId: driverProfile.id,
        rideId: ride.id,
        type: TransactionType.RIDE_PAYMENT,
        amount: totalFare,
        status: PaymentStatus.COMPLETED,
        paymentMethod: method,
        grossAmount: totalFare,
        commissionAmount: commission,
        commissionRate: 0.2,
        netAmount: net,
        processedAt: completedAt,
        createdAt: completedAt,
      },
    });

    if (Math.random() < 0.7) {
      await prisma.rating.create({
        data: {
          rideId: ride.id,
          reviewerId: rider.id,
          revieweeId: driver.id,
          rating: randInt(3, 5),
          review:
            Math.random() < 0.3
              ? pick(['Great driver!', 'Smooth ride', 'On time', 'Very polite', 'Clean car'])
              : null,
          isRiderToDriver: true,
          createdAt: new Date(completedAt.getTime() + 5 * 60_000),
        },
      });
    }

    if ((i + 1) % 20 === 0) console.log(`   ${i + 1}/${COMPLETED_RIDE_COUNT} rides`);
  }

  // -------- Phase 4: Active + cancelled rides for page variety --------
  console.log(`[4/4] Creating ${ACTIVE_RIDE_COUNT} active + ${CANCELLED_RIDE_COUNT} cancelled rides...`);
  const activeStatuses: RideStatus[] = [
    RideStatus.ACCEPTED,
    RideStatus.DRIVER_ARRIVED,
    RideStatus.STARTED,
  ];
  for (let i = 0; i < ACTIVE_RIDE_COUNT; i++) {
    const rider = pick(riderUsers);
    const driver = pick(driverUsers);
    const driverProfile = driverProfileByUserId.get(driver.id)!;
    const vehicle = vehicleByProfileId.get(driverProfile.id)!;
    const pickup = pick(LOCATIONS);
    let dropoff = pick(LOCATIONS);
    while (dropoff === pickup) dropoff = pick(LOCATIONS);
    const requestedAt = new Date(now - randInt(5, 45) * 60_000);
    await prisma.ride.create({
      data: {
        riderId: rider.id,
        driverId: driver.id,
        driverProfileId: driverProfile.id,
        vehicleId: vehicle.id,
        rideType: RideType.INSTANT,
        status: pick(activeStatuses),
        pickupLatitude: pickup.lat,
        pickupLongitude: pickup.lng,
        pickupAddress: pickup.addr,
        dropoffLatitude: dropoff.lat,
        dropoffLongitude: dropoff.lng,
        dropoffAddress: dropoff.addr,
        baseFare: 40,
        costPerKm: 12,
        costPerMin: 2,
        totalFare: +rand(120, 600).toFixed(2),
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PENDING,
        requestedAt,
        acceptedAt: new Date(requestedAt.getTime() + 60_000),
        createdAt: requestedAt,
      },
    });
  }

  const cancelledStatuses: RideStatus[] = [
    RideStatus.CANCELLED_BY_RIDER,
    RideStatus.CANCELLED_BY_DRIVER,
    RideStatus.CANCELLED_BY_SYSTEM,
  ];
  for (let i = 0; i < CANCELLED_RIDE_COUNT; i++) {
    const rider = pick(riderUsers);
    const hasDriver = Math.random() < 0.7;
    const driver = hasDriver ? pick(driverUsers) : null;
    const driverProfile = driver ? driverProfileByUserId.get(driver.id) : undefined;
    const pickup = pick(LOCATIONS);
    let dropoff = pick(LOCATIONS);
    while (dropoff === pickup) dropoff = pick(LOCATIONS);
    const daysAgo = randInt(0, 29);
    const requestedAt = new Date(now - daysAgo * 86_400_000 - randInt(0, 23) * 3_600_000);
    await prisma.ride.create({
      data: {
        riderId: rider.id,
        driverId: driver?.id,
        driverProfileId: driverProfile?.id,
        rideType: RideType.INSTANT,
        status: pick(cancelledStatuses),
        cancelledAt: new Date(requestedAt.getTime() + randInt(2, 30) * 60_000),
        cancellationReason: pick([
          'Rider no-show',
          'Changed plans',
          'Driver unavailable',
          'Traffic too heavy',
        ]),
        pickupLatitude: pickup.lat,
        pickupLongitude: pickup.lng,
        pickupAddress: pickup.addr,
        dropoffLatitude: dropoff.lat,
        dropoffLongitude: dropoff.lng,
        dropoffAddress: dropoff.addr,
        baseFare: 40,
        costPerKm: 12,
        costPerMin: 2,
        totalFare: 0,
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PENDING,
        requestedAt,
        createdAt: requestedAt,
      },
    });
  }

  const [driversFinal, ridersFinal, revFinal] = await Promise.all([
    prisma.driverProfile.count({ where: { isOnline: true, status: DriverStatus.APPROVED } }),
    prisma.user.count({ where: { role: UserRole.RIDER, isActive: true } }),
    prisma.ride.aggregate({ where: { status: RideStatus.COMPLETED }, _sum: { totalFare: true } }),
  ]);

  console.log('\n=== Final dashboard numbers ===');
  console.log(`  Drivers:    ${driversFinal}`);
  console.log(`  Car Owners: ${ridersFinal}`);
  console.log(`  Revenue:    \u20B1${Number(revFinal._sum.totalFare || 0).toLocaleString()}`);
  console.log('\n\u2713 Seed complete.\n');
}

main()
  .catch((e) => {
    console.error('\u2716 Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
