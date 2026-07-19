// Componentes visuales compartidos del Dashboard Gerencial/Contable: tema de recharts (dark-aware),
// card contenedora de chart (con skeleton + empty-state), tarjeta KPI con delta (flecha+signo+%,
// NUNCA solo color — §1.1), y empty-state elegante D7 reutilizable (charts que nacen vacíos hoy).
import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Info, Inbox } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { calcDelta, nPct } from './dashHelpers';

// Colores de ejes/grid/tooltip para recharts según el tema (recharts no hereda el CSS dark).
export const useChartTheme = () => {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return {
    dark,
    axis: dark ? '#94a3b8' : '#64748b',
    grid: dark ? '#334155' : '#e2e8f0',
    tooltip: {
      backgroundColor: dark ? '#1e293b' : '#ffffff',
      border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
      borderRadius: 8,
      fontSize: 12,
      color: dark ? '#e2e8f0' : '#0f172a',
    } as React.CSSProperties,
  };
};

// Skeleton animado (barras “fantasma”) para el estado de carga de una card.
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <div className="w-full animate-pulse flex items-end gap-2 px-2" style={{ height }}>
    {[60, 85, 45, 95, 70, 55, 80, 40, 90, 65].map((h, i) => (
      <div key={i} className="flex-1 rounded-t bg-slate-200 dark:bg-slate-700" style={{ height: `${h}%` }} />
    ))}
  </div>
);

// Empty-state elegante (D7): charts cuyas fuentes nacen vacías hoy muestran esto, NO un error ni un
// chart roto. La `nota` dice QUÉ carga lo poblará (incentivo a la captura — R1 del plan).
export const DashboardEmptyState: React.FC<{
  title?: string;
  nota: string;
  icon?: React.ComponentType<{ className?: string }>;
  pill?: boolean; // muestra la píldora "pendiente de carga" (D7). false = vacío por filtro (sin píldora).
}> = ({ title = 'Sin datos todavía', nota, icon: Icon = Inbox, pill = true }) => (
  <div className="h-full flex flex-col items-center justify-center text-center px-6 py-8">
    <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-700/50 mb-3">
      <Icon className="h-7 w-7 text-slate-400 dark:text-slate-500" />
    </div>
    <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</h4>
    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-xs">{nota}</p>
    {pill && (
      <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
        pendiente de carga
      </span>
    )}
  </div>
);

// Card contenedora de un chart, con título + subtítulo. Maneja loading (skeleton) y empty por sí misma.
export const DashCard: React.FC<{
  title: string;
  subtitle?: string;
  className?: string;
  loading?: boolean;
  isEmpty?: boolean;
  empty?: React.ReactNode;      // nodo a mostrar cuando isEmpty (típicamente <DashboardEmptyState/>)
  right?: React.ReactNode;
  note?: string;                // footnote (p.ej. "no filtra por tipo de caja")
  hint?: string;                // tooltip aclaratorio en un ícono (i) junto al título
  height?: number;
  children?: React.ReactNode;
}> = ({ title, subtitle, className = '', loading, isEmpty, empty, right, note, hint, height = 300, children }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col ${className}`}>
    <div className="flex items-start justify-between gap-2 mb-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          {title}
          {hint && (
            <span title={hint} className="inline-flex text-slate-400 dark:text-slate-500 cursor-help">
              <Info className="h-3.5 w-3.5" />
            </span>
          )}
        </h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className="flex-1" style={{ minHeight: height }}>
      {loading ? (
        <ChartSkeleton height={height} />
      ) : isEmpty ? (
        <div className="h-full" style={{ minHeight: height }}>{empty}</div>
      ) : (
        children
      )}
    </div>
    {note && !loading && <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 italic">{note}</p>}
  </div>
);

// ---- Tarjeta KPI de la fila superior ----
const toneMap: Record<string, { ring: string; icon: string; value: string }> = {
  primary: { ring: 'border-blue-200 dark:border-blue-900/50', icon: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', value: 'text-blue-700 dark:text-blue-300' },
  emerald: { ring: 'border-emerald-200 dark:border-emerald-900/50', icon: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30', value: 'text-emerald-700 dark:text-emerald-300' },
  sky: { ring: 'border-sky-200 dark:border-sky-900/50', icon: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30', value: 'text-sky-700 dark:text-sky-300' },
  violet: { ring: 'border-violet-200 dark:border-violet-900/50', icon: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30', value: 'text-violet-700 dark:text-violet-300' },
  amber: { ring: 'border-amber-200 dark:border-amber-900/50', icon: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', value: 'text-amber-700 dark:text-amber-300' },
  rose: { ring: 'border-rose-200 dark:border-rose-900/50', icon: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30', value: 'text-rose-700 dark:text-rose-300' },
  slate: { ring: 'border-slate-200 dark:border-slate-700', icon: 'text-slate-600 bg-slate-100 dark:bg-slate-700/40', value: 'text-slate-700 dark:text-slate-200' },
};

// Delta MoM: SIEMPRE flecha + signo + % (no solo color — daltonismo, §1.1). `invert` = un alza es mala
// (egresos): entonces up pinta rose y down emerald. `points` = comparar puntos porcentuales (p.ej. margen%).
const DeltaBadge: React.FC<{ actual: number; prev: number; invert?: boolean; points?: boolean }> = ({ actual, prev, invert, points }) => {
  const d = calcDelta(actual, prev);
  if (!d.hasPrev) {
    return <span className="text-[11px] text-slate-400 dark:text-slate-500">sin período previo</span>;
  }
  const Arrow = d.dir === 'up' ? ArrowUpRight : d.dir === 'down' ? ArrowDownRight : Minus;
  const bueno = d.dir === 'flat' ? 'flat' : (invert ? (d.dir === 'down' ? 'good' : 'bad') : (d.dir === 'up' ? 'good' : 'bad'));
  const color = bueno === 'good' ? 'text-emerald-600 dark:text-emerald-400' : bueno === 'bad' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400';
  const sign = d.dir === 'up' ? '+' : d.dir === 'down' ? '−' : '';
  const texto = points
    ? `${sign}${Math.abs(actual - prev).toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pts`
    : `${sign}${nPct(Math.abs(d.pct))}`;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${color}`}>
      <Arrow className="h-3.5 w-3.5" /> {texto}
      <span className="text-slate-400 dark:text-slate-500 font-normal ml-0.5">vs previo</span>
    </span>
  );
};

export const KpiCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: keyof typeof toneMap;
  loading?: boolean;
  delta?: { actual: number; prev: number; invert?: boolean; points?: boolean };
  hint?: string;
}> = ({ label, value, sub, icon: Icon, tone = 'primary', loading, delta, hint }) => {
  const t = toneMap[tone] ?? toneMap.primary;
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border ${t.ring} p-4`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
          {label}
          {hint && (
            <span title={hint} className="inline-flex text-slate-400 dark:text-slate-500 cursor-help">
              <Info className="h-3 w-3" />
            </span>
          )}
        </span>
        <span className={`p-1.5 rounded-lg ${t.icon}`}><Icon className="h-4 w-4" /></span>
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      ) : (
        <div className={`mt-1 text-2xl font-bold ${t.value} tabular-nums`}>{value}</div>
      )}
      <div className="mt-1 flex items-center justify-between gap-2 min-h-[16px]">
        {sub && !loading ? <span className="text-xs text-slate-400 dark:text-slate-500">{sub}</span> : <span />}
        {delta && !loading && <DeltaBadge {...delta} />}
      </div>
    </div>
  );
};
