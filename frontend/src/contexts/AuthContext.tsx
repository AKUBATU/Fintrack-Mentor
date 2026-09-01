import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import * as sonner from "sonner";
const toast = sonner.toast;

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.me();
        setUser({
          id: String(me.id),
          email: me.email,
          name: me.name,
          role: 'user',
        });
      } catch (e) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setUser(null);
      toast.error('Sesi sudah tidak berlaku. Silakan login kembali.');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const validateSession = () => {
      if (document.visibilityState !== 'visible' || !localStorage.getItem('access_token')) return;
      // Respons 401 ditangani terpusat oleh request(); gangguan jaringan sementara
      // tidak boleh langsung mengeluarkan pengguna dari sesi yang masih valid.
      void api.me().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', validateSession);
    return () => document.removeEventListener('visibilitychange', validateSession);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.login(email, password);
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser({
        id: String(res.user.id),
        email: res.user.email,
        name: res.user.name,
        role: 'user',
      });
      toast.success('Login berhasil!');
    } catch (err: any) {
      toast.error(err?.message || 'Login gagal');
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      await api.register(name, email, password);
      toast.success('Register berhasil! Silakan login.');
    } catch (err: any) {
      toast.error(err?.message || 'Register gagal');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logout berhasil');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
