import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit.constants';
import {
  CreateRiderVehicleDto,
  UpdateRiderVehicleDto,
  RiderVehicleResponseDto,
} from './dto';

@Injectable()
export class RiderVehicleService {
  private readonly logger = new Logger(RiderVehicleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new rider vehicle
   */
  async createVehicle(
    userId: string,
    dto: CreateRiderVehicleDto,
  ): Promise<RiderVehicleResponseDto> {
    const riderProfile = await this.getRiderProfile(userId);

    // Check for duplicate plate number
    const existing = await this.prisma.riderVehicle.findUnique({
      where: { plateNumber: dto.plateNumber },
    });
    if (existing) {
      throw new ConflictException(
        `Vehicle with plate number ${dto.plateNumber} already exists`,
      );
    }

    // If this is the first vehicle or isDefault is true, handle default logic
    const isDefault = dto.isDefault ?? false;
    if (isDefault) {
      await this.clearDefaultVehicle(riderProfile.id);
    }

    // If no vehicles yet, make this the default
    const vehicleCount = await this.prisma.riderVehicle.count({
      where: { riderProfileId: riderProfile.id },
    });

    const vehicle = await this.prisma.riderVehicle.create({
      data: {
        riderProfileId: riderProfile.id,
        make: dto.make,
        model: dto.model,
        year: dto.year,
        color: dto.color,
        plateNumber: dto.plateNumber,
        vehicleType: dto.vehicleType ?? 'SEDAN',
        isDefault: isDefault || vehicleCount === 0,
      },
    });

    this.logger.log(
      `Vehicle created: ${vehicle.id} for rider ${riderProfile.id}`,
    );

    return this.mapToResponse(vehicle);
  }

  /**
   * List all vehicles for a rider
   */
  async getVehicles(userId: string): Promise<RiderVehicleResponseDto[]> {
    const riderProfile = await this.getRiderProfile(userId);

    const vehicles = await this.prisma.riderVehicle.findMany({
      where: { riderProfileId: riderProfile.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return vehicles.map((v) => this.mapToResponse(v));
  }

  /**
   * Get a single vehicle by ID
   */
  async getVehicleById(
    userId: string,
    vehicleId: string,
  ): Promise<RiderVehicleResponseDto> {
    const vehicle = await this.getOwnedVehicle(userId, vehicleId);
    return this.mapToResponse(vehicle);
  }

  /**
   * Update a vehicle
   */
  async updateVehicle(
    userId: string,
    vehicleId: string,
    dto: UpdateRiderVehicleDto,
  ): Promise<RiderVehicleResponseDto> {
    await this.getOwnedVehicle(userId, vehicleId);

    // Check plate number uniqueness if changing
    if (dto.plateNumber) {
      const existing = await this.prisma.riderVehicle.findUnique({
        where: { plateNumber: dto.plateNumber },
      });
      if (existing && existing.id !== vehicleId) {
        throw new ConflictException(
          `Vehicle with plate number ${dto.plateNumber} already exists`,
        );
      }
    }

    const updated = await this.prisma.riderVehicle.update({
      where: { id: vehicleId },
      data: dto,
    });

    return this.mapToResponse(updated);
  }

  /**
   * Delete a vehicle
   */
  async deleteVehicle(userId: string, vehicleId: string): Promise<void> {
    const vehicle = await this.getOwnedVehicle(userId, vehicleId);

    await this.prisma.riderVehicle.delete({
      where: { id: vehicleId },
    });

    // If deleted vehicle was default, make the most recent one default
    if (vehicle.isDefault) {
      const nextVehicle = await this.prisma.riderVehicle.findFirst({
        where: { riderProfileId: vehicle.riderProfileId },
        orderBy: { createdAt: 'desc' },
      });
      if (nextVehicle) {
        await this.prisma.riderVehicle.update({
          where: { id: nextVehicle.id },
          data: { isDefault: true },
        });
      }
    }

    this.logger.log(`Vehicle deleted: ${vehicleId}`);
  }

  /**
   * Set a vehicle as the default
   */
  async setDefaultVehicle(
    userId: string,
    vehicleId: string,
  ): Promise<RiderVehicleResponseDto> {
    const vehicle = await this.getOwnedVehicle(userId, vehicleId);

    await this.clearDefaultVehicle(vehicle.riderProfileId);

    const updated = await this.prisma.riderVehicle.update({
      where: { id: vehicleId },
      data: { isDefault: true },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Get rider profile for a user (throws if not found)
   */
  private async getRiderProfile(userId: string) {
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!riderProfile) {
      throw new NotFoundException('Rider profile not found');
    }
    return riderProfile;
  }

  /**
   * Get a vehicle and verify ownership
   */
  private async getOwnedVehicle(userId: string, vehicleId: string) {
    const riderProfile = await this.getRiderProfile(userId);

    const vehicle = await this.prisma.riderVehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    if (vehicle.riderProfileId !== riderProfile.id) {
      throw new ForbiddenException('You do not own this vehicle');
    }
    return vehicle;
  }

  /**
   * Clear default flag on all vehicles for a rider profile
   */
  private async clearDefaultVehicle(riderProfileId: string) {
    await this.prisma.riderVehicle.updateMany({
      where: { riderProfileId, isDefault: true },
      data: { isDefault: false },
    });
  }

  /**
   * Map Prisma model to response DTO
   */
  private mapToResponse(vehicle: any): RiderVehicleResponseDto {
    return {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      plateNumber: vehicle.plateNumber,
      vehicleType: vehicle.vehicleType,
      isDefault: vehicle.isDefault,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }
}
