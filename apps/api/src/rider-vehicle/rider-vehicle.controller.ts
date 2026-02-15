import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
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
    @Request() req,
    @Body() dto: CreateRiderVehicleDto,
  ): Promise<RiderVehicleResponseDto> {
    return this.riderVehicleService.createVehicle(req.user.userId, dto);
  }

  /**
   * List all rider's vehicles
   * GET /rider-vehicles
   */
  @Get()
  async getVehicles(@Request() req): Promise<RiderVehicleResponseDto[]> {
    return this.riderVehicleService.getVehicles(req.user.userId);
  }

  /**
   * Get vehicle by ID
   * GET /rider-vehicles/:id
   */
  @Get(':id')
  async getVehicleById(
    @Request() req,
    @Param('id') vehicleId: string,
  ): Promise<RiderVehicleResponseDto> {
    return this.riderVehicleService.getVehicleById(req.user.userId, vehicleId);
  }

  /**
   * Update a vehicle
   * PATCH /rider-vehicles/:id
   */
  @Patch(':id')
  async updateVehicle(
    @Request() req,
    @Param('id') vehicleId: string,
    @Body() dto: UpdateRiderVehicleDto,
  ): Promise<RiderVehicleResponseDto> {
    return this.riderVehicleService.updateVehicle(
      req.user.userId,
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
    @Request() req,
    @Param('id') vehicleId: string,
  ): Promise<void> {
    return this.riderVehicleService.deleteVehicle(req.user.userId, vehicleId);
  }

  /**
   * Set a vehicle as default
   * PATCH /rider-vehicles/:id/default
   */
  @Patch(':id/default')
  async setDefaultVehicle(
    @Request() req,
    @Param('id') vehicleId: string,
  ): Promise<RiderVehicleResponseDto> {
    return this.riderVehicleService.setDefaultVehicle(
      req.user.userId,
      vehicleId,
    );
  }
}
