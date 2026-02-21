import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TopBar() {
  const { user, logout } = useAuth();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6">
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{displayName}</p>
          <p className="text-xs text-gray-500">Admin</p>
        </div>
        <div className="w-9 h-9 bg-emerald-700 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <button
          onClick={logout}
          className="ml-2 p-2 text-gray-500 hover:text-red-600 transition-colors"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
