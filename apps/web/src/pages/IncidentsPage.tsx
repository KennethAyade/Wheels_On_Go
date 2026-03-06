import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Search, X } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { listIncidents, updateIncident } from '../api/incidents';
import type { SosIncident } from '../types';

const INCIDENT_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'FALSE_ALARM'] as const;
type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

const INCIDENT_TYPES = ['EMERGENCY', 'ACCIDENT', 'HARASSMENT', 'VEHICLE_BREAKDOWN', 'OTHER'] as const;
type IncidentType = (typeof INCIDENT_TYPES)[number];

// Status badge styling
const STATUS_BADGE: Record<IncidentStatus, string> = {
  ACTIVE:       'bg-red-100 text-red-700',
  ACKNOWLEDGED: 'bg-yellow-100 text-yellow-700',
  RESPONDING:   'bg-blue-100 text-blue-700',
  RESOLVED:     'bg-green-100 text-green-700',
  FALSE_ALARM:  'bg-gray-100 text-gray-600',
};

// Type badge styling
const TYPE_BADGE: Record<IncidentType, string> = {
  EMERGENCY:         'bg-red-100 text-red-700',
  ACCIDENT:          'bg-orange-100 text-orange-700',
  HARASSMENT:        'bg-purple-100 text-purple-700',
  VEHICLE_BREAKDOWN: 'bg-yellow-100 text-yellow-700',
  OTHER:             'bg-gray-100 text-gray-600',
};

// Valid status transitions from a given current status
const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  ACTIVE:       ['ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'FALSE_ALARM'],
  ACKNOWLEDGED: ['RESPONDING', 'RESOLVED', 'FALSE_ALARM'],
  RESPONDING:   ['RESOLVED', 'FALSE_ALARM'],
  RESOLVED:     [],
  FALSE_ALARM:  [],
};

const NOTES_REQUIRED: IncidentStatus[] = ['RESOLVED', 'FALSE_ALARM'];

function statusBadgeClass(status: string): string {
  return STATUS_BADGE[status as IncidentStatus] ?? 'bg-gray-100 text-gray-600';
}

function typeBadgeClass(type: string): string {
  return TYPE_BADGE[type as IncidentType] ?? 'bg-gray-100 text-gray-600';
}

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

function userName(incident: SosIncident): string {
  if (!incident.user) return '—';
  return [incident.user.firstName, incident.user.lastName].filter(Boolean).join(' ') || incident.user.phoneNumber;
}

// ---- Update Status Modal --------------------------------------------------------

interface UpdateModalProps {
  incident: SosIncident;
  onClose: () => void;
  onUpdated: (updated: SosIncident) => void;
}

function UpdateStatusModal({ incident, onClose, onUpdated }: UpdateModalProps) {
  const transitions = STATUS_TRANSITIONS[incident.status as IncidentStatus] ?? [];
  const [newStatus, setNewStatus] = useState<string>(transitions[0] ?? '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const notesRequired = NOTES_REQUIRED.includes(newStatus as IncidentStatus);

  const handleConfirm = async () => {
    if (!newStatus) {
      setError('Please select a new status.');
      return;
    }
    if (notesRequired && !notes.trim()) {
      setError('Resolution notes are required for this status.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateIncident(incident.id, {
        status: newStatus,
        resolutionNotes: notes.trim() || undefined,
      });
      onUpdated(updated);
    } catch {
      setError('Failed to update incident. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Update Incident Status</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-5 py-4 space-y-4">
          {/* Current status */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Current Status</p>
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(incident.status)}`}
            >
              {formatLabel(incident.status)}
            </span>
          </div>

          {transitions.length === 0 ? (
            <p className="text-sm text-gray-500">
              This incident is already in a terminal state and cannot be updated further.
            </p>
          ) : (
            <>
              {/* New status selector */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  New Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => { setNewStatus(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {transitions.map((s) => (
                    <option key={s} value={s}>{formatLabel(s)}</option>
                  ))}
                </select>
              </div>

              {/* Resolution notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Resolution Notes{notesRequired && <span className="text-red-500"> *</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setError(''); }}
                  rows={3}
                  placeholder={notesRequired ? 'Required for this status…' : 'Optional notes…'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          {transitions.length > 0 && (
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ------------------------------------------------------------------

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<SosIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal
  const [selectedIncident, setSelectedIncident] = useState<SosIncident | null>(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof listIncidents>[0] = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await listIncidents(params);
      setIncidents(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      // ignore — keep stale data visible
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const clearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const activeFilterCount =
    (statusFilter ? 1 : 0) +
    (typeFilter ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0);

  const handleUpdated = (updated: SosIncident) => {
    setIncidents((prev) => prev.map((inc) => (inc.id === updated.id ? updated : inc)));
    setSelectedIncident(null);
  };

  const showingFrom = total === 0 ? 0 : (page - 1) * 20 + 1;
  const showingTo = Math.min(page * 20, total);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle size={22} className="text-red-500" />
          <h1 className="text-xl font-bold text-gray-900">SOS Incidents</h1>
          {total > 0 && (
            <span className="text-sm text-gray-500">({total})</span>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Status filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All</option>
              {INCIDENT_STATUSES.map((s) => (
                <option key={s} value={s}>{formatLabel(s)}</option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All</option>
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>{formatLabel(t)}</option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              <X size={14} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading…</div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center">
            <Search size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No incidents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Ride ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Address</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Created At</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => {
                  const createdAt = new Date(incident.createdAt);
                  const isTerminal =
                    incident.status === 'RESOLVED' || incident.status === 'FALSE_ALARM';
                  return (
                    <tr key={incident.id} className="border-b border-gray-50 hover:bg-gray-50">
                      {/* ID */}
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                        {incident.id.slice(0, 12)}…
                      </td>

                      {/* Type badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadgeClass(incident.incidentType)}`}
                        >
                          {formatLabel(incident.incidentType)}
                        </span>
                      </td>

                      {/* User */}
                      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                        {userName(incident)}
                      </td>

                      {/* Ride ID */}
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                        {incident.rideId ? `${incident.rideId.slice(0, 12)}…` : '—'}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(incident.status)}`}
                        >
                          {formatLabel(incident.status)}
                        </span>
                      </td>

                      {/* Address */}
                      <td
                        className="px-4 py-3 text-gray-600 max-w-48 truncate"
                        title={incident.address ?? undefined}
                      >
                        {incident.address || '—'}
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {createdAt.toLocaleDateString()}{' '}
                        <span className="text-gray-400">
                          {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedIncident(incident)}
                          disabled={isTerminal}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                            isTerminal
                              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                              : 'border-emerald-500 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {(totalPages > 1 || total > 0) && !loading && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {total === 0
                ? 'No results'
                : `Showing ${showingFrom}–${showingTo} of ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-700">
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Update Status Modal */}
      {selectedIncident && (
        <UpdateStatusModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
