// Exportación a Excel de la Ficha Individual EPI (TAB 1) con las cabeceras EXACTAS del formato oficial
// DIRESA (leídas de `FICHA INDIVIDUAL EPI.xlsx` — se conservan los textos tal cual, incluidos los
// typos del formato: "Fecha de Hospitalziación", "Apellido materno" en minúscula, "Inicio de sintomas"
// duplicado). Usa SheetJS (xlsx), la misma librería que el resto del front.
import * as XLSX from 'xlsx';
import type { EpiFichaRow } from '../../../../services/contabilidad/contaTypes';

// Orden y textos EXACTOS de las 25 columnas del formato.
const HEADERS: string[] = [
  'Código Único',
  'Fecha de Atención',
  'Apellido Paterno',
  'Apellido materno',
  'Nombres',
  'RED',
  'Tipo Documento',
  'Numero Documento',
  'Fecha de Nacimiento',
  'Sexo',
  'Nacionalidad',
  'Etnia',
  'N° de Historia Clinica',
  'Fecha de Hospitalziación',
  'Edad',
  'País',
  'Departamento',
  'Provincia',
  'Distrito',
  'Procedencia',
  'Dirección exacta',
  'Referencia',
  'Diagnostico',
  'Inicio de sintomas',
  'Inicio de sintomas',
];

// Fecha ISO -> dd/MM/yyyy (o '' si null).
const f = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};
const s = (v: string | null | undefined): string => v ?? '';

// Convierte una fila del API a la fila (array) del Excel, en el orden exacto de HEADERS.
const toRow = (r: EpiFichaRow): (string | number)[] => [
  s(r.CodigoUnico),
  f(r.FechaAtencion),
  s(r.ApellidoPaterno),
  s(r.ApellidoMaterno),
  s(r.Nombres),
  s(r.Red),
  s(r.TipoDocumento),
  s(r.NumeroDocumento),
  f(r.FechaNacimiento),
  s(r.Sexo),
  s(r.Nacionalidad),
  s(r.Etnia),
  s(r.HistoriaClinica),
  f(r.FechaHospitalizacion),
  r.Edad ?? '',
  s(r.Pais),
  s(r.Departamento),
  s(r.Provincia),
  s(r.Distrito),
  s(r.Procedencia),
  s(r.DireccionExacta),
  s(r.Referencia),
  s(r.Diagnostico),
  s(r.InicioSintomas),
  s(r.InicioSintomasDup),
];

// Anchos de columna aproximados para legibilidad.
const COL_WIDTHS = [16, 14, 16, 16, 20, 16, 14, 14, 14, 10, 14, 12, 18, 16, 8, 10, 16, 16, 16, 20, 30, 14, 40, 22, 22];

// Genera y descarga el .xlsx con las 25 columnas. `sufijo` se añade al nombre (p.ej. rango/ámbito).
export function exportarFichaEpi(rows: EpiFichaRow[], sufijo?: string): void {
  const aoa: (string | number)[][] = [HEADERS, ...rows.map(toRow)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = COL_WIDTHS.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ficha Individual EPI');
  const nombre = `FICHA INDIVIDUAL EPI${sufijo ? ` ${sufijo}` : ''}.xlsx`;
  XLSX.writeFile(wb, nombre);
}
