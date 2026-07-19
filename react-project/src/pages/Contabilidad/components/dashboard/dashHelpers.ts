// Helpers puros del Dashboard Gerencial/Contable (formatters es-PE, paletas, utilidades de charts).
// Sin JSX ni React aquí (ver DashUI.tsx para los componentes visuales).

// ---- Moneda / números (convención conta: es-PE, prefijo S/) ----
export const money = (n: number | null | undefined): string =>
  `S/ ${(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Moneda compacta para tooltips/labels donde el ancho manda.
export const moneyC = (n: number | null | undefined): string =>
  `S/ ${(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Eje: sin prefijo, en miles/millones para no saturar (baseline 0 SIEMPRE en los charts de barras).
export const moneyAxis = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toLocaleString('es-PE', { maximumFractionDigits: 1 })}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
};

export const nInt = (n: number | null | undefined): string =>
  (n ?? 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });

export const nPct = (n: number | null | undefined, dec = 1): string =>
  `${(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec })}%`;

// ---- Fechas ----
// yyyy-MM-dd[THH...] -> dd/MM/yyyy
export const fmtFecha = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};
// yyyy-MM-dd -> dd/MM (para ejes densos)
export const fmtDiaMes = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const s = iso.slice(0, 10);
  const [, m, d] = s.split('-');
  return m && d ? `${d}/${m}` : s;
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
// (Anio, Mes 1..12) -> "jun 26"
export const mesLabel = (anio: number, mes: number): string => {
  const m = MESES[(mes - 1 + 12) % 12] ?? `${mes}`;
  return `${m} ${String(anio).slice(2)}`;
};
export const mesKey = (anio: number, mes: number): string => `${anio}-${String(mes).padStart(2, '0')}`;

// Trunca texto para labels de charts.
export const truncar = (s: string | null | undefined, max: number): string => {
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

// ---- Color fijo por unidad de negocio (REGLA DEL PLAN §1.1 / §6): mismo color en TODOS los charts
// de ambos tabs. La `Unidad` del SP es el v_NombreTipoCaja (p.ej. "ATENCION_ASISTENCIAL"); se
// normaliza por keyword. SIN_UNIDAD (residuo CxC) = gris neutro. ----
export const UNIDAD_COLOR = {
  ASISTENCIAL: '#0EA5E9', // sky-500
  OCUPACIONAL: '#8B5CF6', // violet-500
  SISOL: '#F59E0B',       // amber-500
  MTC: '#64748B',         // slate-500
  SEGUROS: '#F43F5E',     // rose-500
  FARMACIA: '#10B981',    // emerald-500
} as const;
const UNIDAD_NEUTRO = '#94A3B8'; // slate-400 (SIN_UNIDAD / residuo / desconocido)

// Nombre corto legible ("ATENCION_ASISTENCIAL" -> "ASISTENCIAL").
export const unidadCorto = (raw: string | null | undefined): string => {
  const u = (raw ?? '').toUpperCase().replace('ATENCION_', '').replace(/_/g, ' ').trim();
  return u || 'SIN UNIDAD';
};

export const unidadColor = (raw: string | null | undefined): string => {
  const u = (raw ?? '').toUpperCase();
  if (u.includes('ASISTENCIAL')) return UNIDAD_COLOR.ASISTENCIAL;
  if (u.includes('OCUPACIONAL')) return UNIDAD_COLOR.OCUPACIONAL;
  if (u.includes('SISOL')) return UNIDAD_COLOR.SISOL;
  if (u.includes('MTC')) return UNIDAD_COLOR.MTC;
  if (u.includes('SEGURO')) return UNIDAD_COLOR.SEGUROS;
  if (u.includes('FARMACIA')) return UNIDAD_COLOR.FARMACIA;
  return UNIDAD_NEUTRO;
};

// Orden canónico por id de tipocaja para leyendas/series estables (1..6).
export const UNIDAD_ORDEN: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

// ---- Color fijo por medio de pago (catálogo grupo 46: EFECTIVO, VISA, DEPOSITO, YAPE, PLIN) ----
const MEDIO_PALETTE = ['#10B981', '#6366F1', '#0EA5E9', '#7C3AED', '#06B6D4', '#F59E0B', '#EC4899', '#84CC16'];
export const medioColor = (raw: string | null | undefined, idx = 0): string => {
  const u = (raw ?? '').toUpperCase();
  if (u.includes('EFECTIVO')) return '#10B981'; // emerald
  if (u.includes('VISA') || u.includes('TARJETA')) return '#6366F1'; // indigo
  if (u.includes('DEPOSITO') || u.includes('DEPÓSITO') || u.includes('TRANSFER')) return '#0EA5E9'; // sky
  if (u.includes('YAPE')) return '#7C3AED'; // violet
  if (u.includes('PLIN')) return '#06B6D4'; // cyan
  return MEDIO_PALETTE[idx % MEDIO_PALETTE.length];
};

// Paleta categórica (top egresos, composición de gastos, aging).
export const CAT_PALETTE = [
  '#1E3A8A', '#2563EB', '#0891B2', '#059669', '#65A30D', '#CA8A04',
  '#EA580C', '#DC2626', '#DB2777', '#9333EA', '#4F46E5', '#0D9488',
];
export const catColor = (i: number): string => CAT_PALETTE[i % CAT_PALETTE.length];

// ---- Delta MoM (contexto obligatorio de cada KPI; §1.1). Devuelve pct relativo y dirección. ----
export interface DeltaInfo { pct: number; dir: 'up' | 'down' | 'flat'; hasPrev: boolean; }
export const calcDelta = (actual: number, prev: number): DeltaInfo => {
  if (prev == null || prev === 0) {
    if (actual === 0) return { pct: 0, dir: 'flat', hasPrev: false };
    return { pct: 0, dir: actual > 0 ? 'up' : 'down', hasPrev: false };
  }
  const pct = ((actual - prev) / Math.abs(prev)) * 100;
  const dir = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  return { pct, dir, hasPrev: true };
};

// Clave de caché por filtro (para no re-pedir al alternar tabs).
export const filtroKey = (desde: string, hasta: string, tiposCaja: string): string =>
  `${desde}|${hasta}|${tiposCaja}`;
