import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
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
    @Request() req,
    @Body() dto: CreateRideDto,
  ): Promise<CreateRideResponseDto> {
    const ride = await this.rideService.createRide(req.user.userId, dto);

    // Auto-dispatch for INSTANT rides (fire-and-forget)
    if (dto.rideType === 'INSTANT') {
      this.dispatchGateway.initiateDispatch(ride.id).catch((err) => {
        // Log but don't fail the ride creation
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
  async getActiveRide(@Request() req): Promise<RideResponseDto | null> {
    return this.rideService.getActiveRide(req.user.userId);
  }

  /**
   * Get ride by ID
   * GET /rides/:id
   */
  @Get(':id')
  async getRideById(
    @Request() req,
    @Param('id') rideId: string,
  ): Promise<RideResponseDto> {
    return this.rideService.getRideById(rideId, req.user.userId);
  }

  /**
   * Update ride status
   * PATCH /rides/:id/status
   * Used by drivers and system
   */
  @Patch(':id/status')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  async updateRideStatus(
    @Request() req,
    @Param('id') rideId: string,
    @Body() dto: UpdateRideStatusDto,
  ): Promise<RideResponseDto> {
    return this.rideService.updateRideStatus(rideId, req.user.userId, dto);
  }

  /**
   * Cancel a ride
   * POST /rides/:id/cancel
   * Available to riders, drivers, and admins
   */
  @Post(':id/cancel')
  async cancelRide(
    @Request() req,
    @Param('id') rideId: string,
    @Body() dto: CancelRideDto,
  ): Promise<RideResponseDto> {
    return this.rideService.cancelRide(rideId, req.user.userId, dto);
  }
}
