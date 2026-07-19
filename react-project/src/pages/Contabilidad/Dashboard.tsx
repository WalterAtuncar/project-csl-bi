// Página "Dashboard" (/conta/dashboard). Dos tabs (patrón de Epidemiologia.tsx) que comparten un card
// de filtros con estado elevado: Dashboard Gerencial (KPIs de dirección) y Dashboard Contable (caja,
// CxC/CxP, IGV, planilla, bancos). Cada tab hace SU fetch al cambiar el filtro; el tab no visible no
// fetchea hasta abrirse (render condicional) y la caché por clave desde|hasta|tiposCaja vive en la
// página (useRef), así alternar tabs no re-pide. Visible a todo usuario conta autenticado.
import React, { useRef, useState } from 'react';
import { LayoutDashboard, BarChart3, Calculator } from 'lucide-react';
import FiltroDashboardCard from './components/dashboard/FiltroDashboardCard';
import DashboardGerencialTab from './components/dashboard/DashboardGerencialTab';
import DashboardContableTab from './components/dashboard/DashboardContableTab';
import type { DashFiltro, DashGerencialResponse, DashContableResponse } from '../../services/contabilidad/contaTypes';

// Rango por defecto = mes actual (día 1 -> hoy). tiposCaja nace '' (TODOS pendiente): el card de
// filtros lo auto-commitea al cargar el catálogo (dispara el 1er fetch con el CSV explícito).
const filtroInicial = (): DashFiltro => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return { desde: `${yyyy}-${mm}-01`, hasta: `${yyyy}-${mm}-${dd}`, tiposCaja: '' };
};

type Tab = 'gerencial' | 'contable';

const Dashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('gerencial');
  const [filtro, setFiltro] = useState<DashFiltro>(filtroInicial);
  const [busy, setBusy] = useState(false); // loading del tab activo, elevado para el botón "Aplicar"

  // Cachés por tab (clave desde|hasta|tiposCaja). Persisten entre renders y remounts de los tabs.
  const gerCache = useRef(new Map<string, DashGerencialResponse>());
  const contCache = useRef(new Map<string, DashContableResponse>());

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-secondary" /> Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Vista de dirección (gerencial) y de gestión (contable): ingresos, cobranza, márgenes, flujo de caja, cuentas por cobrar/pagar, medios de pago e indicadores fiscales.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-200 dark:border-slate-700">
        <TabBtn active={tab === 'gerencial'} onClick={() => setTab('gerencial')} icon={BarChart3} label="Dashboard Gerencial" />
        <TabBtn active={tab === 'contable'} onClick={() => setTab('contable')} icon={Calculator} label="Dashboard Contable" />
      </div>

      {/* Card de filtros compartido (estado elevado). `loading` = carga del tab activo → el botón
          "Aplicar" muestra spinner y se deshabilita mientras el dashboard fetchea. */}
      <FiltroDashboardCard value={filtro} onApply={setFiltro} loading={busy} />

      {/* Render condicional: solo el tab activo se monta (lazy: el no visible no fetchea). La caché de
          la página evita re-pedir al alternar tabs. Cada tab reporta su loading vía onLoading. */}
      {tab === 'gerencial'
        ? <DashboardGerencialTab filtro={filtro} cache={gerCache.current} onLoading={setBusy} />
        : <DashboardContableTab filtro={filtro} cache={contCache.current} onLoading={setBusy} />}
    </div>
  );
};

const TabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
      active
        ? 'border-secondary text-secondary'
        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
    }`}
  >
    <Icon className="h-4 w-4" /> {label}
  </button>
);

export default Dashboard;
