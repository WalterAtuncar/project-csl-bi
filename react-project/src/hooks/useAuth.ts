import { useState, useEffect, useCallback } from 'react';
import { authService, UserData } from '../services';

export interface UseAuthReturn {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<UserData>;
  logout: () => Promise<void>;
  checkSession: () => void;
  sessionInfo: {
    duration: number;
    isExpired: boolean;
  };
}

/**
 * Hook personalizado para manejar la autenticación
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar sesión al cargar el hook
  useEffect(() => {
    checkSession();
  }, []);

  /**
   * Verifica la sesión actual
   */
  const checkSession = useCallback(() => {
    const currentUser = authService.getCurrentUser();
    
    if (currentUser && !authService.isSessionExpired()) {
      setUser(currentUser);
    } else if (currentUser && authService.isSessionExpired()) {
      // Sesión expirada, hacer logout
      handleLogout();
    } else {
      setUser(null);
    }
  }, []);

  /**
   * Realiza el login
   */
  const handleLogin = useCallback(async (username: string, password: string): Promise<UserData> => {
    setIsLoading(true);
    try {
      const userData = await authService.login(username, password);
      setUser(userData);
      return userData;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Realiza el logout
   */
  const handleLogout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error durante logout:', error);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Obtiene información de la sesión
   */
  const sessionInfo = {
    duration: authService.getSessionDuration(),
    isExpired: authService.isSessionExpired()
  };

  return {
    user,
    isAuthenticated: !!user?.isAuthenticated,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
    checkSession,
    sessionInfo
  };
}; 