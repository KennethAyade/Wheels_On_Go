import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { UserRole } from '@prisma/client';
import { RiderVehicleService } from './rider-vehicle.service';
import {
  CreateRiderVehicleDto,
  UpdateRiderVehicleDto,
  RiderVehicleResponseDto,
} from './dto';

/**
 * Controller for managing rider-owned vehicles
 * Riders register their own cars here so drivers can be dispatched to drive them
 */
@Controller('rider-vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RIDER)
export class RiderVehicleController {
  constructor(private readonly riderVehicleService: RiderVehicleService) {}

  /**
   * Register a new vehicle
   * POST /rider-vehicles
   */
  @Post()
  async createVehicle(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateRiderVehicleDto,
  ): Promise<RiderVehicleResponseDto> {
    return this.riderVehicleService.createVehicle(user.sub, dto);
  }

  /**
   * List all rider's vehicles
   * GET /rider-vehicles
   */
  @Get()
  async getVehicles(@CurrentUser() user: JwtUser): Promise<RiderVehicleResponseDto[]> {
    return this.riderVehicleService.getVehicles(user.sub);
  }

  /**
   * Get vehicle by ID
   * GET /rider-vehicles/:id
   */
  @Get(':id')
  async getVehicleById(
    @CurrentUser() user: JwtUser,
    @Param('id') vehicleId: string,
  ): Promise<RiderVehicleResponseDto> {
    return this.riderVehicleService.getVehicleById(user.sub, vehicleId);
  }

  /**
   * Update a vehicle
   * PATCH /rider-vehicles/:id
   */
  @Patch(':id')
  async updateVehicle(
    @CurrentUser() user: JwtUser,
    @Param('id') vehicleId: string,
    @Body() dto: UpdateRiderVehicleDto,
  ): Promise<RiderVehicleResponseDto> {
    return this.riderVehicleService.updateVehicle(
      user.sub,
      vehicleId,
      dto,
    );
  }

  /**
   * Delete a vehicle
   * DELETE /rider-vehicles/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVehicle(
    @CurrentUser() user: JwtUser,
    @Param('id') vehicleId: string,
  ): Promise<void> {
    return this.riderVehicleService.deleteVehicle(user.sub, vehicleId);
  }

  /**
   * Set a vehicle as default
   * PATCH /rider-vehicles/:id/default
   */
  @Patch(':id/default')
  async setDefaultVehicle(
    @CurrentUser() user: JwtUser,
    @Param('id') vehicleId: string,
  ): Promise<RiderVehicleResponseDto> {
    return this.riderVehicleService.setDefaultVehicle(
      user.sub,
      vehicleId,
    );
  }
}
