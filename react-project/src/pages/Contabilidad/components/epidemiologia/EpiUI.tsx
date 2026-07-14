// Componentes visuales compartidos del dashboard de Epidemiología: card contenedora de charts,
// skeleton de carga, empty-state y tarjeta KPI. Paleta del proyecto + dark-mode aware.
import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

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

// Card contenedora de un chart, con título + subtítulo. Maneja loading (skeleton) y empty por sí misma.
export const EpiCard: React.FC<{
  title: string;
  subtitle?: string;
  className?: string;
  loading?: boolean;
  isEmpty?: boolean;
  emptyLabel?: string;
  right?: React.ReactNode;
  height?: number;
  children?: React.ReactNode;
}> = ({ title, subtitle, className = '', loading, isEmpty, emptyLabel = 'Sin datos para el filtro seleccionado', right, height = 300, children }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col ${className}`}>
    <div className="flex items-start justify-between gap-2 mb-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className="flex-1" style={{ minHeight: height }}>
      {loading ? (
        <ChartSkeleton height={height} />
      ) : isEmpty ? (
        <div className="h-full flex items-center justify-center text-center px-4" style={{ minHeight: height }}>
          <p className="text-sm text-slate-400 dark:text-slate-500">{emptyLabel}</p>
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

// Skeleton animado (barras “fantasma”) para el estado de carga de una card.
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <div className="w-full animate-pulse flex items-end gap-2 px-2" style={{ height }}>
    {[60, 85, 45, 95, 70, 55, 80, 40, 90, 65].map((h, i) => (
      <div key={i} className="flex-1 rounded-t bg-slate-200 dark:bg-slate-700" style={{ height: `${h}%` }} />
    ))}
  </div>
);

// Tarjeta KPI de la fila superior del dashboard.
const toneMap: Record<string, { ring: string; icon: string; value: string }> = {
  primary: { ring: 'border-blue-200 dark:border-blue-900/50', icon: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', value: 'text-blue-700 dark:text-blue-300' },
  emerald: { ring: 'border-emerald-200 dark:border-emerald-900/50', icon: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30', value: 'text-emerald-700 dark:text-emerald-300' },
  sky: { ring: 'border-sky-200 dark:border-sky-900/50', icon: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30', value: 'text-sky-700 dark:text-sky-300' },
  violet: { ring: 'border-violet-200 dark:border-violet-900/50', icon: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30', value: 'text-violet-700 dark:text-violet-300' },
  amber: { ring: 'border-amber-200 dark:border-amber-900/50', icon: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', value: 'text-amber-700 dark:text-amber-300' },
  rose: { ring: 'border-rose-200 dark:border-rose-900/50', icon: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30', value: 'text-rose-700 dark:text-rose-300' },
};

export const KpiCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: keyof typeof toneMap;
  loading?: boolean;
}> = ({ label, value, sub, icon: Icon, tone = 'primary', loading }) => {
  const t = toneMap[tone] ?? toneMap.primary;
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border ${t.ring} p-4`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        <span className={`p-1.5 rounded-lg ${t.icon}`}><Icon className="h-4 w-4" /></span>
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      ) : (
        <div className={`mt-1 text-2xl font-bold ${t.value}`}>{value}</div>
      )}
      {sub && !loading && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
};
