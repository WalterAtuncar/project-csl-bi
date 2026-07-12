import React from 'react';
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Receipt, Users, LogOut, Calculator, Wallet, TrendingUp, PieChart, Building2, HeartPulse, FileText, Settings, ShieldCheck } from 'lucide-react';
import { useContaAuth } from '../../context/ContaAuthContext';

// 'need' controla la visibilidad: undefined = todos; 'write' = SA/CONTABILIDAD; 'SA' = solo SA.
const navItems: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; need?: 'write' | 'SA' }[] = [
  { to: '/conta/caja', label: 'Caja Diaria', icon: Wallet },
  { to: '/conta/flujo-consolidado', label: 'Flujo Consolidado', icon: TrendingUp },
  { to: '/conta/rentabilidad', label: 'Rentabilidad', icon: PieChart },
  { to: '/conta/rentabilidad-unidades', label: 'Rentabilidad x Unidad', icon: Building2 },
  { to: '/conta/sisol', label: 'Liquidación SISOL', icon: HeartPulse },
  { to: '/conta/egresos', label: 'Egresos', icon: Receipt },
  { to: '/conta/personal', label: 'Costos de Personal', icon: Users },
  { to: '/conta/compras', label: 'Registro de Compras', icon: FileText },
  { to: '/conta/catalogos', label: 'Catálogos', icon: Settings, need: 'write' },
  { to: '/conta/usuarios', label: 'Usuarios', icon: ShieldCheck, need: 'SA' },
];

const ContaLayout: React.FC = () => {
  const { isAuthenticated, user, logout, canWrite, hasRole } = useContaAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/conta/login" replace state={{ from: location.pathname }} />;
  }

  const doLogout = () => { logout(); navigate('/conta/login', { replace: true }); };
  const visibleNav = navItems.filter((n) => !n.need || (n.need === 'write' ? canWrite : hasRole(n.need)));

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-900">
      <aside className="w-60 shrink-0 bg-slate-800 text-slate-100 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-700">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Calculator className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm">Gestion Financiera</div>
            <div className="text-[11px] text-slate-400">San Lorenzo</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <div className="px-3 py-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-200">{user?.Nombre || user?.Username}</div>
            <div>{user?.Roles.join(', ')}</div>
          </div>
          <button onClick={doLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700">
            <LogOut className="h-4 w-4" /> Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto">
        <Outlet />
      </main>

      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    </div>
  );
};

export default ContaLayout;
