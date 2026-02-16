import {
  Controller,
  Get,
  Post,
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
import { TrackingService } from './tracking.service';
import { UpdateLocationDto, LocationUpdateResponseDto } from './dto/update-location.dto';

/**
 * HTTP Controller for location tracking (fallback for WebSocket)
 */
@Controller('tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  /**
   * Update driver location (HTTP fallback for WebSocket)
   * POST /tracking/location
   * Requires: DRIVER role
   */
  @Post('location')
  @Roles(UserRole.DRIVER)
  async updateLocation(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateLocationDto,
  ): Promise<LocationUpdateResponseDto> {
    const result = await this.trackingService.updateDriverLocation(
      user.sub,
      dto,
    );

    return {
      success: result.updated,
      timestamp: new Date(),
      latitude: dto.latitude,
      longitude: dto.longitude,
    };
  }

  /**
   * Get driver's current location for a ride
   * GET /tracking/ride/:rideId/driver
   */
  @Get('ride/:rideId/driver')
  async getDriverLocation(@Param('rideId') rideId: string): Promise<any> {
    return this.trackingService.getDriverLocationBroadcast(rideId);
  }

  /**
   * Get driver's location history for a time range
   * GET /tracking/driver/:driverProfileId/history
   * Admin only
   */
  @Get('driver/:driverProfileId/history')
  @Roles(UserRole.ADMIN)
  async getLocationHistory(
    @Param('driverProfileId') driverProfileId: string,
  ): Promise<any[]> {
    // Default to last 24 hours
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    return this.trackingService.getLocationHistory(
      driverProfileId,
      startTime,
      endTime,
    );
  }
}
