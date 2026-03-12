import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit.constants';
import { PaymentMethod, PaymentStatus, RideStatus, TransactionType } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Process payment after ride completion.
   * GCash/Card → auto-complete (simulated).
   * Cash → stays PENDING until driver confirms.
   */
  async processPayment(rideId: string): Promise<void> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driverProfile: true,
      },
    });

    if (!ride) {
      this.logger.warn(`processPayment: ride ${rideId} not found`);
      return;
    }

    if (ride.paymentStatus !== PaymentStatus.PENDING) {
      this.logger.warn(`processPayment: ride ${rideId} already processed (${ride.paymentStatus})`);
      return;
    }

    // Digital payments auto-complete; cash waits for driver confirmation
    if (ride.paymentMethod !== PaymentMethod.CASH) {
      await this.completePayment(ride, ride.driverProfile);
      this.logger.log(
        `Payment auto-completed for ride ${rideId} (${ride.paymentMethod})`,
      );
    }
  }

  /**
   * Driver confirms cash payment received.
   */
  async confirmCashPayment(
    rideId: string,
    driverUserId: string,
  ): Promise<{ success: boolean }> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driverProfile: {
          include: { user: { select: { id: true } } },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.driverProfile?.user?.id !== driverUserId) {
      throw new ForbiddenException('You are not the driver of this ride');
    }

    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('Ride is not completed yet');
    }

    if (ride.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment already processed');
    }

    if (ride.paymentMethod !== PaymentMethod.CASH) {
      throw new BadRequestException('This is not a cash payment ride');
    }

    await this.completePayment(ride, ride.driverProfile);

    await this.auditService.log(
      driverUserId,
      AuditAction.PAYMENT_INITIATED,
      'Ride',
      rideId,
      { action: 'cash_confirmed', amount: Number(ride.totalFare) },
    );

    this.logger.log(`Cash payment confirmed for ride ${rideId} by driver ${driverUserId}`);

    return { success: true };
  }

  /**
   * Core payment completion logic:
   * 1. Update ride paymentStatus to COMPLETED
   * 2. Create Transaction record
   * 3. Upsert DriverWallet with net earnings
   */
  private async completePayment(ride: any, driverProfile: any): Promise<void> {
    const grossAmount = Number(ride.totalFare);
    const commissionRate = driverProfile?.commissionRate ?? 0.2;
    const commissionAmount = Math.round(grossAmount * commissionRate * 100) / 100;
    const netAmount = Math.round((grossAmount - commissionAmount) * 100) / 100;
    const isCash = ride.paymentMethod === PaymentMethod.CASH;
    const paymentReference = isCash
      ? `CASH-${Date.now()}`
      : `SIM-${Date.now()}`;

    await this.prisma.$transaction(async (tx) => {
      // 1. Update ride payment status
      await tx.ride.update({
        where: { id: ride.id },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          paymentReference,
        },
      });

      // 2. Create transaction record
      await tx.transaction.create({
        data: {
          userId: ride.riderId,
          driverProfileId: driverProfile?.id,
          rideId: ride.id,
          type: TransactionType.RIDE_PAYMENT,
          amount: grossAmount,
          status: PaymentStatus.COMPLETED,
          paymentMethod: ride.paymentMethod,
          paymentReference,
          paymentGateway: isCash ? 'CASH' : 'SIMULATED',
          grossAmount,
          commissionAmount,
          commissionRate,
          netAmount,
          description: `Ride payment - ${ride.pickupAddress} to ${ride.dropoffAddress}`,
          processedAt: new Date(),
        },
      });

      // 3. Upsert driver wallet
      if (driverProfile?.id) {
        await tx.driverWallet.upsert({
          where: { driverProfileId: driverProfile.id },
          create: {
            driverProfileId: driverProfile.id,
            balance: netAmount,
          },
          update: {
            balance: { increment: netAmount },
          },
        });
      }
    });
  }
}
