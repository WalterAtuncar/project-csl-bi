import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Users, Wallet, TrendingUp, PieChart, Settings, ShieldCheck, Stethoscope, Activity, LayoutDashboard } from 'lucide-react';
import { useContaAuth } from '../../context/ContaAuthContext';
import { useScrollTopOnNavigate } from '../../hooks/useScrollTopOnNavigate';
import { authService } from '../../services';
import ContaSidebar from './components/ContaSidebar';
import ContaHeader from './components/ContaHeader';
import Footer from '../../components/Layout/Footer';

// 'need' controla la visibilidad: undefined = todos; 'write' = SA/CONTABILIDAD; 'SA' = solo SA.
const navItems: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; need?: 'write' | 'SA' }[] = [
  // Dashboard PRIMERO de la lista (pedido explícito del usuario). Visible a todo usuario conta.
  { to: '/conta/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/conta/caja', label: 'Caja Diaria', icon: Wallet },
  { to: '/conta/flujo-consolidado', label: 'Flujo Consolidado', icon: TrendingUp },
  { to: '/conta/rentabilidad', label: 'Rentabilidad', icon: PieChart },
  // [SOFT-DELETE 2026-07-12] "Rentabilidad x Unidad" (/conta/rentabilidad-unidades) absorbida por
  // Rentabilidad.tsx (seccion Por Unidad). Entrada retirada del menu. Para restaurar, re-agregar:
  // { to: '/conta/rentabilidad-unidades', label: 'Rentabilidad x Unidad', icon: Building2 }, (reimportar Building2)
  // [SOFT-DELETE 2026-07-13] "Liquidacion SISOL" (/conta/sisol) retirada del menu: no fue solicitada.
  // Se conserva SOLO la config de porcentajes en Catalogos -> tab "% SISOL". Para restaurar, reimportar
  // HeartPulse arriba y re-agregar: { to: '/conta/sisol', label: 'Liquidación SISOL', icon: HeartPulse },
  { to: '/conta/egresos', label: 'Egresos', icon: Receipt },
  // Visible a todos; las acciones de escritura (generar/anular pago) van gated por canWrite en la página.
  { to: '/conta/honorarios', label: 'Honorarios Médicos', icon: Stethoscope },
  { to: '/conta/personal', label: 'Costos de Personal', icon: Users },
  // Módulo clínico (no financiero) -> visible a todo usuario conta autenticado (decisión B del plan; sin 'need').
  { to: '/conta/epidemiologia', label: 'Epidemiología', icon: Activity },
  // [SOFT-DELETE 2026-07-13] "Registro de Compras" (/conta/compras) retirada del menu: el registro
  // de egresos (/conta/egresos) unifico compras (receptor PROVEEDOR) + entidades. La bandeja fiscal
  // no tiene feed (dbo.registro_compras=0). Para restaurar cuando exista el feed PLE/SUNAT: re-agregar
  // el import de FileText arriba y la entrada:
  // { to: '/conta/compras', label: 'Registro de Compras', icon: FileText },
  { to: '/conta/catalogos', label: 'Catálogos', icon: Settings, need: 'write' },
  { to: '/conta/usuarios', label: 'Usuarios', icon: ShieldCheck, need: 'SA' },
];

const ContaLayout: React.FC = () => {
  const { isAuthenticated, user, logout, canWrite, hasRole } = useContaAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useScrollTopOnNavigate<HTMLDivElement>(); // vuelve al top al cambiar de página

  // Estado del sidebar: abierto en desktop (>=1024), cerrado en mobile.
  // (Mismo patrón que MainLayout: listener de resize + colapso al cambiar de ruta en mobile.)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  // El guard de auth va DESPUES de los hooks (reglas de hooks: no return antes de los hooks).
  if (!isAuthenticated) {
    // Login unificado: sin sesion conta -> /login (ya no existe /conta/login). Se preserva 'from'.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  // Logout UNIFICADO: el login puebla ambas sesiones, así que cerrar sesión limpia LAS DOS y vuelve al
  // login unificado (/login), limpio para re-loguearse. (1) conta: conta_token + conta_user; (2) legacy:
  // userData + authToken + refreshToken + loginTime vía authService; (3) evento para guards legacy montados.
  const doLogout = () => {
    logout();
    authService.logout();
    window.dispatchEvent(new CustomEvent('auth:logout'));
    navigate('/login', { replace: true });
  };

  // Nav plana ya filtrada por rol -> se pasa a ContaSidebar.
  const visibleNav = navItems
    .filter((n) => !n.need || (n.need === 'write' ? canWrite : hasRole(n.need)))
    .map(({ to, label, icon }) => ({ to, label, icon }));

  return (
    <div className="w-full h-screen flex bg-gray-50 dark:bg-gray-900 text-primary dark:text-white">
      {/* Sidebar fijo a la izquierda (réplica visual del principal, nav propia del conta) */}
      <ContaSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} items={visibleNav} />

      {/* Contenedor principal con scroll propio + offset según el sidebar */}
      <div
        className={`w-full h-screen flex flex-col ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'} transition-all duration-300 text-primary dark:text-white`}
      >
        {/* Header fijo (auth y logout PROPIOS del conta) */}
        <ContaHeader toggleSidebar={toggleSidebar} user={user} onLogout={doLogout} />

        {/* Contenido principal con scroll */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* NOTA: sin padding p-4 aquí; las páginas del conta ya traen su propio p-6. */}
              <Outlet />
            </motion.div>
          </AnimatePresence>

          {/* Footer integrado en el scroll del contenido */}
          <Footer />
        </div>
      </div>
      {/* El Toaster es unico y global (ToastProvider en App.tsx). No montar otro aqui:
          react-hot-toast pinta cada toast en TODOS los <Toaster> montados => se duplicaria. */}
    </div>
  );
};

export default ContaLayout;
