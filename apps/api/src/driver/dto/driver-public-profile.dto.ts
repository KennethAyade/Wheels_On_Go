export class DriverReviewDto {
  rating: number;
  review: string | null;
  reviewerFirstName: string | null;
  createdAt: Date;
  punctualityRating: number | null;
  safetyRating: number | null;
  cleanlinessRating: number | null;
  communicationRating: number | null;
}

export class DriverPublicVehicleDto {
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  vehicleType: string;
  seatingCapacity: number;
  registrationExpiry: Date | null;
  insuranceExpiry: Date | null;
}

export class DriverPublicProfileDto {
  driverProfileId: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  profilePhotoUrl: string | null;
  isOnline: boolean;
  isVerified: boolean;

  // Driver Information
  licenseNumber: string | null;
  licenseExpiryDate: Date | null;
  memberSince: Date;

  // Safety & Verification
  nbiClearance: boolean;
  drugTest: boolean;
  healthCertificate: boolean;
  idVerified: boolean;
  fatigueDetection: boolean;

  // Activity Summary
  totalRides: number;
  averageRating: number | null;
  totalRatings: number;
  acceptanceRate: number | null;
  completionRate: number | null;

  // Vehicle
  vehicle: DriverPublicVehicleDto | null;

  // Reviews
  reviews: DriverReviewDto[];
}
