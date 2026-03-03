import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { listAuditLogs } from '../api/auditLogs';
import type { AuditLog } from '../types';

const LIMIT = 50;

const TARGET_TYPES = [
  'User',
  'DriverProfile',
  'Ride',
  'SosIncident',
  'DriverDocument',
  'Vehicle',
  'OtpCode',
  'Transaction',
  'Rating',
];

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function actorLabel(log: AuditLog): string {
  if (!log.actor) return '';
  const parts = [log.actor.firstName, log.actor.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : log.actorUserId ?? '';
}

function metadataPreview(metadata: Record<string, unknown> | null): string {
  if (!metadata) return '-';
  const str = JSON.stringify(metadata);
  return str.length > 60 ? str.slice(0, 60) + '...' : str;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof listAuditLogs>[0] = { page, limit: LIMIT };
      if (action) params.action = action;
      if (targetType) params.targetType = targetType;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await listAuditLogs(params);
      setLogs(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, action, targetType, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const rangeStart = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const rangeEnd = Math.min(page * LIMIT, total);

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
          <ClipboardList className="text-emerald-600" size={20} />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
          <input
            type="text"
            placeholder="Filter by action..."
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-52 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Target Type</label>
          <select
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All</option>
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No audit logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Timestamp</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Target Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Target ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block font-mono text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{log.targetType}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                      {log.targetId ? log.targetId.slice(0, 12) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.actor ? (
                        <span className="text-gray-900">{actorLabel(log)}</span>
                      ) : (
                        <span className="text-gray-400 italic">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate font-mono" title={log.metadata ? JSON.stringify(log.metadata) : undefined}>
                      {metadataPreview(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {rangeStart}-{rangeEnd} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
