import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authService } from '../services';

const ProtectedRoute: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Función para verificar autenticación
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated() && !authService.isSessionExpired();
      setIsAuthenticated(authenticated);
    };

    // Verificar autenticación inicial
    checkAuth();

    // Escuchar cambios en localStorage para detectar login/logout
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userData' || e.key === 'authToken') {
        checkAuth();
      }
    };

    // Escuchar evento personalizado de login
    const handleAuthLogin = () => {
      checkAuth();
    };

    // Escuchar evento personalizado de logout
    const handleAuthLogout = () => {
      setIsAuthenticated(false);
    };

    // Agregar listeners
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth:login', handleAuthLogin);
    window.addEventListener('auth:logout', handleAuthLogout);

    // Verificar periódicamente (cada 5 segundos) por si acaso
    const interval = setInterval(checkAuth, 5000);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:login', handleAuthLogin);
      window.removeEventListener('auth:logout', handleAuthLogout);
      clearInterval(interval);
    };
  }, []);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;