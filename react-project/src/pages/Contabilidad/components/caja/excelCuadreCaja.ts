// Export a Excel (.xlsx) del "Cuadre de caja diario" (/conta/caja). 100% front — WYSIWYG:
// recibe EXACTAMENTE las filas ya filtradas en pantalla y los totales de los memos existentes.
// No toca service HTTP / API / SP / BD. Los montos van como NUMBER en las celdas (Excel debe poder
// sumar/filtrar); solo los rótulos son strings. El "Origen" de egresos ya llega traducido (labelOrigen)
// desde CajaDiaria.tsx — aquí jamás debe aparecer la palabra "legacy".
import * as XLSX from 'xlsx';
import { unidadCorto } from '../dashboard/dashHelpers';
import { CLINICA } from '../honorarios/ReciboPDF';

// Contrato compartido: el MISMO payload alimenta el Excel y el PDF (CierreCajaPDF lo importa).
export interface CuadreExportData {
  fecha: string; // diaSeleccionado (YYYY-MM-DD)
  generadoPor: string; // Username de la sesión conta
  // WYSIWYG: filas YA filtradas; Origen de egreso YA pasado por labelOrigen() en el caller.
  ingresos: { Documento: string; Unidad: string; FormaPago: string; Condicion: 'CONTADO' | 'CRÉDITO'; Cajero: string; Monto: number }[];
  egresos: { Origen: string; Documento: string; Unidad: string; Concepto: string; Monto: number }[];
  totalesPorFormaPago: [string, number][]; // desc, del memo existente
  totalesPorTipoCaja: [string, number][]; // desc, del memo existente (solo ingresos)
  totalIngresos: number;
  totalEgresos: number;
  neto: number;
  // Estado de filtros para el encabezado (WYSIWYG):
  filtroUnidades: string[] | null; // null = todas; si no, unidadCorto() de las seleccionadas
  filtroMedios: string | null; // null = sin filtro; si no, "N de M medios" (+ " · crédito excluido")
}

export interface ResumenUnidadRow {
  unidad: string; // ya renderizada con unidadCorto
  ingresos: number;
  egresos: number;
  neto: number;
}

// YYYY-MM-DD -> dd/mm/yyyy por SPLIT del string (nunca new Date('YYYY-MM-DD'): parse UTC corre el día en Lima).
const fechaLegible = (iso: string): string => {
  const [y, m, d] = (iso || '').slice(0, 10).split('-');
  if (!y || !m || !d) return iso || '';
  return `${d}/${m}/${y}`;
};

// Matriz "Resumen por unidad" compartida con el PDF: ingresos vienen de totalesPorTipoCaja (solo ingresos);
// los egresos se agrupan aquí por Unidad (client-side). Incluye unidades que solo tienen egresos (ingresos 0).
export function resumenPorUnidad(data: CuadreExportData): ResumenUnidadRow[] {
  const map = new Map<string, { ingresos: number; egresos: number }>();
  const bump = (k: string, patch: { ingresos?: number; egresos?: number }) => {
    const cur = map.get(k) ?? { ingresos: 0, egresos: 0 };
    map.set(k, { ingresos: cur.ingresos + (patch.ingresos ?? 0), egresos: cur.egresos + (patch.egresos ?? 0) });
  };
  data.totalesPorTipoCaja.forEach(([u, monto]) => bump(unidadCorto(u), { ingresos: monto }));
  data.egresos.forEach((e) => bump(unidadCorto(e.Unidad || 'SIN UNIDAD'), { egresos: e.Monto }));
  return [...map.entries()]
    .map(([unidad, v]) => ({ unidad, ingresos: v.ingresos, egresos: v.egresos, neto: v.ingresos - v.egresos }))
    .sort((a, b) => b.ingresos - a.ingresos || b.neto - a.neto);
}

export function exportarCuadreCajaExcel(data: CuadreExportData): void {
  const rows: (string | number)[][] = [];

  // --- Encabezado ---
  rows.push([CLINICA.nombre]);
  rows.push([`CUADRE DE CAJA DIARIO — ${fechaLegible(data.fecha)}`]);
  rows.push([`Tipos de caja: ${data.filtroUnidades && data.filtroUnidades.length ? data.filtroUnidades.join(', ') : 'TODAS'}`]);
  rows.push([`Medios de pago: ${data.filtroMedios ?? 'Todos'}`]);
  rows.push([`Generado por: ${data.generadoPor} · ${new Date().toLocaleString('es-PE')}`]);
  rows.push([]);

  // --- INGRESOS ---
  rows.push(['INGRESOS']);
  rows.push(['#', 'Documento', 'Unidad', 'Forma de pago', 'Condición', 'Cajero', 'Monto']);
  data.ingresos.forEach((r, i) => rows.push([i + 1, r.Documento, unidadCorto(r.Unidad), r.FormaPago, r.Condicion, r.Cajero, r.Monto]));
  rows.push(['TOTAL INGRESOS', '', '', '', '', '', data.totalIngresos]);
  rows.push([]);

  // --- EGRESOS (se omite el bloque completo si no hay egresos) ---
  if (data.egresos.length > 0) {
    rows.push(['EGRESOS']);
    rows.push(['#', 'Origen', 'Documento', 'Unidad', 'Concepto', 'Monto']);
    data.egresos.forEach((r, i) => rows.push([i + 1, r.Origen, r.Documento, unidadCorto(r.Unidad), r.Concepto, r.Monto]));
    rows.push(['TOTAL EGRESOS', '', '', '', '', data.totalEgresos]);
    rows.push([]);
  }

  // --- CONSOLIDADO ---
  rows.push(['CONSOLIDADO']);
  rows.push(['Totales por forma de pago']);
  data.totalesPorFormaPago.forEach(([fp, monto]) => {
    const pct = data.totalIngresos > 0 ? (monto / data.totalIngresos) * 100 : 0;
    rows.push([fp, monto, `${pct.toFixed(1)}%`]);
  });
  rows.push(['Total ingresos', data.totalIngresos]);
  rows.push(['Total egresos', data.totalEgresos]);
  rows.push(['NETO DEL DÍA', data.neto]);
  rows.push([]);

  // --- Resumen por tipo de caja (unidad) ---
  rows.push(['Resumen por tipo de caja (unidad)']);
  rows.push(['Unidad', 'Ingresos', 'Egresos', 'Neto']);
  resumenPorUnidad(data).forEach((u) => rows.push([u.unidad, u.ingresos, u.egresos, u.neto]));

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 11 }, { wch: 14 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Cuadre ${data.fecha}`);
  XLSX.writeFile(wb, `cuadre-caja-${data.fecha}.xlsx`);
}
