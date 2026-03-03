import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2, TrendingUp, Users, DollarSign } from 'lucide-react';
import { getAnalyticsOverview, getDriverMetrics } from '../api/analytics';
import type { AnalyticsOverview, DriverMetrics } from '../types';

const DAY_OPTIONS = [
  { label: '7D', value: 7 },
  { label: '14D', value: 14 },
  { label: '30D', value: 30 },
];

function formatXAxisDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatRevenue(value: number): string {
  return `₱${value.toLocaleString()}`;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-48 bg-gray-100 rounded" />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="p-5 border-b border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-50">
          <div className="h-4 bg-gray-200 rounded flex-1" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [driverMetrics, setDriverMetrics] = useState<DriverMetrics | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [overviewError, setOverviewError] = useState(false);
  const [driversError, setDriversError] = useState(false);

  useEffect(() => {
    setLoadingOverview(true);
    setOverviewError(false);
    getAnalyticsOverview(days)
      .then(setOverview)
      .catch(() => setOverviewError(true))
      .finally(() => setLoadingOverview(false));
  }, [days]);

  useEffect(() => {
    setLoadingDrivers(true);
    setDriversError(false);
    getDriverMetrics()
      .then(setDriverMetrics)
      .catch(() => setDriversError(true))
      .finally(() => setLoadingDrivers(false));
  }, []);

  const series = overview?.series ?? [];

  const totalRides = series.reduce((sum, d) => sum + d.rides, 0);
  const totalRevenue = series.reduce((sum, d) => sum + d.revenue, 0);
  const avgRidesPerDay = series.length > 0 ? totalRides / series.length : 0;
  const avgRevenuePerDay = series.length > 0 ? totalRevenue / series.length : 0;

  const kpiCards = [
    {
      label: 'Total Rides',
      value: loadingOverview ? null : totalRides.toLocaleString(),
      icon: BarChart2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Total Revenue (PHP)',
      value: loadingOverview ? null : `₱${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Avg Rides / Day',
      value: loadingOverview ? null : avgRidesPerDay.toFixed(1),
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Avg Revenue / Day',
      value: loadingOverview ? null : `₱${Math.round(avgRevenuePerDay).toLocaleString()}`,
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>

        {/* Day range selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                days === opt.value
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {overviewError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-6 text-sm">
          Failed to load analytics overview. Please try refreshing the page.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {loadingOverview
            ? kpiCards.map((_, i) => <SkeletonCard key={i} />)
            : kpiCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col"
                  >
                    <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-3xl font-bold ${card.color}`}>
                        {card.value}
                      </span>
                      <div
                        className={`w-11 h-11 rounded-full ${card.bg} flex items-center justify-center`}
                      >
                        <Icon className={card.color} size={22} />
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      )}

      {/* Charts */}
      {loadingOverview ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : overviewError ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Rides Over Time */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Rides Over Time</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="ridesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d1fae5" stopOpacity={1} />
                    <stop offset="95%" stopColor="#d1fae5" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxisDate}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  labelFormatter={(label) => formatXAxisDate(String(label))}
                  formatter={(value: number) => [value.toLocaleString(), 'Rides']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rides"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#ridesGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#059669' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Over Time */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Revenue Over Time (₱)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ede9fe" stopOpacity={1} />
                    <stop offset="95%" stopColor="#ede9fe" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxisDate}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  labelFormatter={(label) => formatXAxisDate(String(label))}
                  formatter={(value: number) => [formatRevenue(value), 'Revenue']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#7c3aed' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Driver Metrics */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Driver Metrics</h2>

        {driversError ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
            Failed to load driver metrics. Please try refreshing the page.
          </div>
        ) : loadingDrivers ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
            </div>
            <SkeletonTable />
          </>
        ) : driverMetrics ? (
          <>
            {/* Driver Stat Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">Approval Rate</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {driverMetrics.approvalRate.toFixed(1)}%
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">Total Approved</p>
                <p className="text-3xl font-bold text-blue-600">
                  {driverMetrics.totalApproved.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">Pending Applications</p>
                <p className="text-3xl font-bold text-orange-600">
                  {driverMetrics.totalPending.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Top Drivers Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Top Drivers</h3>
              </div>
              {driverMetrics.topDrivers.length === 0 ? (
                <div className="p-10 text-center text-gray-500 text-sm">No driver data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Total Rides</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">
                          Completion Rate %
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">
                          Acceptance Rate %
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Avg Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverMetrics.topDrivers.map((driver) => {
                        const name =
                          [driver.user.firstName, driver.user.lastName]
                            .filter(Boolean)
                            .join(' ') || 'Unknown';
                        return (
                          <tr
                            key={driver.id}
                            className="border-b border-gray-50 hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                            <td className="px-4 py-3 text-gray-700">
                              {driver.totalRides.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  driver.completionRate >= 90
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : driver.completionRate >= 70
                                    ? 'bg-yellow-50 text-yellow-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {driver.completionRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  driver.acceptanceRate >= 80
                                    ? 'bg-blue-50 text-blue-700'
                                    : driver.acceptanceRate >= 60
                                    ? 'bg-yellow-50 text-yellow-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {driver.acceptanceRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {driver.user.averageRating != null
                                ? driver.user.averageRating.toFixed(2)
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
          </>
        ) : null}
      </div>
    </div>
  );
}
