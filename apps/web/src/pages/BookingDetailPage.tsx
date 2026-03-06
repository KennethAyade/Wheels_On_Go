import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Car, Star, AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { getBooking, cancelBooking } from '../api/bookings';
import StatusBadge from '../components/StatusBadge';
import type { BookingDetail } from '../types';

const CANCELLABLE_STATUSES = ['PENDING', 'ACCEPTED', 'DRIVER_ARRIVED', 'STARTED'];

const SOS_TYPE_COLORS: Record<string, string> = {
  EMERGENCY: 'bg-red-100 text-red-800',
  ACCIDENT: 'bg-orange-100 text-orange-800',
  HARASSMENT: 'bg-purple-100 text-purple-800',
  VEHICLE_BREAKDOWN: 'bg-yellow-100 text-yellow-800',
  OTHER: 'bg-gray-100 text-gray-700',
};

const SOS_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-red-100 text-red-800',
  ACKNOWLEDGED: 'bg-blue-100 text-blue-800',
  RESPONDING: 'bg-cyan-100 text-cyan-800',
  RESOLVED: 'bg-green-100 text-green-800',
  FALSE_ALARM: 'bg-gray-100 text-gray-700',
};

function formatTs(ts: string | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return '—';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters} m`;
}

function StarDisplay({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={14}
          className={i < Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
        />
      ))}
    </span>
  );
}

function SubRatingBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const pct = Math.round((value / 5) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-500 w-32 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-emerald-500 h-1.5 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-gray-700 font-medium w-6 text-right">{value}</span>
    </div>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dispatchOpen, setDispatchOpen] = useState(false);

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    if (!id) return;
    getBooking(id)
      .then(setBooking)
      .catch(() => setError('Failed to load booking'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!id) return;
    setCancelLoading(true);
    setCancelError('');
    try {
      const updated = await cancelBooking(id, cancelReason.trim() || undefined);
      setBooking((prev) => prev ? { ...prev, status: updated.status, cancellationReason: updated.cancellationReason } : prev);
      setShowCancelDialog(false);
      setCancelReason('');
    } catch {
      setCancelError('Failed to cancel booking. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20 text-gray-500">
        {error || 'Booking not found'}
      </div>
    );
  }

  const riderName = [booking.rider.firstName, booking.rider.lastName].filter(Boolean).join(' ') || 'Unknown';
  const driverName = booking.driver
    ? [booking.driver.firstName, booking.driver.lastName].filter(Boolean).join(' ') || 'Unknown'
    : null;

  const canCancel = CANCELLABLE_STATUSES.includes(booking.status);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/bookings')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-mono text-sm text-gray-500 break-all">{booking.id}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Created {formatTs(booking.createdAt)}
          </p>
        </div>
        {canCancel && (
          <button
            onClick={() => setShowCancelDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Cancel Booking
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md mb-4 text-sm">{error}</div>
      )}

      {booking.cancellationReason && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4 text-sm text-red-700">
          <span className="font-medium">Cancellation reason:</span> {booking.cancellationReason}
        </div>
      )}

      {/* Two-column: Ride Info + People */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Ride Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-emerald-600" />
            <h2 className="font-semibold text-gray-900">Ride Information</h2>
          </div>

          <div className="space-y-3 text-sm">
            {/* Pickup / Dropoff */}
            <div className="space-y-2">
              <div className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div className="w-px flex-1 bg-gray-200 my-0.5" />
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Pickup</p>
                    <p className="text-gray-900">{booking.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Dropoff</p>
                    <p className="text-gray-900">{booking.dropoffAddress}</p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Fare Breakdown */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fare Breakdown</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>Base fare</span>
                  <span>₱{Number(booking.baseFare ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Per km</span>
                  <span>₱{Number(booking.costPerKm ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Per minute</span>
                  <span>₱{Number(booking.costPerMin ?? 0).toFixed(2)}</span>
                </div>
                {booking.surgePricing != null && booking.surgePricing > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Surge</span>
                    <span>+₱{Number(booking.surgePricing).toFixed(2)}</span>
                  </div>
                )}
                {booking.promoDiscount != null && booking.promoDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Promo discount</span>
                    <span>-₱{Number(booking.promoDiscount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1.5">
                  <span>Total</span>
                  <span>₱{Number(booking.totalFare).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Payment */}
            <div className="flex justify-between">
              <span className="text-gray-500">Payment method</span>
              <span className="text-gray-900 font-medium">{booking.paymentMethod.replace(/_/g, ' ')}</span>
            </div>
            {booking.paymentStatus && (
              <div className="flex justify-between">
                <span className="text-gray-500">Payment status</span>
                <span className="text-gray-900">{booking.paymentStatus.replace(/_/g, ' ')}</span>
              </div>
            )}

            <hr className="border-gray-100" />

            {/* Distance & Duration */}
            <div className="flex justify-between">
              <span className="text-gray-500">Distance</span>
              <span className="text-gray-900">
                {booking.actualDistance != null
                  ? formatDistance(booking.actualDistance)
                  : booking.route
                    ? formatDistance(booking.route.distanceMeters)
                    : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span className="text-gray-900">
                {booking.actualDuration != null
                  ? formatDuration(booking.actualDuration)
                  : booking.route
                    ? formatDuration(booking.route.durationSeconds)
                    : '—'}
              </span>
            </div>

            <hr className="border-gray-100" />

            {/* Timestamps */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <span className="inline-flex items-center gap-1"><Clock size={12} /> Timestamps</span>
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Requested</span>
                  <span className="text-gray-700">{formatTs(booking.requestedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Accepted</span>
                  <span className="text-gray-700">{formatTs(booking.acceptedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Driver arrived</span>
                  <span className="text-gray-700">{formatTs(booking.driverArrivedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Started</span>
                  <span className="text-gray-700">{formatTs(booking.startedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Completed</span>
                  <span className="text-gray-700">{formatTs(booking.completedAt)}</span>
                </div>
                {booking.cancelledAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cancelled</span>
                    <span className="text-red-600">{formatTs(booking.cancelledAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* People */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-emerald-600" />
            <h2 className="font-semibold text-gray-900">People</h2>
          </div>

          {/* Rider */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Rider</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="text-gray-900 font-medium">{riderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="text-gray-900">{booking.rider.phoneNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Rating</span>
                {booking.rider.averageRating != null ? (
                  <span className="flex items-center gap-1.5">
                    <StarDisplay value={booking.rider.averageRating} />
                    <span className="text-gray-700 text-xs">{booking.rider.averageRating.toFixed(1)}</span>
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Driver */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Driver</p>
            {booking.driver ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="text-gray-900 font-medium">{driverName}</span>
                </div>
                {booking.driver.phoneNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="text-gray-900">{booking.driver.phoneNumber}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Rating</span>
                  {booking.driver.averageRating != null ? (
                    <span className="flex items-center gap-1.5">
                      <StarDisplay value={booking.driver.averageRating} />
                      <span className="text-gray-700 text-xs">{booking.driver.averageRating.toFixed(1)}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                {booking.driverProfile && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total rides</span>
                      <span className="text-gray-900">{booking.driverProfile.totalRides}</span>
                    </div>
                    {booking.driverProfile.completionRate != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Completion rate</span>
                        <span className="text-gray-900">
                          {(booking.driverProfile.completionRate * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No driver assigned</p>
            )}
          </div>
        </div>
      </div>

      {/* Vehicle */}
      {booking.vehicle && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Car size={16} className="text-emerald-600" />
            <h2 className="font-semibold text-gray-900">Vehicle</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-sm">
            <div className="flex justify-between col-span-2 md:col-span-1">
              <span className="text-gray-500">Make / Model / Year</span>
              <span className="text-gray-900 font-medium ml-4">
                {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Color</span>
              <span className="text-gray-900">{booking.vehicle.color}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Plate</span>
              <span className="text-gray-900 font-mono">{booking.vehicle.plateNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="text-gray-900">{booking.vehicle.vehicleType.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Rating */}
      {booking.rating && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} className="text-emerald-600" />
            <h2 className="font-semibold text-gray-900">Ride Rating</h2>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <StarDisplay value={booking.rating.rating} />
            <span className="text-2xl font-bold text-gray-900">{booking.rating.rating.toFixed(1)}</span>
            <span className="text-sm text-gray-400">/ 5</span>
          </div>
          <div className="space-y-2 mb-4">
            <SubRatingBar label="Punctuality" value={booking.rating.punctualityRating} />
            <SubRatingBar label="Safety" value={booking.rating.safetyRating} />
            <SubRatingBar label="Cleanliness" value={booking.rating.cleanlinessRating} />
            <SubRatingBar label="Communication" value={booking.rating.communicationRating} />
          </div>
          {booking.rating.review && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700 italic">
              "{booking.rating.review}"
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">{formatTs(booking.rating.createdAt)}</p>
        </div>
      )}

      {/* SOS Incident */}
      {booking.sosIncident && (
        <div className="bg-white rounded-xl border border-red-100 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-red-600" />
            <h2 className="font-semibold text-gray-900">SOS Incident</h2>
          </div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SOS_TYPE_COLORS[booking.sosIncident.incidentType] ?? 'bg-gray-100 text-gray-700'}`}>
              {booking.sosIncident.incidentType.replace(/_/g, ' ')}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SOS_STATUS_COLORS[booking.sosIncident.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {booking.sosIncident.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            {booking.sosIncident.description && (
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0">Description</span>
                <span className="text-gray-900">{booking.sosIncident.description}</span>
              </div>
            )}
            {booking.sosIncident.address && (
              <div className="flex justify-between">
                <span className="text-gray-500">Address</span>
                <span className="text-gray-900 text-right max-w-xs">{booking.sosIncident.address}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Triggered at</span>
              <span className="text-gray-900">{formatTs(booking.sosIncident.createdAt)}</span>
            </div>
            {booking.sosIncident.respondedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Responded at</span>
                <span className="text-gray-900">{formatTs(booking.sosIncident.respondedAt)}</span>
              </div>
            )}
            {booking.sosIncident.resolvedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Resolved at</span>
                <span className="text-gray-900">{formatTs(booking.sosIncident.resolvedAt)}</span>
              </div>
            )}
            {booking.sosIncident.resolutionNotes && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 mt-2">
                <span className="font-medium text-gray-600">Resolution notes: </span>
                {booking.sosIncident.resolutionNotes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dispatch Attempts */}
      {booking.dispatchAttempts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <button
            onClick={() => setDispatchOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-emerald-600" />
              <span className="font-semibold text-gray-900">Dispatch Attempts</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {booking.dispatchAttempts.length}
              </span>
            </div>
            {dispatchOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          </button>

          {dispatchOpen && (
            <div className="border-t border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 font-medium text-gray-600">#</th>
                    <th className="px-5 py-3 font-medium text-gray-600">Sent at</th>
                    <th className="px-5 py-3 font-medium text-gray-600">Result</th>
                    <th className="px-5 py-3 font-medium text-gray-600">Distance to pickup</th>
                    <th className="px-5 py-3 font-medium text-gray-600">Decline reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {booking.dispatchAttempts.map((attempt, idx) => (
                    <tr key={attempt.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-5 py-3 text-gray-700">{formatTs(attempt.sentAt)}</td>
                      <td className="px-5 py-3">
                        {attempt.accepted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Accepted
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Declined
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{formatDistance(attempt.distanceToPickup)}</td>
                      <td className="px-5 py-3 text-gray-500">{attempt.declineReason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirm Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Booking</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-1 resize-none"
            />
            {cancelError && (
              <p className="text-xs text-red-600 mb-3">{cancelError}</p>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => { setShowCancelDialog(false); setCancelReason(''); setCancelError(''); }}
                disabled={cancelLoading}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Go back
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
