import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, X, ZoomIn, ZoomOut, Check, XCircle } from 'lucide-react';
import { getDriverDetail, approveDriver, rejectDriver } from '../api/drivers';
import StatusBadge from '../components/StatusBadge';
import type { DriverProfile, DriverDocument } from '../types';

const docTypeLabels: Record<string, string> = {
  LICENSE: "Driver's License",
  GOVERNMENT_ID: 'Government ID',
  PROFILE_PHOTO: 'Profile Photo',
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
