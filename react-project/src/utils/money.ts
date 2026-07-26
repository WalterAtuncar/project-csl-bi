// Formateadores de moneda es-PE UNICOS del modulo conta (deuda B5 de la auditoria 2026-07-25:
// habia ~8 copias locales con TRES semanticas distintas). Cada variante calca EXACTAMENTE la
// semantica que ya existia en sus sitios de uso — no cambian ningun formato visible.

// Sin prefijo, 2 decimales (CajaDiaria, CostosPersonal, Egresos, Compras, ReconciliacionCajaMayorCard).
export const money = (n: number | null | undefined): string =>
  (n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Con prefijo 'S/ ' (dashHelpers, CierreCajaPDF). OJO: no anteponer 'S/' de nuevo en el caller
// (bug ya visto una vez en Rentabilidad al mezclar helpers).
export const moneyPEN = (n: number | null | undefined): string => `S/ ${money(n)}`;

// 0 (o null) se pinta como '—', sin decimales — fiel al formato impreso del gerente (flujoShared:
// tablas del Flujo Consolidado y Detallado).
export const moneyDash = (n: number | null | undefined): string =>
  n == null || n === 0 ? '—' : n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
