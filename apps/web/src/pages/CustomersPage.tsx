import { useState, useEffect, useCallback } from 'react';
import { Users, Search, X, MessageSquare } from 'lucide-react';
import { listUsers, suspendUser, reactivateUser } from '../api/users';
import CommentsDrawer from '../components/CommentsDrawer';
import type { CustomerUser } from '../types';

const LIMIT = 20;

function customerName(user: CustomerUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown';
}

interface SuspendDialogProps {
  user: CustomerUser;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}

function SuspendDialog({ user, onConfirm, onCancel, loading }: SuspendDialogProps) {
  const [reason, setReason] = useState('');
  const isValid = reason.trim().length >= 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Suspend Customer</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          You are about to suspend{' '}
          <span className="font-medium text-gray-900">{customerName(user)}</span>. Please provide a
          reason.
        </p>

        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Suspension Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Enter reason (min. 5 characters)..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            disabled={loading}
          />
          {reason.length > 0 && !isValid && (
            <p className="mt-1 text-xs text-red-500">Reason must be at least 5 characters.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={!isValid || loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Suspending...' : 'Confirm Suspend'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [suspendedFilter, setSuspendedFilter] = useState<'' | 'active' | 'suspended'>('');

  // Suspend dialog state
  const [suspendTarget, setSuspendTarget] = useState<CustomerUser | null>(null);
  const [suspendLoading, setSuspendLoading] = useState(false);

  // Action loading per row
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Messaging drawer state
  const [messageTarget, setMessageTarget] = useState<CustomerUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof listUsers>[0] = { page, limit: LIMIT };
      if (search) params.search = search;
      if (suspendedFilter === 'suspended') params.suspended = true;
      else if (suspendedFilter === 'active') params.suspended = false;

      const res = await listUsers(params);
      setUsers(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, suspendedFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, suspendedFilter]);

  const handleReactivate = async (user: CustomerUser) => {
    setActionLoading(user.id);
    try {
      const updated = await reactivateUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch {
      // silently fail — a toast system could be added here
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspendConfirm = async (reason: string) => {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    try {
      const updated = await suspendUser(suspendTarget.id, reason);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setSuspendTarget(null);
    } catch {
      // silently fail
    } finally {
      setSuspendLoading(false);
    }
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const rangeEnd = Math.min(page * LIMIT, total);

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Users size={20} className="text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm w-60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <select
            value={suspendedFilter}
            onChange={(e) => setSuspendedFilter(e.target.value as '' | 'active' | 'suspended')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-500">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading customers...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Total Rides</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Avg Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Joined Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Last Login</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{customerName(user)}</td>
                    <td className="px-4 py-3 text-gray-600">{user.phoneNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{user._count.ridesAsRider}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {user.averageRating != null ? user.averageRating.toFixed(1) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {user.isSuspended ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMessageTarget(user)}
                          title="Message customer"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <MessageSquare size={15} />
                        </button>
                        {user.isSuspended ? (
                          <button
                            onClick={() => handleReactivate(user)}
                            disabled={actionLoading === user.id}
                            className="px-3 py-1.5 border border-emerald-500 text-emerald-700 rounded-md text-xs font-medium hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {actionLoading === user.id ? 'Reactivating...' : 'Reactivate'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuspendTarget(user)}
                            disabled={actionLoading === user.id}
                            className="px-3 py-1.5 border border-red-400 text-red-600 rounded-md text-xs font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {rangeStart}-{rangeEnd} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 px-1">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suspend Dialog */}
      {suspendTarget && (
        <SuspendDialog
          user={suspendTarget}
          onConfirm={handleSuspendConfirm}
          onCancel={() => setSuspendTarget(null)}
          loading={suspendLoading}
        />
      )}

      {/* Comments Drawer */}
      {messageTarget && (
        <CommentsDrawer
          isOpen={!!messageTarget}
          onClose={() => setMessageTarget(null)}
          userId={messageTarget.id}
          userName={customerName(messageTarget)}
        />
      )}
    </div>
  );
}
