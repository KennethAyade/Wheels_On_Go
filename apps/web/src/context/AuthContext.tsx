import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import type { AdminUser } from '../types';

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wog_access_token');
    if (token) {
      authApi
        .getMe()
        .then((data) => {
          if (data.role === 'ADMIN') {
            setUser({
              id: data.id,
              email: data.email,
              role: data.role,
              firstName: data.firstName,
              lastName: data.lastName,
            });
          } else {
            localStorage.removeItem('wog_access_token');
            localStorage.removeItem('wog_refresh_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('wog_access_token');
          localStorage.removeItem('wog_refresh_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    localStorage.setItem('wog_access_token', response.accessToken);
    localStorage.setItem('wog_refresh_token', response.refreshToken);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('wog_access_token');
    localStorage.removeItem('wog_refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
