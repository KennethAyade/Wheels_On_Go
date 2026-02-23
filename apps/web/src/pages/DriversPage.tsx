import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Search, Download } from 'lucide-react';
import { listDrivers } from '../api/drivers';
import StatusBadge from '../components/StatusBadge';
import type { DriverProfile, DriverDocument } from '../types';

function getApplicantStatus(driver: DriverProfile): string {
  if (driver.status === 'REJECTED') return 'Denied';
  if (driver.status === 'APPROVED') return 'Approved';
  // PENDING status — check documents
  const requiredTypes = ['LICENSE', 'GOVERNMENT_ID', 'PROFILE_PHOTO'];
  const uploadedTypes = driver.documents
    .filter((d) => d.status === 'UPLOADED')
    .map((d) => d.type);
  const pendingUploadTypes = driver.documents
    .filter((d) => d.status === 'PENDING_UPLOAD')
    .map((d) => d.type);

  if (requiredTypes.every((t) => uploadedTypes.includes(t as DriverDocument['type']))) {
    return 'For Admin Approval';
  }
  if (pendingUploadTypes.length > 0) {
    return 'Uploading Documents';
  }
  return 'Lacking Documents';
}

function getDriverOnlineStatus(driver: DriverProfile): string {
  if (!driver.isOnline) return 'Offline';
  return 'Online';
}

function driverName(driver: DriverProfile): string {
  return [driver.user.firstName, driver.user.lastName].filter(Boolean).join(' ') || 'Unknown';
}

export default function DriversPage() {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<DriverProfile[]>([]);
  const [registered, setRegistered] = useState<DriverProfile[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(true);
  const [loadingRegistered, setLoadingRegistered] = useState(true);
  const [applicantsOpen, setApplicantsOpen] = useState(true);
  const [registeredOpen, setRegisteredOpen] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      listDrivers({ status: 'PENDING', limit: 100 }),
      listDrivers({ status: 'REJECTED', limit: 100 }),
    ])
      .then(([pending, rejected]) => {
        setApplicants([...pending.data, ...rejected.data]);
      })
      .catch(() => {})
      .finally(() => setLoadingApplicants(false));

    listDrivers({ status: 'APPROVED', limit: 100 })
      .then((res) => setRegistered(res.data))
      .catch(() => {})
      .finally(() => setLoadingRegistered(false));
  }, []);

  const filteredApplicants = applicants.filter(
    (d) =>
      !search ||
      driverName(d).toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredRegistered = registered.filter(
    (d) =>
      !search ||
      driverName(d).toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Drivers</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            <Download size={16} /> Download
          </button>
        </div>
      </div>

      {/* Applicants Section */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4">
        <button
          onClick={() => setApplicantsOpen(!applicantsOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            {applicantsOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span className="font-semibold text-gray-900">Applicants</span>
            <span className="text-sm text-gray-500">({applicants.length})</span>
          </div>
        </button>

        {applicantsOpen && (
          <div className="border-t border-gray-200">
            {loadingApplicants ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filteredApplicants.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No applicants found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Reference Number</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Application Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplicants.map((driver) => (
                      <tr
                        key={driver.id}
                        onClick={() => navigate(`/drivers/${driver.id}`)}
                        className="border-b border-gray-50 hover:bg-emerald-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                          {driver.id.slice(0, 12)}...
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{driverName(driver)}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(driver.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={getApplicantStatus(driver)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Registered Section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => setRegisteredOpen(!registeredOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            {registeredOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span className="font-semibold text-gray-900">Registered</span>
            <span className="text-sm text-gray-500">({registered.length})</span>
          </div>
        </button>

        {registeredOpen && (
          <div className="border-t border-gray-200">
            {loadingRegistered ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filteredRegistered.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No registered drivers found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Driver ID</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Photo</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">License Number</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">License Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistered.map((driver) => {
                      const photo = driver.documents.find((d) => d.type === 'PROFILE_PHOTO');
                      return (
                        <tr
                          key={driver.id}
                          onClick={() => navigate(`/drivers/${driver.id}`)}
                          className="border-b border-gray-50 hover:bg-emerald-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                            {driver.id.slice(0, 12)}...
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{driverName(driver)}</td>
                          <td className="px-4 py-3">
                            {photo?.downloadUrl ? (
                              <img
                                src={photo.downloadUrl}
                                alt="Photo"
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                ?
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={getDriverOnlineStatus(driver)} />
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {driver.user ? '5' : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{driver.licenseNumber || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {driver.licenseExpiryDate
                              ? new Date(driver.licenseExpiryDate).toLocaleDateString()
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
