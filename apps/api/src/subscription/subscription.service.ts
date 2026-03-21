import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit.constants';
import { PaymentMethod, PaymentStatus, TransactionType, Prisma } from '@prisma/client';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List all active subscription plans
   */
  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyFee: 'asc' },
    });
  }

  /**
   * Get current user's subscription
   */
  async getMySubscription(userId: string) {
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
      include: { subscriptionPlan: true },
    });

    if (!riderProfile) {
      throw new NotFoundException('Rider profile not found');
    }

    if (!riderProfile.subscriptionPlanId) {
      return { active: false, plan: null, startDate: null, endDate: null };
    }

    const isActive =
      riderProfile.subscriptionEndDate &&
      new Date(riderProfile.subscriptionEndDate) > new Date();

    return {
      active: !!isActive,
      plan: riderProfile.subscriptionPlan,
      startDate: riderProfile.subscriptionStartDate,
      endDate: riderProfile.subscriptionEndDate,
    };
  }

  /**
   * Subscribe to a plan (simulated payment)
   */
  async subscribe(userId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Subscription plan not found');
    }

    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });

    if (!riderProfile) {
      throw new NotFoundException('Rider profile not found');
    }

    // Check if already subscribed to this plan with active subscription
    if (
      riderProfile.subscriptionPlanId === planId &&
      riderProfile.subscriptionEndDate &&
      new Date(riderProfile.subscriptionEndDate) > new Date()
    ) {
      throw new BadRequestException('You already have an active subscription to this plan');
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    const monthlyFee = Number(plan.monthlyFee);
    const paymentReference = `SUB-${Date.now()}`;

    await this.prisma.$transaction(async (tx) => {
      // Update rider profile with subscription
      await tx.riderProfile.update({
        where: { userId },
        data: {
          subscriptionPlanId: planId,
          subscriptionStartDate: now,
          subscriptionEndDate: endDate,
        },
      });

      // Create subscription fee transaction (simulated payment)
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.SUBSCRIPTION_FEE,
          amount: monthlyFee,
          status: PaymentStatus.COMPLETED,
          paymentMethod: PaymentMethod.GCASH,
          paymentReference,
          paymentGateway: 'SIMULATED',
          description: `Subscription: ${plan.name} (30 days)`,
          processedAt: now,
        },
      });
    });

    await this.auditService.log(
      userId,
      AuditAction.PAYMENT_PROCESSED,
      'SubscriptionPlan',
      planId,
      { action: 'subscribe', plan: plan.name, fee: monthlyFee },
    );

    this.logger.log(`User ${userId} subscribed to ${plan.name}`);

    return {
      success: true,
      plan,
      startDate: now,
      endDate,
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string) {
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
      include: { subscriptionPlan: true },
    });

    if (!riderProfile || !riderProfile.subscriptionPlanId) {
      throw new BadRequestException('No active subscription to cancel');
    }

    await this.prisma.riderProfile.update({
      where: { userId },
      data: {
        subscriptionPlanId: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
      },
    });

    await this.auditService.log(
      userId,
      AuditAction.PAYMENT_PROCESSED,
      'SubscriptionPlan',
      riderProfile.subscriptionPlanId,
      { action: 'cancel', plan: riderProfile.subscriptionPlan?.name },
    );

    this.logger.log(`User ${userId} cancelled subscription`);

    return { success: true };
  }

  /**
   * Get the active subscription discount for a user (used by fare estimation)
   */
  async getSubscriptionDiscount(userId: string): Promise<number> {
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
      include: { subscriptionPlan: true },
    });

    if (
      !riderProfile?.subscriptionPlan ||
      !riderProfile.subscriptionEndDate ||
      new Date(riderProfile.subscriptionEndDate) <= new Date()
    ) {
      return 0;
    }

    return riderProfile.subscriptionPlan.discountPercentage;
  }

  // ==========================================
  // Admin CRUD
  // ==========================================

  async listAllPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { riders: true } } },
    });
  }

  async createPlan(dto: CreateSubscriptionPlanDto, adminUserId: string) {
    try {
      const plan = await this.prisma.subscriptionPlan.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          monthlyFee: dto.monthlyFee,
          discountPercentage: dto.discountPercentage,
          maxRidesPerMonth: dto.maxRidesPerMonth ?? null,
          priorityDispatch: dto.priorityDispatch ?? false,
        },
      });

      await this.auditService.log(
        adminUserId,
        AuditAction.ADMIN_CONFIG_CHANGED,
        'SubscriptionPlan',
        plan.id,
        { action: 'create', name: plan.name },
      );

      this.logger.log(`Admin ${adminUserId} created plan: ${plan.name}`);
      return plan;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`A plan named "${dto.name}" already exists`);
      }
      throw error;
    }
  }

  async updatePlan(
    planId: string,
    dto: UpdateSubscriptionPlanDto,
    adminUserId: string,
  ) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!existing) {
      throw new NotFoundException('Subscription plan not found');
    }

    try {
      const plan = await this.prisma.subscriptionPlan.update({
        where: { id: planId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.monthlyFee !== undefined && { monthlyFee: dto.monthlyFee }),
          ...(dto.discountPercentage !== undefined && {
            discountPercentage: dto.discountPercentage,
          }),
          ...(dto.maxRidesPerMonth !== undefined && {
            maxRidesPerMonth: dto.maxRidesPerMonth,
          }),
          ...(dto.priorityDispatch !== undefined && {
            priorityDispatch: dto.priorityDispatch,
          }),
        },
      });

      await this.auditService.log(
        adminUserId,
        AuditAction.ADMIN_CONFIG_CHANGED,
        'SubscriptionPlan',
        plan.id,
        { action: 'update', name: plan.name, changes: { ...dto } },
      );

      this.logger.log(`Admin ${adminUserId} updated plan: ${plan.name}`);
      return plan;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`A plan named "${dto.name}" already exists`);
      }
      throw error;
    }
  }

  async togglePlanActive(planId: string, adminUserId: string) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!existing) {
      throw new NotFoundException('Subscription plan not found');
    }

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { isActive: !existing.isActive },
    });

    await this.auditService.log(
      adminUserId,
      AuditAction.ADMIN_CONFIG_CHANGED,
      'SubscriptionPlan',
      plan.id,
      { action: 'toggle_active', name: plan.name, isActive: plan.isActive },
    );

    this.logger.log(
      `Admin ${adminUserId} ${plan.isActive ? 'activated' : 'deactivated'} plan: ${plan.name}`,
    );
    return plan;
  }
}
