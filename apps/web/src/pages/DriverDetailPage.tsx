import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, X, ZoomIn, ZoomOut, Check, XCircle } from 'lucide-react';
import { getDriverDetail, approveDriver, rejectDriver } from '../api/drivers';
import StatusBadge from '../components/StatusBadge';
import type { DriverProfile, DriverDocument, FatigueLevel } from '../types';

const docTypeLabels: Record<string, string> = {
  LICENSE: "Driver's License",
  GOVERNMENT_ID: 'Government ID',
  PROFILE_PHOTO: 'Profile Photo',
};

const fatigueLevelColor = (level: FatigueLevel | null | undefined) => {
  switch (level) {
    case 'NORMAL':   return 'bg-green-100 text-green-800';
    case 'MILD':     return 'bg-yellow-100 text-yellow-800';
    case 'MODERATE': return 'bg-orange-100 text-orange-800';
    case 'SEVERE':   return 'bg-red-100 text-red-800';
    default:         return 'bg-gray-100 text-gray-600';
  }
};

const cooldownRemaining = (until: string | null | undefined): string => {
  if (!until) return 'None';
  const diff = new Date(until).getTime() - Date.now();
  if (diff <= 0) return 'None';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `Active — ${h}h ${m}m remaining` : `Active — ${m}m remaining`;
};

export default function DriverDetailPage() {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewDoc, setViewDoc] = useState<DriverDocument | null>(null);
  const [zoom, setZoom] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!driverId) return;
    getDriverDetail(driverId)
      .then(setDriver)
      .catch(() => setError('Failed to load driver'))
      .finally(() => setLoading(false));
  }, [driverId]);

  const handleApprove = async () => {
    if (!driverId) return;
    setActionLoading(true);
    try {
      const updated = await approveDriver(driverId);
      setDriver(updated);
    } catch {
      setError('Failed to approve driver');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!driverId || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const updated = await rejectDriver(driverId, rejectReason);
      setDriver(updated);
      setShowRejectDialog(false);
      setRejectReason('');
    } catch {
      setError('Failed to reject driver');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-20 text-gray-500">
        {error || 'Driver not found'}
      </div>
    );
  }

  const name = [driver.user.firstName, driver.user.lastName].filter(Boolean).join(' ') || 'Unknown';
  const requiredDocs: DriverDocument['type'][] = ['LICENSE', 'GOVERNMENT_ID', 'PROFILE_PHOTO'];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/drivers')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{name}</h1>
          <p className="text-sm text-gray-500">{driver.user.phoneNumber}</p>
        </div>
        <StatusBadge status={driver.status} />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md mb-4 text-sm">{error}</div>
      )}

      {/* Driver Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Driver Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Application Date</span>
              <span className="text-gray-900">{new Date(driver.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">License Number</span>
              <span className="text-gray-900">{driver.licenseNumber || 'Not provided'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">License Expiry</span>
              <span className="text-gray-900">
                {driver.licenseExpiryDate
                  ? new Date(driver.licenseExpiryDate).toLocaleDateString()
                  : 'Not provided'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Rides</span>
              <span className="text-gray-900">{driver.totalRides}</span>
            </div>
            {driver.rejectionReason && (
              <div className="flex justify-between">
                <span className="text-gray-500">Rejection Reason</span>
                <span className="text-red-600">{driver.rejectionReason}</span>
              </div>
            )}
          </div>
        </div>

        {driver.vehicle && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Vehicle Information</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Vehicle</span>
                <span className="text-gray-900">
                  {driver.vehicle.year} {driver.vehicle.make} {driver.vehicle.model}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Color</span>
                <span className="text-gray-900">{driver.vehicle.color}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Plate Number</span>
                <span className="text-gray-900">{driver.vehicle.plateNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="text-gray-900">{driver.vehicle.vehicleType}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Safety Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">AI Safety Status</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
          {/* Left — Enrollment & Last Check */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Face Enrollment</span>
              {driver.faceEnrolledAt ? (
                <span className="flex items-center gap-1 text-green-700 font-medium">
                  <Check size={14} />
                  Enrolled &middot; {new Date(driver.faceEnrolledAt).toLocaleString()}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-400">
                  <X size={14} />
                  Not Enrolled
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Last Fatigue Check</span>
              <span className="text-gray-900">
                {driver.lastFatigueCheckAt
                  ? new Date(driver.lastFatigueCheckAt).toLocaleString()
                  : 'Never'}
              </span>
            </div>
          </div>
          {/* Right — Level & Cooldown */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Fatigue Level</span>
              {driver.lastFatigueLevel ? (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${fatigueLevelColor(driver.lastFatigueLevel)}`}>
                  {driver.lastFatigueLevel}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Cooldown</span>
              <span className={
                cooldownRemaining(driver.fatigueCooldownUntil) !== 'None'
                  ? 'text-orange-700 font-medium'
                  : 'text-gray-900'
              }>
                {cooldownRemaining(driver.fatigueCooldownUntil)}
              </span>
            </div>
          </div>
        </div>

        {/* Fatigue Detection History */}
        {driver.fatigueDetectionLogs && driver.fatigueDetectionLogs.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Detection History (Last 10)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 pr-4 font-medium">Date / Time</th>
                    <th className="pb-2 pr-4 font-medium">Level</th>
                    <th className="pb-2 pr-4 font-medium">Eye Score</th>
                    <th className="pb-2 pr-4 font-medium">Confidence</th>
                    <th className="pb-2 pr-4 font-medium">Reasons</th>
                    <th className="pb-2 font-medium">On Ride</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {driver.fatigueDetectionLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-600">
                        {new Date(log.detectedAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${fatigueLevelColor(log.fatigueLevel)}`}>
                          {log.fatigueLevel}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-600">
                        {(log.avgEyeProbability * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 pr-4 text-gray-600">
                        {log.confidence != null ? `${(log.confidence * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="py-2 pr-4 text-gray-600 max-w-[200px]">
                        {log.reasons.length > 0 ? log.reasons.join(', ') : '—'}
                      </td>
                      <td className="py-2 text-gray-600">
                        {log.isOnRide ? (
                          <span className="text-orange-600 font-medium">Yes</span>
                        ) : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Documents</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {requiredDocs.map((type) => {
            const doc = driver.documents.find((d) => d.type === type);
            return (
              <div
                key={type}
                className="border border-gray-200 rounded-lg p-4 flex flex-col items-center"
              >
                <FileText className="text-gray-400 mb-2" size={32} />
                <p className="font-medium text-sm text-gray-900 mb-1">{docTypeLabels[type]}</p>
                {doc ? (
                  <>
                    <StatusBadge status={doc.status} />
                    {doc.uploadedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    )}
                    {doc.downloadUrl && (
                      <button
                        onClick={() => { setViewDoc(doc); setZoom(1); }}
                        className="mt-3 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium hover:bg-emerald-100 transition-colors"
                      >
                        View Document
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-gray-400 mt-1">Not uploaded</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      {(driver.status === 'PENDING' || driver.status === 'REJECTED') && (
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Check size={18} />
            Approve Driver
          </button>
          <button
            onClick={() => setShowRejectDialog(true)}
            disabled={actionLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <XCircle size={18} />
            Reject Driver
          </button>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold">{docTypeLabels[viewDoc.type]}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 hover:bg-gray-100 rounded"
                >
                  <ZoomOut size={18} />
                </button>
                <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 hover:bg-gray-100 rounded"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  onClick={() => setViewDoc(null)}
                  className="p-1.5 hover:bg-gray-100 rounded ml-2"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100">
              <img
                src={viewDoc.downloadUrl!}
                alt={docTypeLabels[viewDoc.type]}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                className="max-w-full transition-transform"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Driver</h3>
            <p className="text-sm text-gray-600 mb-3">
              Please provide a reason for rejecting this driver application.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowRejectDialog(false); setRejectReason(''); }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
