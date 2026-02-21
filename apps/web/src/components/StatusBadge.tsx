const colorMap: Record<string, string> = {
  // Driver statuses
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-gray-100 text-gray-800',
  // Applicant display statuses
  'For Admin Approval': 'bg-blue-100 text-blue-800',
  'Uploading Documents': 'bg-yellow-100 text-yellow-800',
  'Lacking Documents': 'bg-orange-100 text-orange-800',
  Denied: 'bg-red-100 text-red-800',
  // Ride statuses
  STARTED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-cyan-100 text-cyan-800',
  DRIVER_ARRIVED: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED_BY_RIDER: 'bg-red-100 text-red-800',
  CANCELLED_BY_DRIVER: 'bg-red-100 text-red-800',
  CANCELLED_BY_SYSTEM: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  // Driver online status
  Online: 'bg-green-100 text-green-800',
  Offline: 'bg-gray-100 text-gray-800',
  Driving: 'bg-blue-100 text-blue-800',
};

const labelMap: Record<string, string> = {
  STARTED: 'In Travel',
  ACCEPTED: 'Finding Driver',
  DRIVER_ARRIVED: 'Driver Arrived',
  CANCELLED_BY_RIDER: 'Cancelled',
  CANCELLED_BY_DRIVER: 'Cancelled',
  CANCELLED_BY_SYSTEM: 'Cancelled',
};

export default function StatusBadge({ status }: { status: string }) {
  const colors = colorMap[status] || 'bg-gray-100 text-gray-700';
  const label = labelMap[status] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`}>
      {label}
    </span>
  );
}
