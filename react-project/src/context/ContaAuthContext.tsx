import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import contabilidadService from '../services/contabilidad/ContabilidadService';

export interface ContaUser {
  IdUsuario: number;
  Username: string;
  Nombre: string;
  Roles: string[];
}

interface ContaAuthState {
  user: ContaUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
  canWrite: boolean; // SA o CONTABILIDAD
}

const ContaAuthContext = createContext<ContaAuthState | undefined>(undefined);

function readStoredUser(): ContaUser | null {
  const raw = localStorage.getItem('conta_user');
  if (!raw || !contabilidadService.getToken()) return null;
  try { return JSON.parse(raw) as ContaUser; } catch { return null; }
}

export const ContaAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ContaUser | null>(readStoredUser);

  const logout = useCallback(() => {
    contabilidadService.clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('conta:logout', onLogout);
    return () => window.removeEventListener('conta:logout', onLogout);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await contabilidadService.login(username, password);
    setUser({ IdUsuario: res.IdUsuario, Username: res.Username, Nombre: res.Nombre, Roles: res.Roles });
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) => !!user && roles.some((r) => user.Roles.includes(r)),
    [user]
  );

  const value = useMemo<ContaAuthState>(() => ({
    user,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole,
    canWrite: !!user && (user.Roles.includes('SA') || user.Roles.includes('CONTABILIDAD')),
  }), [user, login, logout, hasRole]);

  return <ContaAuthContext.Provider value={value}>{children}</ContaAuthContext.Provider>;
};

export function useContaAuth(): ContaAuthState {
  const ctx = useContext(ContaAuthContext);
  if (!ctx) throw new Error('useContaAuth debe usarse dentro de ContaAuthProvider');
  return ctx;
}
