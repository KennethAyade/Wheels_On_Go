import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { UserRole } from '@prisma/client';
import { RideService } from './ride.service';
import { DispatchGateway } from '../dispatch/dispatch.gateway';
import {
  CreateRideDto,
  CreateRideResponseDto,
  RideEstimateRequestDto,
  RideEstimateResponseDto,
  UpdateRideStatusDto,
  CancelRideDto,
  RideResponseDto,
} from './dto';

/**
 * Controller for ride management
 */
@Controller('rides')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RideController {
  constructor(
    private readonly rideService: RideService,
    private readonly dispatchGateway: DispatchGateway,
  ) {}

  /**
   * Create a new ride request
   * POST /rides
   * Requires: RIDER role
   */
  @Post()
  @Roles(UserRole.RIDER)
  async createRide(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateRideDto,
  ): Promise<CreateRideResponseDto> {
    const ride = await this.rideService.createRide(user.sub, dto);

    if (dto.selectedDriverId) {
      // Rider chose a specific driver — notify only that driver
      this.dispatchGateway.notifySelectedDriver(ride.id, dto.selectedDriverId).catch((err) => {
        console.error(`Selected driver notification failed for ride ${ride.id}:`, err);
      });

      // Fallback: if selected driver doesn't respond in 30s, auto-dispatch
      setTimeout(async () => {
        try {
          const currentRide = await this.rideService['prisma'].ride.findUnique({
            where: { id: ride.id },
            select: { status: true },
          });
          if (currentRide?.status === 'PENDING') {
            this.dispatchGateway.initiateDispatch(ride.id).catch((err) => {
              console.error(`Fallback dispatch failed for ride ${ride.id}:`, err);
            });
          }
        } catch (err) {
          console.error(`Fallback dispatch check failed for ride ${ride.id}:`, err);
        }
      }, 30_000);
    } else if (dto.rideType === 'INSTANT') {
      // Auto-dispatch for INSTANT rides (fire-and-forget)
      this.dispatchGateway.initiateDispatch(ride.id).catch((err) => {
        console.error(`Dispatch initiation failed for ride ${ride.id}:`, err);
      });
    }

    return ride;
  }

  /**
   * Get fare estimate for a ride
   * POST /rides/estimate
   * Available to all authenticated users
   */
  @Post('estimate')
  async getRideEstimate(
    @Body() dto: RideEstimateRequestDto,
  ): Promise<RideEstimateResponseDto> {
    return this.rideService.calculateEstimate(dto);
  }

  /**
   * Get active ride for current user
   * GET /rides/active
   */
  @Get('active')
  async getActiveRide(@CurrentUser() user: JwtUser): Promise<RideResponseDto | null> {
    return this.rideService.getActiveRide(user.sub);
  }

  /**
   * Get ride by ID
   * GET /rides/:id
   */
  @Get(':id')
  async getRideById(
    @CurrentUser() user: JwtUser,
    @Param('id') rideId: string,
  ): Promise<RideResponseDto> {
    return this.rideService.getRideById(rideId, user.sub);
  }

  /**
   * Update ride status
   * PATCH /rides/:id/status
   * Used by drivers and system
   */
  @Patch(':id/status')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  async updateRideStatus(
    @CurrentUser() user: JwtUser,
    @Param('id') rideId: string,
    @Body() dto: UpdateRideStatusDto,
  ): Promise<RideResponseDto> {
    return this.rideService.updateRideStatus(rideId, user.sub, dto);
  }

  /**
   * Cancel a ride
   * POST /rides/:id/cancel
   * Available to riders, drivers, and admins
   */
  @Post(':id/cancel')
  async cancelRide(
    @CurrentUser() user: JwtUser,
    @Param('id') rideId: string,
    @Body() dto: CancelRideDto,
  ): Promise<RideResponseDto> {
    return this.rideService.cancelRide(rideId, user.sub, dto);
  }
}
