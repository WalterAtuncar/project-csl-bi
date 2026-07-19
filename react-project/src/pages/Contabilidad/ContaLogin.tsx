import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Lock, User, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import { useContaAuth } from '../../context/ContaAuthContext';

const ContaLogin: React.FC = () => {
  const { login, isAuthenticated } = useContaAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string })?.from || '/conta/dashboard';
  if (isAuthenticated) return <Navigate to={from} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username.trim(), password);
      toast.success('Sesion iniciada');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center mb-3">
            <Calculator className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestion Financiera</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Clinica San Lorenzo</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required autoFocus
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="sa / gerente / contabilidad"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Contrasena</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold transition"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContaLogin;
