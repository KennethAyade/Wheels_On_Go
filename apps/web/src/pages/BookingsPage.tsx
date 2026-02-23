import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { listBookings } from '../api/bookings';
import StatusBadge from '../components/StatusBadge';
import type { Booking } from '../types';

const RIDE_STATUSES = [
  'PENDING', 'ACCEPTED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED',
  'CANCELLED_BY_RIDER', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_SYSTEM', 'EXPIRED',
];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await listBookings(params);
      setBookings(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const activeFilters: string[] = [];
  if (statusFilter) activeFilters.push(`Status: ${statusFilter}`);
  if (dateFrom || dateTo) activeFilters.push(`Date: ${dateFrom || '...'} - ${dateTo || '...'}`);

  const clearFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Bookings</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm ${
              activeFilters.length > 0
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} /> Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search booking ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            <Download size={16} /> Download
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All</option>
              {RIDE_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          {activeFilters.length > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && !showFilters && (
        <div className="flex items-center gap-2 mb-4">
          {activeFilters.map((f) => (
            <span key={f} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">
              {f}
              <button onClick={clearFilters}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No bookings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Booking ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Booking Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Booking Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pick up point</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Drop off point</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fare</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Driver</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const date = new Date(booking.createdAt);
                  const driverName = booking.driver
                    ? [booking.driver.firstName, booking.driver.lastName].filter(Boolean).join(' ')
                    : '-';
                  return (
                    <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {booking.id.slice(0, 12)}...
                      </td>
                      <td className="px-4 py-3 text-gray-900">{date.toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-40 truncate" title={booking.pickupAddress}>
                        {booking.pickupAddress}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-40 truncate" title={booking.dropoffAddress}>
                        {booking.dropoffAddress}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        ₱{Number(booking.totalFare).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{driverName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
