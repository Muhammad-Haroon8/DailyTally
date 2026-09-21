// context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SuperAdminUser, LoginResponse } from '../types/superAdmin';
import { apiClient } from '../lib/apiClient';

interface AuthContextType {
  user: SuperAdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('superAdminToken');
      const storedUser = localStorage.getItem('superAdminUser');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Failed to load super admin auth state:', err);
      localStorage.removeItem('superAdminToken');
      localStorage.removeItem('superAdminUser');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiClient.post<LoginResponse>('/super-admin/login', {
        email,
        password,
      });

      if (!data.token || !data.superAdmin) {
        throw new Error('Invalid response from login server');
      }

      setToken(data.token);
      setUser(data.superAdmin);

      localStorage.setItem('superAdminToken', data.token);
      localStorage.setItem('superAdminUser', JSON.stringify(data.superAdmin));

      router.push('/shops');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminUser');
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
