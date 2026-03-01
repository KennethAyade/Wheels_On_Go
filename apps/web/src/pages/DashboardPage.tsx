import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, DollarSign, Users, Shield, MapPin, ScanFace, Clock } from 'lucide-react';
import { getStats } from '../api/dashboard';
import type { DashboardStats } from '../types';

const defaultStats: DashboardStats = {
  activeRides: 0,
  onlineDrivers: 0,
  totalRiders: 0,
  pendingVerifications: 0,
  todayRevenue: 0,
  driversFaceEnrolled: 0,
  driversOnCooldown: 0,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
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
      label: 'Total Revenue Today (in PHP)',
      value: stats.todayRevenue.toLocaleString(),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      link: null,
    },
    {
      label: 'Online Drivers',
      value: stats.onlineDrivers,
      icon: Car,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      link: '/drivers',
    },
    {
      label: 'Online Customers',
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
    </div>
  );
}
