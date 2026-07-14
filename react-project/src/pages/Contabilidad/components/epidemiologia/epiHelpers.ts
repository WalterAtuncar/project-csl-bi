// Helpers puros del módulo de Epidemiología (formatters, paletas, utilidades de charts).
// Sin JSX ni React aquí (ver EpiUI.tsx para los componentes visuales).

// Entero con separador de miles es-PE.
export const nInt = (n: number | null | undefined): string => (n ?? 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });
// Porcentaje 1 decimal.
export const nPct = (n: number | null | undefined): string => `${(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

// Fecha ISO (yyyy-MM-dd[THH...]) -> dd/MM/yyyy. Devuelve '' para null.
export const fmtFecha = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

// Trunca un texto para labels de charts.
export const truncar = (s: string | null | undefined, max: number): string => {
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

// Paleta del proyecto.
export const COLOR_PRIMARY = '#1E3A8A';
export const COLOR_PRIMARY_LIGHT = '#2563EB';
export const COLOR_SECONDARY = '#DC2626';
export const COLOR_M = '#2563EB'; // masculino (azul)
export const COLOR_F = '#DB2777'; // femenino (magenta)

// Paleta categórica (capítulos, distritos, etc.). Suficientemente amplia y con buen contraste.
export const CAT_PALETTE = [
  '#1E3A8A', '#2563EB', '#0891B2', '#059669', '#65A30D', '#CA8A04',
  '#EA580C', '#DC2626', '#DB2777', '#9333EA', '#4F46E5', '#0D9488',
  '#16A34A', '#D97706', '#B91C1C', '#7C3AED', '#0EA5E9', '#F59E0B',
  '#10B981', '#6366F1', '#EF4444', '#14B8A6', '#8B5CF6', '#F97316',
];
export const catColor = (i: number): string => CAT_PALETTE[i % CAT_PALETTE.length];

// Zonas del canal endémico.
export const ZONA_COLOR: Record<string, string> = {
  Exito: '#16A34A',      // verde
  Seguridad: '#EAB308',  // amarillo
  Alarma: '#F97316',     // naranja
  Epidemia: '#DC2626',   // rojo
};

// Números romanos I..XXII para los capítulos CIE-10 (CapNum es 1..22 o null).
const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII'];
export const capRomano = (capNum: number | null): string => {
  if (capNum == null || capNum < 1 || capNum >= ROMANOS.length) return '—';
  return ROMANOS[capNum];
};

// Etiqueta corta y ordenable de la semana ISO.
export const semLabel = (semana: number): string => `S${semana}`;

// Orden canónico de las etapas de vida MINSA (para la pirámide).
export const ORDEN_ETAPAS = ['Niño', 'Adolescente', 'Joven', 'Adulto', 'Adulto mayor'];
