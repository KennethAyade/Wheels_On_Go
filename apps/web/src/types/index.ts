export interface AdminUser {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
}

export interface DashboardStats {
  activeRides: number;
  onlineDrivers: number;
  totalRiders: number;
  pendingVerifications: number;
  todayRevenue: number;
  driversFaceEnrolled: number;
  driversOnCooldown: number;
}

export type FatigueLevel = 'NORMAL' | 'MILD' | 'MODERATE' | 'SEVERE';

export interface FatigueLog {
  id: string;
  detectedAt: string;
  fatigueLevel: FatigueLevel;
  isFatigued: boolean;
  confidence: number | null;
  reasons: string[];
  leftEyeProbability: number;
  rightEyeProbability: number;
  avgEyeProbability: number;
  cooldownMinutes: number | null;
  isOnRide: boolean;
}

export interface DriverDocument {
  id: string;
  driverProfileId: string;
  type: 'LICENSE' | 'GOVERNMENT_ID' | 'PROFILE_PHOTO';
  storageKey: string;
  fileName: string;
  mimeType: string;
  status: 'PENDING_UPLOAD' | 'UPLOADED' | 'REJECTED';
  size: number | null;
  uploadedAt: string | null;
  downloadUrl: string | null;
  createdAt: string;
}

export interface DriverUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string;
  email: string | null;
  createdAt: string;
}

export interface DriverVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  vehicleType: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason: string | null;
  isOnline: boolean;
  licenseNumber: string | null;
  licenseExpiryDate: string | null;
  totalRides: number;
  createdAt: string;
  user: DriverUser;
  documents: DriverDocument[];
  vehicle: DriverVehicle | null;
  // AI Safety / Fatigue Detection fields
  faceEnrolledAt?: string | null;
  lastFatigueCheckAt?: string | null;
  lastFatigueLevel?: FatigueLevel | null;
  fatigueCooldownUntil?: string | null;
  fatigueDetectionLogs?: FatigueLog[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Booking {
  id: string;
  riderId: string;
  driverId: string | null;
  rideType: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  estimatedFare: number | null;
  totalFare: number;
  baseFare?: number;
  costPerKm?: number;
  costPerMin?: number;
  surgePricing?: number | null;
  promoDiscount?: number | null;
  actualDistance?: number | null;
  actualDuration?: number | null;
  paymentMethod: string;
  paymentStatus?: string;
  cancellationReason?: string | null;
  createdAt: string;
  requestedAt: string;
  acceptedAt?: string | null;
  driverArrivedAt?: string | null;
  startedAt?: string | null;
  completedAt: string | null;
  cancelledAt?: string | null;
  rider: { id: string; firstName: string | null; lastName: string | null; phoneNumber: string; averageRating?: number | null };
  driver: { id: string; firstName: string | null; lastName: string | null; phoneNumber?: string | null; averageRating?: number | null } | null;
}

export interface BookingDetail extends Booking {
  driverProfile: {
    id: string;
    licenseNumber: string | null;
    totalRides: number;
    completionRate: number | null;
  } | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    vehicleType: string;
  } | null;
  rating: {
    id: string;
    rating: number;
    review: string | null;
    punctualityRating: number | null;
    safetyRating: number | null;
    cleanlinessRating: number | null;
    communicationRating: number | null;
    createdAt: string;
  } | null;
  sosIncident: SosIncident | null;
  dispatchAttempts: Array<{
    id: string;
    sentAt: string;
    accepted: boolean;
    declineReason: string | null;
    distanceToPickup: number;
  }>;
  route: {
    encodedPolyline: string;
    distanceMeters: number;
    durationSeconds: number;
  } | null;
}

// Analytics types
export interface AnalyticsDataPoint {
  date: string;
  rides: number;
  revenue: number;
  newUsers: number;
}

export interface AnalyticsOverview {
  series: AnalyticsDataPoint[];
  totalDays: number;
}

export interface DriverMetrics {
  approvalRate: number;
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  topDrivers: Array<{
    id: string;
    totalRides: number;
    completionRate: number;
    acceptanceRate: number;
    user: { firstName: string | null; lastName: string | null; averageRating: number | null };
  }>;
}

// Customer/User management types
export interface CustomerUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string;
  isActive: boolean;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
  averageRating: number | null;
  totalRatings: number;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { ridesAsRider: number };
}

// SOS Incident types
export interface SosIncident {
  id: string;
  userId: string;
  rideId: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  incidentType: 'EMERGENCY' | 'ACCIDENT' | 'HARASSMENT' | 'VEHICLE_BREAKDOWN' | 'OTHER';
  description: string | null;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESPONDING' | 'RESOLVED' | 'FALSE_ALARM';
  emergencyContactsNotified: string[];
  notifiedAt: string | null;
  respondedAt: string | null;
  responderUserId: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; firstName: string | null; lastName: string | null; phoneNumber: string };
  ride?: { id: string; pickupAddress: string; dropoffAddress: string } | null;
}

// Audit Log types
export interface AuditLog {
  id: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor?: { id: string; firstName: string | null; lastName: string | null; role: string } | null;
}

// Rating types
export interface AdminRating {
  id: string;
  rideId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  review: string | null;
  punctualityRating: number | null;
  safetyRating: number | null;
  cleanlinessRating: number | null;
  communicationRating: number | null;
  isRiderToDriver: boolean;
  createdAt: string;
  reviewer: { id: string; firstName: string | null; lastName: string | null };
  reviewee: { id: string; firstName: string | null; lastName: string | null };
  ride: { id: string; pickupAddress: string; dropoffAddress: string };
}

export interface AdminRatingsResponse {
  aggregates: {
    averageRating: number | null;
    averagePunctuality: number | null;
    averageSafety: number | null;
    averageCleanliness: number | null;
    averageCommunication: number | null;
    totalRatings: number;
  };
  data: AdminRating[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
