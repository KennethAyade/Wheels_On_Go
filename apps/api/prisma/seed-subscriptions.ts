import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    name: 'Basic',
    description: 'Save 5% on every ride with our Basic plan.',
    monthlyFee: 99,
    discountPercentage: 5,
    maxRidesPerMonth: null,
    priorityDispatch: false,
  },
  {
    name: 'Premium',
    description: 'Save 10% on every ride with priority features.',
    monthlyFee: 199,
    discountPercentage: 10,
    maxRidesPerMonth: null,
    priorityDispatch: false,
  },
  {
    name: 'VIP',
    description: 'Save 20% on every ride with priority dispatch and exclusive perks.',
    monthlyFee: 499,
    discountPercentage: 20,
    maxRidesPerMonth: null,
    priorityDispatch: true,
  },
];

async function main() {
  for (const plan of plans) {
    const result = await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: {
        description: plan.description,
        monthlyFee: plan.monthlyFee,
        discountPercentage: plan.discountPercentage,
        maxRidesPerMonth: plan.maxRidesPerMonth,
        priorityDispatch: plan.priorityDispatch,
        isActive: true,
      },
      create: {
        name: plan.name,
        description: plan.description,
        monthlyFee: plan.monthlyFee,
        discountPercentage: plan.discountPercentage,
        maxRidesPerMonth: plan.maxRidesPerMonth,
        priorityDispatch: plan.priorityDispatch,
        isActive: true,
      },
    });
    console.log(`Subscription plan seeded: ${result.name} (ID: ${result.id})`);
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
