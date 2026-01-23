import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    actorUserId: string | null,
    action: string,
    targetType: string,
    targetId?: string | null,
    metadata?: Prisma.InputJsonValue,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: actorUserId ?? undefined,
          action,
          targetType,
          targetId: targetId ?? undefined,
          metadata,
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
}
