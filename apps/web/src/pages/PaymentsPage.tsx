import { useState, useEffect, useCallback } from 'react';
import { Download, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { listTransactions } from '../api/payments';
import StatusBadge from '../components/StatusBadge';
import { exportToCsv } from '../utils/csv';
import type { Transaction } from '../types';

const TRANSACTION_TYPES = ['RIDE_PAYMENT', 'SUBSCRIPTION_FEE', 'REFUND', 'PAYOUT'];
const PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];
const PAYMENT_METHODS = ['CASH', 'GCASH', 'CREDIT_CARD'];

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.paymentMethod = methodFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await listTransactions(params);
      setTransactions(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter, methodFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params: any = { page: 1, limit: 1000 };
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.paymentMethod = methodFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await listTransactions(params);
      const headers = [
        'Transaction ID', 'Type', 'Amount (PHP)', 'Status', 'Payment Method',
        'Reference', 'Gross', 'Commission', 'Commission Rate', 'Net',
        'Rider', 'Driver', 'Ride', 'Date',
      ];
      const rows = res.data.map((t: Transaction) => [
        t.id,
        t.type,
        String(t.amount),
        t.status,
        t.paymentMethod,
        t.paymentReference ?? '',
        String(t.grossAmount ?? ''),
        String(t.commissionAmount ?? ''),
        t.commissionRate != null ? `${(t.commissionRate * 100).toFixed(0)}%` : '',
        String(t.netAmount ?? ''),
        t.rider ? [t.rider.firstName, t.rider.lastName].filter(Boolean).join(' ') : '',
        t.driver ? [t.driver.firstName, t.driver.lastName].filter(Boolean).join(' ') : '',
        t.ride ? `${t.ride.pickupAddress} → ${t.ride.dropoffAddress}` : '',
        new Date(t.createdAt).toLocaleString(),
      ]);
      exportToCsv('transactions.csv', headers, rows);
    } catch {
      // ignore
    } finally {
      setDownloading(false);
    }
  };

  const activeFilters: string[] = [];
  if (typeFilter) activeFilters.push(`Type: ${typeFilter}`);
  if (statusFilter) activeFilters.push(`Status: ${statusFilter}`);
  if (methodFilter) activeFilters.push(`Method: ${methodFilter}`);
  if (dateFrom) activeFilters.push(`From: ${dateFrom}`);
  if (dateTo) activeFilters.push(`To: ${dateTo}`);

  const clearFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setMethodFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const formatCurrency = (val: number | null) =>
    val != null ? `₱${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

  const formatName = (person: { firstName: string | null; lastName: string | null } | null) =>
    person ? [person.firstName, person.lastName].filter(Boolean).join(' ') || '—' : '—';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">{total} transaction{total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
              showFilters ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} /> Filters
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            <Download size={16} /> {downloading ? 'Exporting…' : 'Download CSV'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">All Types</option>
              {TRANSACTION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">All Statuses</option>
              {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="From" />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="To" />
          </div>
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeFilters.map((f) => (
                <span key={f} className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs">{f}</span>
              ))}
              <button onClick={clearFilters} className="text-gray-500 hover:text-gray-700 text-xs flex items-center gap-1">
                <X size={12} /> Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rider</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Driver</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Gross</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Commission</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Net</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No transactions found</td></tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {t.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatName(t.rider)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatName(t.driver)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        t.paymentMethod === 'CASH' ? 'bg-yellow-50 text-yellow-700' :
                        t.paymentMethod === 'GCASH' ? 'bg-blue-50 text-blue-700' :
                        'bg-purple-50 text-purple-700'
                      }`}>
                        {t.paymentMethod.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{formatCurrency(t.grossAmount)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-red-600">
                      {t.commissionAmount != null ? `-${formatCurrency(t.commissionAmount)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-emerald-700">
                      {formatCurrency(t.netAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-50"
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
