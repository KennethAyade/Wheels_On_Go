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
  estimatedFare: number | null;
  totalFare: number;
  paymentMethod: string;
  createdAt: string;
  requestedAt: string;
  completedAt: string | null;
  rider: { id: string; firstName: string | null; lastName: string | null; phoneNumber: string };
  driver: { id: string; firstName: string | null; lastName: string | null } | null;
}
