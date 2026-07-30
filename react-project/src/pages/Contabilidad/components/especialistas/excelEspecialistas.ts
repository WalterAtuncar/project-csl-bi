// Export a Excel (.xlsx) de las TRES listas del page /conta/especialistas (PLAN_ESPECIALISTAS §8.5, D10).
// 100% front con SheetJS (xlsx@0.18.5 ya instalado): book_new + aoa_to_sheet + !cols + writeFile.
// Funciones PURAS: reciben el dataset COMPLETO ya bajado del API (el caller re-pide con tamanio=0) y
// los filtros aplicados; no tocan HTTP/API/SP/BD. Los montos van como NUMBER en la celda (Excel debe
// poder sumar/filtrar); null -> celda vacia. NO se totalizan montos en el pie (D4: boletas compartidas
// entre 2 services sobrecontarian). Referida/Efectiva -> 'SI'/'NO'.
import * as XLSX from 'xlsx';
import type { EspecialistaResumen, EspecialistaAtencion, EspecialistaReferencia } from '../../../../services/contabilidad/contaTypes';

// Filtros aplicados, para la fila de contexto del encabezado de cada hoja.
export interface EspExcelFiltros {
  desde: string;        // YYYY-MM-DD
  hasta: string;        // YYYY-MM-DD
  especialidad: string; // 'Todas' o el nombre
  especialista: string; // 'Todos' o el nombre
  universo: string;     // universo de ventas incluido: 'Todos' o 'Asistencial, SISOL, ...'
}

type Celda = string | number;

// YYYY-MM-DD (o ISO datetime) -> dd/mm/yyyy por SPLIT del string (nunca new Date('YYYY-MM-DD'):
// el parse UTC corre el dia en Lima). Fiel a la convencion del modulo (excelCuadreCaja).
const fechaLegible = (iso: string | null): string => {
  const [y, m, d] = (iso || '').slice(0, 10).split('-');
  if (!y || !m || !d) return iso || '';
  return `${d}/${m}/${y}`;
};

// Nombre de archivo seguro a partir del username (sin espacios ni caracteres raros).
const slug = (s: string): string => (s || 'medico').trim().replace(/[^\w.-]+/g, '_').toLowerCase();

// Monto para celda de Excel: number tal cual, null -> '' (celda vacia). NO se formatea a string
// (Excel debe poder sumar/filtrar por numero).
const montoCelda = (n: number | null): Celda => (n == null ? '' : n);

// Filas de encabezado comunes (titulo + contexto de filtros + linea en blanco).
function encabezado(titulo: string, f: EspExcelFiltros): Celda[][] {
  return [
    [titulo],
    [`Rango: ${fechaLegible(f.desde)} a ${fechaLegible(f.hasta)}  ·  Especialidad: ${f.especialidad}  ·  Especialista: ${f.especialista}  ·  Universo: ${f.universo}`],
    [`Generado: ${new Date().toLocaleString('es-PE')}`],
    [],
  ];
}

function guardar(rows: Celda[][], cols: number[], nombreHoja: string, archivo: string): void {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = cols.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  XLSX.writeFile(wb, archivo);
}

// 1) Bandeja principal (resumen por especialista).
export function exportResumen(filas: EspecialistaResumen[], f: EspExcelFiltros): void {
  const rows: Celda[][] = encabezado('ESPECIALISTAS — RESUMEN', f);
  rows.push(['Especialidad', 'Usuario', 'Médico', 'Colegiatura', '# Especialidades', '# Atenciones', '# Referencias', '# Ref. efectivas', '% efectivas']);
  filas.forEach((r) => rows.push([
    r.Especialidad ?? '—',
    r.UserName,
    r.Medico,
    r.Colegiatura,
    r.NumEspecialidades,
    r.NumAtenciones,
    r.NumReferencias,
    r.NumReferenciasEfectivas,
    r.NumReferencias > 0 ? `${((r.NumReferenciasEfectivas / r.NumReferencias) * 100).toFixed(1)}%` : '—',
  ]));
  guardar(rows, [26, 18, 30, 14, 15, 13, 13, 15, 11], 'Resumen', `especialistas-resumen-${f.desde}_${f.hasta}.xlsx`);
}

// 2) Atenciones de un medico.
export function exportAtenciones(filas: EspecialistaAtencion[], medico: { UserName: string; Medico: string }, f: EspExcelFiltros): void {
  const rows: Celda[][] = encabezado(`ATENCIONES — ${medico.Medico} (${medico.UserName})`, f);
  rows.push(['#', 'Fecha', 'Consultorio', 'Paciente', 'Estado', 'Nro Comprobante', 'Tipo Comprobante', 'Monto', 'Diagnósticos', '¿Referida?', 'Referido por']);
  filas.forEach((r, i) => rows.push([
    i + 1,
    fechaLegible(r.FechaAtencion),
    r.Consultorio ?? '—',
    r.Paciente ?? '—',
    r.EstadoAtencion,
    r.NroComprobante ?? '—',
    r.TipoComprobante ?? '—',
    montoCelda(r.MontoComprobante),
    r.Diagnosticos ?? '—',
    r.Referida ? 'SI' : 'NO',
    r.ReferidoPor ?? '—',
  ]));
  guardar(rows, [5, 12, 22, 30, 16, 18, 16, 12, 50, 10, 26], 'Atenciones', `atenciones-${slug(medico.UserName)}-${f.desde}_${f.hasta}.xlsx`);
}

// 3) Referencias hechas por un medico (a servicio referido distinto).
export function exportReferencias(filas: EspecialistaReferencia[], medico: { UserName: string; Medico: string }, f: EspExcelFiltros): void {
  const rows: Celda[][] = encabezado(`REFERENCIAS — ${medico.Medico} (${medico.UserName})`, f);
  rows.push(['#', 'Fecha', 'Consultorio destino', 'Componentes referidos', 'Médico ejecutor', '¿Efectiva?', 'Nro Comprobante', 'Tipo Comprobante', 'Monto']);
  filas.forEach((r, i) => rows.push([
    i + 1,
    fechaLegible(r.FechaAtencion),
    r.ConsultorioDestino ?? '—',
    r.ComponentesReferidos ?? '—',
    r.MedicoEjecutor ?? '—',
    r.Efectiva ? 'SI' : 'NO',
    r.NroComprobante ?? '—',
    r.TipoComprobante ?? '—',
    montoCelda(r.MontoComprobante),
  ]));
  guardar(rows, [5, 12, 24, 40, 26, 10, 18, 16, 12], 'Referencias', `referencias-${slug(medico.UserName)}-${f.desde}_${f.hasta}.xlsx`);
}
