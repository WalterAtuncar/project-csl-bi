// Lenguaje visual compartido entre la tabla del Flujo de Caja Consolidado y la seccion
// "Flujo de Caja Detallado" (mockups 02/03). Extraido tal cual de FlujoConsolidado.tsx
// (refactor puro, sin cambio de comportamiento): misma matriz Ene..Dic + Total, primera
// columna sticky, tabular-nums. Una sola fuente para ambas tablas.

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

// 0 se pinta como '—' (fiel al formato impreso del gerente).
export const money = (n: number) =>
  n === 0 ? '—' : n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export type RowKind = 'header' | 'detail' | 'total' | 'saldo';
export interface Row {
  label: string;
  values: number[];
  total: number;
  kind: RowKind;
  indent?: boolean;      // consolidado: un unico nivel de sangria (pl-6)
  indentLevel?: number;  // detallado: 0..3 niveles de sangria
}

export function rowClass(kind: RowKind): string {
  switch (kind) {
    case 'header': return 'bg-slate-100 dark:bg-slate-700/50 font-bold text-slate-700 dark:text-slate-200 uppercase text-[11px]';
    case 'total': return 'border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100';
    case 'saldo': return 'bg-emerald-50 dark:bg-emerald-900/20 font-bold text-emerald-700 dark:text-emerald-300';
    default: return 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30';
  }
}
export function cellBg(kind: RowKind): string {
  switch (kind) {
    case 'header': return 'bg-slate-100 dark:bg-slate-700/50';
    case 'saldo': return 'bg-emerald-50 dark:bg-emerald-900/20';
    default: return 'bg-white dark:bg-slate-800';
  }
}
