import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DispatchGateway } from '../dispatch/dispatch.gateway';
import { RideStatus, RideType } from '@prisma/client';

@Injectable()
export class ScheduledRideService {
  private readonly logger = new Logger(ScheduledRideService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchGateway: DispatchGateway,
  ) {}

  /**
   * Runs every 60 seconds. Finds SCHEDULED rides approaching their pickup time
   * (within 15 minutes) and initiates dispatch for them.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledDispatch(): Promise<void> {
    const now = new Date();
    const dispatchWindow = new Date(now.getTime() + 15 * 60 * 1000); // 15 min ahead
    const staleThreshold = new Date(now.getTime() - 10 * 60 * 1000); // 10 min ago

    const ridesToDispatch = await this.prisma.ride.findMany({
      where: {
        rideType: RideType.SCHEDULED,
        status: RideStatus.PENDING,
        driverSearchAttempts: 0, // Not yet dispatched
        scheduledPickupTime: {
          lte: dispatchWindow, // Pickup time is within 15 min
          gt: staleThreshold, // Not too old
        },
      },
      select: {
        id: true,
        riderId: true,
        scheduledPickupTime: true,
      },
    });

    if (ridesToDispatch.length === 0) return;

    this.logger.log(
      `Found ${ridesToDispatch.length} scheduled ride(s) ready for dispatch`,
    );

    for (const ride of ridesToDispatch) {
      try {
        // Notify rider that dispatch is starting
        this.dispatchGateway.notifyRider(
          ride.riderId,
          'scheduled_ride:dispatching',
          {
            rideId: ride.id,
            scheduledPickupTime: ride.scheduledPickupTime,
          },
        );

        // Initiate the standard dispatch flow
        await this.dispatchGateway.initiateDispatch(ride.id);

        this.logger.log(
          `Dispatch initiated for scheduled ride ${ride.id} (pickup at ${ride.scheduledPickupTime})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to dispatch scheduled ride ${ride.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Runs every 5 minutes. Expires SCHEDULED rides whose pickup time
   * has passed without being dispatched or accepted.
   */
  @Cron('0 */5 * * * *')
  async handleScheduledExpiration(): Promise<void> {
    const expirationThreshold = new Date(
      Date.now() - 15 * 60 * 1000, // 15 min past pickup time
    );

    const expiredRides = await this.prisma.ride.findMany({
      where: {
        rideType: RideType.SCHEDULED,
        status: RideStatus.PENDING,
        scheduledPickupTime: {
          lt: expirationThreshold,
        },
      },
      select: {
        id: true,
        riderId: true,
      },
    });

    if (expiredRides.length === 0) return;

    this.logger.log(
      `Expiring ${expiredRides.length} overdue scheduled ride(s)`,
    );

    for (const ride of expiredRides) {
      try {
        await this.prisma.ride.update({
          where: { id: ride.id },
          data: {
            status: RideStatus.EXPIRED,
            cancelledAt: new Date(),
            cancellationReason: 'Scheduled ride expired - no driver found',
          },
        });

        this.dispatchGateway.notifyRider(
          ride.riderId,
          'scheduled_ride:expired',
          { rideId: ride.id },
        );

        this.logger.log(`Scheduled ride ${ride.id} expired`);
      } catch (error) {
        this.logger.error(
          `Failed to expire scheduled ride ${ride.id}: ${error.message}`,
        );
      }
    }
  }
}
