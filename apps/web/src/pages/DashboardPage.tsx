import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, DollarSign, Users, Shield, MapPin, ScanFace, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getStats } from '../api/dashboard';
import { getAnalyticsOverview } from '../api/analytics';
import type { DashboardStats, AnalyticsDataPoint } from '../types';

const defaultStats: DashboardStats = {
  activeRides: 0,
  onlineDrivers: 0,
  totalRiders: 0,
  pendingVerifications: 0,
  totalRevenue: 0,
  driversFaceEnrolled: 0,
  driversOnCooldown: 0,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<AnalyticsDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
    getAnalyticsOverview(7)
      .then((res) => setChartData(res.series))
      .catch(() => {})
      .finally(() => setChartLoading(false));
  }, []);

  const cards = [
    {
      label: 'Active Rides',
      value: stats.activeRides,
      icon: MapPin,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      link: '/bookings',
    },
    {
      label: 'Total Revenue (in PHP)',
      value: stats.totalRevenue.toLocaleString(),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      link: null,
    },
    {
      label: 'Drivers',
      value: stats.onlineDrivers,
      icon: Car,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      link: '/drivers',
    },
    {
      label: 'Car Owners',
      value: stats.totalRiders,
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      link: null,
    },
    {
      label: 'Pending Verifications',
      value: stats.pendingVerifications,
      icon: Shield,
      color: 'text-red-600',
      bg: 'bg-red-50',
      link: '/drivers',
    },
    {
      label: 'Face Enrolled',
      value: stats.driversFaceEnrolled,
      icon: ScanFace,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      link: '/drivers',
    },
    {
      label: 'Fatigue Cooldown Active',
      value: stats.driversOnCooldown,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      link: '/drivers',
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col"
            >
              <p className="text-sm text-gray-500 mb-1">{card.label}</p>
              <div className="flex items-center justify-between">
                <span className={`text-4xl font-bold ${card.color} ${loading ? 'animate-pulse' : ''}`}>
                  {loading ? '-' : card.value}
                </span>
                <div className={`w-12 h-12 rounded-full ${card.bg} flex items-center justify-center`}>
                  <Icon className={card.color} size={24} />
                </div>
              </div>
              {card.link && (
                <button
                  onClick={() => navigate(card.link!)}
                  className="mt-3 self-end text-sm text-gray-500 hover:text-emerald-700 flex items-center gap-1"
                >
                  See all →
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 7-Day Mini Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Rides (Last 7 Days)</h2>
          {chartLoading ? (
            <div className="h-[180px] bg-gray-100 rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="ridesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(d) => new Date(String(d) + 'T00:00:00').toLocaleDateString()} />
                <Area type="monotone" dataKey="rides" stroke="#059669" fill="url(#ridesGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Revenue (Last 7 Days)</h2>
          {chartLoading ? (
            <div className="h-[180px] bg-gray-100 rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v) => [`₱${Number(v ?? 0).toLocaleString()}`, 'Revenue']} labelFormatter={(d) => new Date(String(d) + 'T00:00:00').toLocaleDateString()} />
                <Area type="monotone" dataKey="revenue" stroke="#7c3aed" fill="url(#revenueGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
