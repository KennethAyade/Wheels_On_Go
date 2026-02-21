import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  CreditCard,
  Car,
  Users,
  Activity,
  FileText,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { to: '/bookings', label: 'Bookings', icon: BookOpen, enabled: true },
  { to: '#', label: 'Payments', icon: CreditCard, enabled: false },
  { to: '/drivers', label: 'Drivers', icon: Car, enabled: true },
  { to: '#', label: 'Customers', icon: Users, enabled: false },
  { to: '#', label: 'System Usage', icon: Activity, enabled: false },
  { to: '#', label: 'Reports', icon: FileText, enabled: false },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Wheels On Go" className="w-10 h-10 object-contain" />
          <span className="font-bold text-emerald-800 text-sm">WHEELS ON GO</span>
        </div>
      </div>

      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (!item.enabled) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-4 py-2.5 text-gray-400 cursor-not-allowed"
                title="Coming Soon"
              >
                <Icon size={18} />
                <span className="text-sm">{item.label}</span>
              </div>
            );
          }
          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold border-r-3 border-emerald-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
