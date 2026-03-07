import { useState, useEffect, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { getRatings } from '../api/ratings';
import type { AdminRating, AdminRatingsResponse } from '../types';

function StarRating({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          className={i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'}
        />
      ))}
      <span className="ml-1 text-xs text-gray-600">{Number(value).toFixed(1)}</span>
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number | null | string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
    </div>
  );
}

function userName(user: { firstName: string | null; lastName: string | null }) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown';
}

export default function RatingsPage() {
  const [data, setData] = useState<AdminRatingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getRatings({ page, limit: 20, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const agg = data?.aggregates;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Ratings &amp; Reviews</h1>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs text-gray-500 mr-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mr-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total Ratings" value={agg?.totalRatings ?? '—'} />
        <StatCard label="Overall Avg" value={agg?.averageRating != null ? Number(agg.averageRating).toFixed(2) : null} />
        <StatCard label="Punctuality Avg" value={agg?.averagePunctuality != null ? Number(agg.averagePunctuality).toFixed(2) : null} />
        <StatCard label="Safety Avg" value={agg?.averageSafety != null ? Number(agg.averageSafety).toFixed(2) : null} />
        <StatCard label="Cleanliness Avg" value={agg?.averageCleanliness != null ? Number(agg.averageCleanliness).toFixed(2) : null} />
        <StatCard label="Communication Avg" value={agg?.averageCommunication != null ? Number(agg.averageCommunication).toFixed(2) : null} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-12 text-center text-gray-500">
            Failed to load ratings.{' '}
            <button onClick={fetch} className="text-emerald-600 underline">Retry</button>
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No ratings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reviewer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reviewee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ride ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Overall</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">P / S / Cl / Co</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Review</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((r: AdminRating) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{userName(r.reviewer)}</td>
                    <td className="px-4 py-3 text-gray-700">{userName(r.reviewee)}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.rideId.slice(0, 10)}…</td>
                    <td className="px-4 py-3">
                      <StarRating value={r.rating} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {[r.punctualityRating, r.safetyRating, r.cleanlinessRating, r.communicationRating]
                        .map((v) => (v != null ? Number(v).toFixed(1) : '—'))
                        .join(' / ')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={r.review ?? ''}>
                      {r.review || <span className="text-gray-400 italic">No review</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-700">{page} / {data.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
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
