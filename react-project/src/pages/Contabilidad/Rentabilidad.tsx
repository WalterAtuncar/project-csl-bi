import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import type { RentabilidadGeneral, ComparativaResponse } from '../../services/contabilidad/contaTypes';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const semaforo: Record<string, { label: string; cls: string; bar: string }> = {
  RENTABLE: { label: 'Rentable', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', bar: '#10b981' },
  BAJO_MARGEN: { label: 'Bajo margen', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', bar: '#f59e0b' },
  PERDIDA: { label: 'Pérdida', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', bar: '#ef4444' },
};

type Tab = 'mensual' | 'trimestral' | 'semestral';

const Rentabilidad: React.FC = () => {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [general, setGeneral] = useState<RentabilidadGeneral | null>(null);
  const [comp, setComp] = useState<ComparativaResponse | null>(null);
  const [tab, setTab] = useState<Tab>('mensual');
  const [loading, setLoading] = useState(false);
  // Toggle "incluir ventas a credito" (PLAN §5.3). Estado local, default ON, sin persistencia (T5).
  const [incluirCredito, setIncluirCredito] = useState(true);
  const filtroActivo = !incluirCredito;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Credito ON => param omitido (URL default identica). Aplica a General Y Comparativa (T6).
      const incluirCreditoParam = incluirCredito ? undefined : false;
      const [g, c] = await Promise.all([
        contabilidadService.rentabilidadGeneral(anio, mes, incluirCreditoParam),
        contabilidadService.rentabilidadComparativa(anio, incluirCreditoParam),
      ]);
      setGeneral(g);
      setComp(c);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando rentabilidad');
    } finally { setLoading(false); }
  }, [anio, mes, incluirCredito]);

  useEffect(() => { load(); }, [load]);

  const flags = comp?.Mensual[0];
  const trimActiva = !!flags?.TrimestralActiva;
  const semActiva = !!flags?.SemestralActiva;

  useEffect(() => {
    if (tab === 'trimestral' && !trimActiva) setTab('mensual');
    if (tab === 'semestral' && !semActiva) setTab('mensual');
  }, [tab, trimActiva, semActiva]);

  const sem = general ? (semaforo[general.Semaforo] || { label: general.Semaforo, cls: 'bg-slate-100 text-slate-600', bar: '#64748b' }) : null;
  const esGanancia = (general?.Resultado ?? 0) >= 0;

  const chartData = useMemo(() => {
    if (!comp) return [];
    if (tab === 'trimestral') return comp.Trimestral.map((t) => ({ label: `T${t.Trimestre}`, Ingresos: t.Ingresos, Gastos: t.Gastos, Resultado: t.Resultado }));
    if (tab === 'semestral') return comp.Semestral.map((s) => ({ label: `S${s.Semestre}`, Ingresos: s.Ingresos, Gastos: s.Gastos, Resultado: s.Resultado }));
    return comp.Mensual.map((m) => ({ label: MESES[m.Mes - 1], Ingresos: m.Ingresos, Gastos: m.Gastos, Resultado: m.Resultado }));
  }, [comp, tab]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Rentabilidad</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Resultado devengado del mes (ventas netas − gastos). SISOL al % de la clínica.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={selCls}>
            {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={selCls}>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          {/* Toggle credito: aplica directo al cambiar (sin boton Aplicar) — PLAN §5.2 */}
          <label
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none"
            title="OFF = solo facturación al contado y depósito; se excluyen las ventas a crédito (cuentas por cobrar)"
          >
            <input
              type="checkbox"
              checked={incluirCredito}
              onChange={(e) => setIncluirCredito(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Incluir ventas a crédito
          </label>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </div>
      </div>

      {/* banner de vista sin credito (T4) */}
      {filtroActivo && (
        <div className="mb-4 text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Vista sin ventas a crédito
        </div>
      )}

      {/* tarjeta grande resultado */}
      {general && sem && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className={`lg:col-span-1 rounded-2xl p-5 border ${esGanancia ? 'border-emerald-200 dark:border-emerald-800' : 'border-rose-200 dark:border-rose-800'} bg-white dark:bg-slate-800`}>
            {/* Con OFF: Resultado/Margen/Semaforo atenuados (T4) — NO se ocultan */}
            <div className={filtroActivo ? 'opacity-50' : ''}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Resultado {MESES[mes - 1]} {anio}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sem.cls}`}>{sem.label}</span>
              </div>
              <div className={`mt-2 text-3xl font-bold flex items-center gap-2 ${esGanancia ? 'text-emerald-600' : 'text-rose-600'}`}>
                {esGanancia ? <TrendingUp className="h-7 w-7" /> : <TrendingDown className="h-7 w-7" />}
                S/ {money(Math.abs(general.Resultado))}
              </div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Margen {general.MargenPorc}% · {esGanancia ? 'Ganancia' : 'Pérdida'}</div>
            </div>
            {filtroActivo && (
              <div className="mt-2 text-[10px] leading-tight text-amber-600 dark:text-amber-400">
                calculado sobre ingresos sin crédito y gastos totales — vista parcial
              </div>
            )}
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <Mini title="Ingresos netos" value={general.Ingresos} tone="sky" icon={<TrendingUp className="h-5 w-5" />} />
            <Mini title="Gastos" value={general.Gastos} tone="rose" icon={<TrendingDown className="h-5 w-5" />} note={filtroActivo ? 'Gastos totales (no filtrados)' : undefined} />
            <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Composición del mes</div>
              <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                <div className="bg-rose-400" style={{ width: `${general.Ingresos ? Math.min(100, (general.Gastos / general.Ingresos) * 100) : 0}%` }} />
                <div className="bg-emerald-400 flex-1" />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Gastos {general.Ingresos ? ((general.Gastos / general.Ingresos) * 100).toFixed(1) : 0}%</span>
                <span>Utilidad {general.Ingresos ? ((general.Resultado / general.Ingresos) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* pestañas + grafico */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <TabBtn active={tab === 'mensual'} onClick={() => setTab('mensual')} label="Mensual" />
          <TabBtn active={tab === 'trimestral'} onClick={() => setTab('trimestral')} label="Trimestral" disabled={!trimActiva} hint={!trimActiva ? 'Se activa con 2 trimestres' : undefined} />
          <TabBtn active={tab === 'semestral'} onClick={() => setTab('semestral')} label="Semestral" disabled={!semActiva} hint={!semActiva ? 'Se activa al cerrar el año' : undefined} />
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} width={44} />
              <Tooltip formatter={(v: number) => `S/ ${money(v)}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Ingresos" fill="#38bdf8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gastos" fill="#fb7185" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Resultado" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {loading && <p className="text-center text-slate-400 text-sm mt-2">Cargando...</p>}
      </div>
    </div>
  );
};

const toneMap: Record<string, string> = {
  sky: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600',
  rose: 'bg-rose-50 dark:bg-rose-900/30 text-rose-500',
};
const Mini: React.FC<{ title: string; value: number; tone: string; icon: React.ReactNode; note?: string }> = ({ title, value, tone, icon, note }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>{icon}</div>
    <div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
      <div className="text-lg font-bold text-slate-800 dark:text-slate-100">S/ {money(value)}</div>
      {note && <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">{note}</div>}
    </div>
  </div>
);

const TabBtn: React.FC<{ active: boolean; onClick: () => void; label: string; disabled?: boolean; hint?: string }> = ({ active, onClick, label, disabled, hint }) => (
  <button
    onClick={onClick} disabled={disabled} title={hint}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
      disabled ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed flex items-center gap-1'
      : active ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
    }`}
  >
    {disabled && <Minus className="h-3 w-3" />}{label}
  </button>
);

const selCls = 'px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

export default Rentabilidad;
