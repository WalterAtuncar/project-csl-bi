import React from 'react';
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Receipt, Users, LogOut, Calculator, Wallet, TrendingUp } from 'lucide-react';
import { useContaAuth } from '../../context/ContaAuthContext';

const navItems = [
  { to: '/conta/caja', label: 'Caja Diaria', icon: Wallet },
  { to: '/conta/flujo-consolidado', label: 'Flujo Consolidado', icon: TrendingUp },
  { to: '/conta/egresos', label: 'Egresos', icon: Receipt },
  { to: '/conta/personal', label: 'Costos de Personal', icon: Users },
];

const ContaLayout: React.FC = () => {
  const { isAuthenticated, user, logout } = useContaAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/conta/login" replace state={{ from: location.pathname }} />;
  }

  const doLogout = () => { logout(); navigate('/conta/login', { replace: true }); };

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
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
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
