import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Truck, Shield, CreditCard, Users, Download } from 'lucide-react';
import { getReportSummary } from '../api/reports';
import { exportToCsv } from '../utils/csv';
import type { ReportSummary } from '../types';

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

function prettyLabel(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="p-5 border-b border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-50">
          <div className="h-4 bg-gray-200 rounded flex-1" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
      ))}
    </div>
  );
}

// Stat card used across all sections
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-2xl font-bold ${color}`}>{value}</span>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center`}>
          <Icon className={color} size={22} />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-gray-900 mb-4 mt-8">{children}</h2>;
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  const styles: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    blue: 'bg-blue-50 text-blue-700',
    gray: 'bg-gray-100 text-gray-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[color] ?? styles.gray}`}>
      {label}
    </span>
  );
}

function rideStatusColor(status: string): string {
  if (status === 'COMPLETED') return 'emerald';
  if (status.startsWith('CANCELLED')) return 'red';
  if (status === 'PENDING' || status === 'EXPIRED') return 'yellow';
  return 'blue';
}

export default function ReportsPage() {
  const defaultTo = formatDate(new Date());
  const defaultFrom = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getReportSummary({ dateFrom, dateTo })
      .then(setReport)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  function handleExport() {
    if (!report) return;
    const { financial: f, operations: o, safety: s, subscriptions: sub, drivers: d } = report;

    const rows: string[][] = [
      // Financial
      ['--- Financial Summary ---', '', ''],
      ['Gross Revenue', formatCurrency(f.totalGrossRevenue), ''],
      ['Commission Earned', formatCurrency(f.totalCommission), ''],
      ['Net Payouts', formatCurrency(f.totalNetPayouts), ''],
      ['Total Transactions', String(f.totalTransactions), ''],
      ['Average Fare', formatCurrency(f.averageFare), ''],
      ['', '', ''],
      ['Payment Method', 'Count', 'Total'],
      ...f.revenueByMethod.map((m) => [prettyLabel(m.method), String(m.count), formatCurrency(m.total)]),
      ['', '', ''],
      ['Transaction Type', 'Count', 'Total'],
      ...f.revenueByType.map((t) => [prettyLabel(t.type), String(t.count), formatCurrency(t.total)]),
      ['', '', ''],
      // Operations
      ['--- Ride Operations ---', '', ''],
      ['Total Rides', String(o.totalRides), ''],
      ['Completed', String(o.completedRides), ''],
      ['Cancelled', String(o.cancelledRides), ''],
      ['Completion Rate', `${o.completionRate}%`, ''],
      ['Avg Distance (km)', String(o.averageDistance), ''],
      ['Avg Duration (min)', String(o.averageDuration), ''],
      ['', '', ''],
      ['Status', 'Count', ''],
      ...o.ridesByStatus.map((r) => [prettyLabel(r.status), String(r.count), '']),
      ['', '', ''],
      // Safety
      ['--- Safety & Compliance ---', '', ''],
      ['Breathalyzer Tests', String(s.breathalyzerTests), ''],
      ['Passed', String(s.breathalyzerPassed), ''],
      ['Failed', String(s.breathalyzerFailed), ''],
      ['Invalid', String(s.breathalyzerInvalid), ''],
      ['BLOWBAGETS Completed', String(s.blowbagetsCompleted), ''],
      ['Fatigue Checks', String(s.fatigueChecks), ''],
      ['Fatigue Cooldowns', String(s.fatigueCooldowns), ''],
      ['SOS Incidents', String(s.sosIncidents), ''],
      ['SOS Resolved', String(s.sosResolved), ''],
      ['', '', ''],
      // Subscriptions
      ['--- Subscriptions ---', '', ''],
      ['Active Subscribers', String(sub.activeSubscribers), ''],
      ['New Subscriptions', String(sub.newSubscriptions), ''],
      ['Cancelled', String(sub.cancelledSubscriptions), ''],
      ['Revenue', formatCurrency(sub.subscriptionRevenue), ''],
      ['', '', ''],
      ['Plan', 'Subscribers', 'Revenue'],
      ...sub.byPlan.map((p) => [p.planName, String(p.count), formatCurrency(p.revenue)]),
      ['', '', ''],
      // Drivers
      ['--- Drivers ---', '', ''],
      ['Approved', String(d.totalApproved), ''],
      ['Online Now', String(d.totalOnline), ''],
      ['Total Wallet Balance', formatCurrency(d.totalWalletBalance), ''],
      ['', '', ''],
      ['Top Earner', 'Rides', 'Earnings'],
      ...d.topEarners.map((e) => [e.name, String(e.rides), formatCurrency(e.earnings)]),
    ];

    exportToCsv(`wog-report-${dateFrom}-to-${dateTo}.csv`, ['Metric', 'Value', 'Extra'], rows);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-500">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={!report || loading}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-6 text-sm">
          Failed to load report data. Please try adjusting the date range or refreshing the page.
        </div>
      )}

      {/* ─── Financial Summary ─── */}
      <SectionTitle>Financial Summary</SectionTitle>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Gross Revenue" value={formatCurrency(report.financial.totalGrossRevenue)} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50" />
            <StatCard label="Commission Earned" value={formatCurrency(report.financial.totalCommission)} icon={TrendingUp} color="text-purple-600" bg="bg-purple-50" />
            <StatCard label="Net Payouts" value={formatCurrency(report.financial.totalNetPayouts)} icon={CreditCard} color="text-blue-600" bg="bg-blue-50" />
            <StatCard label="Average Fare" value={formatCurrency(report.financial.averageFare)} icon={DollarSign} color="text-orange-600" bg="bg-orange-50" sub={`${report.financial.totalTransactions} transactions`} />
          </div>

          {/* Revenue breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* By payment method */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Revenue by Payment Method</h3>
              </div>
              {report.financial.revenueByMethod.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Count</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.financial.revenueByMethod.map((m) => (
                      <tr key={m.method} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{prettyLabel(m.method)}</td>
                        <td className="px-4 py-3 text-gray-700 text-right">{m.count.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-700 text-right">{formatCurrency(m.total)}</td>
                        <td className="px-4 py-3 text-right">
                          <StatusBadge label={pct(m.total, report.financial.totalGrossRevenue)} color="emerald" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* By transaction type */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Revenue by Transaction Type</h3>
              </div>
              {report.financial.revenueByType.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Count</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.financial.revenueByType.map((t) => (
                      <tr key={t.type} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{prettyLabel(t.type)}</td>
                        <td className="px-4 py-3 text-gray-700 text-right">{t.count.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-700 text-right">{formatCurrency(t.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── Ride Operations ─── */}
      <SectionTitle>Ride Operations</SectionTitle>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Rides" value={report.operations.totalRides.toLocaleString()} icon={Truck} color="text-emerald-600" bg="bg-emerald-50" />
            <StatCard label="Completed" value={report.operations.completedRides.toLocaleString()} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50" />
            <StatCard label="Cancelled" value={report.operations.cancelledRides.toLocaleString()} icon={Truck} color="text-red-600" bg="bg-red-50" />
            <StatCard
              label="Completion Rate"
              value={`${report.operations.completionRate}%`}
              icon={TrendingUp}
              color={report.operations.completionRate >= 80 ? 'text-emerald-600' : report.operations.completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'}
              bg={report.operations.completionRate >= 80 ? 'bg-emerald-50' : report.operations.completionRate >= 60 ? 'bg-yellow-50' : 'bg-red-50'}
              sub={`${report.operations.averageDistance} km avg · ${report.operations.averageDuration} min avg`}
            />
          </div>

          {/* Rides by status table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Rides by Status</h3>
            </div>
            {report.operations.ridesByStatus.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No ride data</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Count</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {report.operations.ridesByStatus.map((r) => (
                    <tr key={r.status} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <StatusBadge label={prettyLabel(r.status)} color={rideStatusColor(r.status)} />
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-right">{r.count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{pct(r.count, report.operations.totalRides)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ─── Safety & Compliance ─── */}
      <SectionTitle>Safety & Compliance</SectionTitle>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Breathalyzer Pass Rate"
            value={report.safety.breathalyzerTests > 0
              ? pct(report.safety.breathalyzerPassed, report.safety.breathalyzerTests)
              : 'N/A'}
            icon={Shield}
            color="text-emerald-600"
            bg="bg-emerald-50"
            sub={`${report.safety.breathalyzerPassed}/${report.safety.breathalyzerTests} passed · ${report.safety.breathalyzerFailed} failed`}
          />
          <StatCard
            label="BLOWBAGETS Completed"
            value={report.safety.blowbagetsCompleted.toLocaleString()}
            icon={Shield}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <StatCard
            label="Fatigue Checks"
            value={report.safety.fatigueChecks.toLocaleString()}
            icon={Shield}
            color="text-purple-600"
            bg="bg-purple-50"
            sub={`${report.safety.fatigueCooldowns} triggered cooldowns`}
          />
          <StatCard
            label="SOS Incidents"
            value={report.safety.sosIncidents.toLocaleString()}
            icon={Shield}
            color={report.safety.sosIncidents > 0 ? 'text-red-600' : 'text-emerald-600'}
            bg={report.safety.sosIncidents > 0 ? 'bg-red-50' : 'bg-emerald-50'}
            sub={`${report.safety.sosResolved} resolved`}
          />
        </div>
      )}

      {/* ─── Subscriptions ─── */}
      <SectionTitle>Subscriptions</SectionTitle>
      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
          <div className="mt-4"><SkeletonTable /></div>
        </>
      ) : report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Subscribers" value={report.subscriptions.activeSubscribers.toLocaleString()} icon={Users} color="text-emerald-600" bg="bg-emerald-50" />
            <StatCard label="New Subscriptions" value={report.subscriptions.newSubscriptions.toLocaleString()} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50" />
            <StatCard label="Cancelled" value={report.subscriptions.cancelledSubscriptions.toLocaleString()} icon={Users} color="text-orange-600" bg="bg-orange-50" />
            <StatCard label="Subscription Revenue" value={formatCurrency(report.subscriptions.subscriptionRevenue)} icon={DollarSign} color="text-purple-600" bg="bg-purple-50" />
          </div>

          {/* Plan breakdown */}
          {report.subscriptions.byPlan.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Breakdown by Plan</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Subscribers</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Est. Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.subscriptions.byPlan.map((p) => (
                    <tr key={p.planName} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.planName}</td>
                      <td className="px-4 py-3 text-gray-700 text-right">{p.count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-700 text-right">{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── Drivers ─── */}
      <SectionTitle>Driver Overview</SectionTitle>
      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
          <div className="mt-4"><SkeletonTable /></div>
        </>
      ) : report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Approved Drivers" value={report.drivers.totalApproved.toLocaleString()} icon={Users} color="text-emerald-600" bg="bg-emerald-50" />
            <StatCard label="Online Now" value={report.drivers.totalOnline.toLocaleString()} icon={Users} color="text-blue-600" bg="bg-blue-50" />
            <StatCard label="Total Wallet Balance" value={formatCurrency(report.drivers.totalWalletBalance)} icon={DollarSign} color="text-purple-600" bg="bg-purple-50" />
          </div>

          {/* Top earners */}
          {report.drivers.topEarners.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Top Earners (Period)</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Driver</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Rides</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {report.drivers.topEarners.map((e, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                      <td className="px-4 py-3 text-gray-700 text-right">{e.rides.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-emerald-700">{formatCurrency(e.earnings)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="h-8" />
    </div>
  );
}
