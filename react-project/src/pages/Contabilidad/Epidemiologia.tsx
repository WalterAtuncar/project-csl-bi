// Módulo de Epidemiología (/conta/epidemiologia). Página con 2 tabs que comparten un card de filtros
// (estado elevado): Ficha Individual EPI (grid + export) y Dashboard Epidemiológico (KPIs + 12 charts).
// Visible a todo usuario conta autenticado (decisión B del plan; dato clínico, no financiero).
import React, { useState } from 'react';
import { Activity, FileSpreadsheet, LayoutDashboard } from 'lucide-react';
import FiltroEpidemiologiaCard from './components/epidemiologia/FiltroEpidemiologiaCard';
import type { EpiFiltro } from './components/epidemiologia/FiltroEpidemiologiaCard';
import FichaIndividualTab from './components/epidemiologia/FichaIndividualTab';
import DashboardEpidemiologicoTab from './components/epidemiologia/DashboardEpidemiologicoTab';

// Rango por defecto = mes actual (día 1 -> hoy).
const filtroInicial = (): EpiFiltro => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return { desde: `${yyyy}-${mm}-01`, hasta: `${yyyy}-${mm}-${dd}`, ambito: 'TODOS', incluirDescartados: false, soloConDx: false };
};

type Tab = 'ficha' | 'dashboard';

const Epidemiologia: React.FC = () => {
  const [tab, setTab] = useState<Tab>('ficha');
  const [filtro, setFiltro] = useState<EpiFiltro>(filtroInicial);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Activity className="h-6 w-6 text-secondary" /> Epidemiología
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ficha individual EPI (formato DIRESA) y análisis epidemiológico de diagnósticos por consultorio, capítulo CIE-10, sexo, edad, tiempo y geografía.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-200 dark:border-slate-700">
        <TabBtn active={tab === 'ficha'} onClick={() => setTab('ficha')} icon={FileSpreadsheet} label="Ficha Individual EPI" />
        <TabBtn active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={LayoutDashboard} label="Dashboard Epidemiológico" />
      </div>

      {/* Card de filtros compartido (estado elevado). El check "Solo con diagnóstico" solo en TAB 1. */}
      <FiltroEpidemiologiaCard value={filtro} onApply={setFiltro} showSoloConDx={tab === 'ficha'} />

      {tab === 'ficha' ? <FichaIndividualTab filtro={filtro} /> : <DashboardEpidemiologicoTab filtro={filtro} />}
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

export default Epidemiologia;
