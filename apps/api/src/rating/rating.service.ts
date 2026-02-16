import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RideStatus } from '@prisma/client';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingService {
  constructor(private readonly prisma: PrismaService) {}

  async createRating(userId: string, dto: CreateRatingDto) {
    // Verify ride exists and is completed
    const ride = await this.prisma.ride.findUnique({
      where: { id: dto.rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('Can only rate completed rides');
    }

    if (ride.riderId !== userId) {
      throw new BadRequestException('Only the rider can rate this ride');
    }

    if (!ride.driverId) {
      throw new BadRequestException('No driver assigned to this ride');
    }

    // Check for existing rating (unique constraint on rideId)
    const existingRating = await this.prisma.rating.findUnique({
      where: { rideId: dto.rideId },
    });

    if (existingRating) {
      throw new ConflictException('This ride has already been rated');
    }

    // Create the rating
    const rating = await this.prisma.rating.create({
      data: {
        rideId: dto.rideId,
        reviewerId: userId,
        revieweeId: ride.driverId,
        rating: dto.rating,
        review: dto.review,
        punctualityRating: dto.punctualityRating,
        safetyRating: dto.safetyRating,
        cleanlinessRating: dto.cleanlinessRating,
        communicationRating: dto.communicationRating,
        isRiderToDriver: true,
      },
    });

    // Recalculate driver's average rating
    const allRatings = await this.prisma.rating.findMany({
      where: { revieweeId: ride.driverId, isRiderToDriver: true },
      select: { rating: true },
    });

    const totalRatings = allRatings.length;
    const avgRating =
      allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

    await this.prisma.user.update({
      where: { id: ride.driverId },
      data: {
        averageRating: Math.round(avgRating * 10) / 10,
        totalRatings,
      },
    });

    return rating;
  }
}
