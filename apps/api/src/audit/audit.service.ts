import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from './audit.constants';

/**
 * Audit log parameters interface
 * Supports both object-style and positional-style parameters
 */
interface AuditLogParams {
  actorUserId?: string | null;
  action: AuditAction | string;
  targetType: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit event
   * Supports both object-style and positional-style parameters for backwards compatibility
   */
  async log(params: AuditLogParams): Promise<void>;
  async log(
    actorUserId: string | null,
    action: string,
    targetType: string,
    targetId?: string | null,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void>;

  async log(
    paramsOrActorUserId: AuditLogParams | string | null,
    action?: string,
    targetType?: string,
    targetId?: string | null,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    // Normalize parameters to object-style
    const params: AuditLogParams =
      typeof paramsOrActorUserId === 'object' && paramsOrActorUserId !== null
        ? paramsOrActorUserId
        : {
            actorUserId: paramsOrActorUserId as string | null,
            action: action!,
            targetType: targetType!,
            targetId: targetId ?? undefined,
            metadata,
          };

    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId ?? undefined,
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId ?? undefined,
          metadata: {
            ...(params.metadata as object),
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        this.logger.warn(`Audit log skipped: ${error.message}`);
      } else {
        this.logger.error('Failed to write audit log', error as Error);
      }
    }
  }

  /**
   * Convenience method for logging payment-related events
   */
  async logPayment(
    userId: string,
    action: AuditAction,
    transactionId: string,
    metadata: object,
  ) {
    return this.log({
      actorUserId: userId,
      action,
      targetType: 'Transaction',
      targetId: transactionId,
      metadata,
    });
  }

  /**
   * Convenience method for logging SOS incidents
   */
  async logSosIncident(
    userId: string,
    action: AuditAction,
    sosId: string,
    metadata: object,
  ) {
    return this.log({
      actorUserId: userId,
      action,
      targetType: 'SosIncident',
      targetId: sosId,
      metadata,
    });
  }

  /**
   * Convenience method for logging payout events
   */
  async logPayout(
    driverId: string,
    action: AuditAction,
    payoutId: string,
    metadata: object,
  ) {
    return this.log({
      actorUserId: driverId,
      action,
      targetType: 'Payout',
      targetId: payoutId,
      metadata,
    });
  }

  /**
   * Convenience method for logging ride cancellations
   */
  async logRideCancellation(
    userId: string,
    action: AuditAction,
    rideId: string,
    metadata: object,
  ) {
    return this.log({
      actorUserId: userId,
      action,
      targetType: 'Ride',
      targetId: rideId,
      metadata,
    });
  }

  /**
   * Convenience method for logging driver suspensions
   */
  async logDriverSuspension(
    adminUserId: string,
    action: AuditAction,
    driverProfileId: string,
    metadata: object,
  ) {
    return this.log({
      actorUserId: adminUserId,
      action,
      targetType: 'DriverProfile',
      targetId: driverProfileId,
      metadata,
    });
  }

  /**
   * Convenience method for logging PII access (GDPR compliance)
   */
  async logPiiAccess(
    accessorUserId: string,
    targetUserId: string,
    metadata: object,
  ) {
    return this.log({
      actorUserId: accessorUserId,
      action: AuditAction.PII_ACCESS,
      targetType: 'User',
      targetId: targetUserId,
      metadata,
    });
  }

  /**
   * Convenience method for logging data export requests (GDPR compliance)
   */
  async logDataExport(userId: string, action: AuditAction, metadata: object) {
    return this.log({
      actorUserId: userId,
      action,
      targetType: 'User',
      targetId: userId,
      metadata,
    });
  }
}
