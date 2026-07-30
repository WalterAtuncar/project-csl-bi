// Formateo de celdas del resultado NLQ por el Formato que declara CADA columna (el API dice el tipo en
// Columnas[i].Formato -> el front NO adivina). Moneda: SIEMPRE utils/money.ts (fuente canonica del modulo).
import { moneyPEN } from '../../../utils/money';
import type { NlqCelda, NlqChartTipo, NlqColumna, NlqFormato } from '../../../services/contabilidad/contaTypes';

const esNumericoFormato = (f: NlqFormato): boolean => f === 'money' || f === 'int' || f === 'pct';
export const esColumnaNumerica = (c: NlqColumna): boolean => esNumericoFormato(c.Formato);

// Fecha ISO ('YYYY-MM-DD' o 'YYYY-MM-DDThh:mm:ss') -> 'dd/MM/yyyy' (+ 'hh:mm' si trae hora util) SIN
// conversion de zona. Mismo espiritu que utils/fechas.ts::todayLima: NUNCA dejar que UTC mueva la fecha
// civil. new Date('2026-06-30') = 30-jun UTC = 29-jun en Lima (bug real ya visto); por eso se hace por
// slice del string, no via Date.
export function formatFecha(valor: NlqCelda): string {
  if (valor == null || valor === '') return '—';
  const s = String(valor);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const [, y, mo, d] = m;
  const hm = s.slice(10).match(/(\d{2}):(\d{2})/);
  return hm && !(hm[1] === '00' && hm[2] === '00') ? `${d}/${mo}/${y} ${hm[1]}:${hm[2]}` : `${d}/${mo}/${y}`;
}

// Formatea una celda por el Formato de su columna. money -> moneyPEN (S/ 1,234.00); int -> entero es-PE;
// pct -> N%; date -> formatFecha (TZ-safe); text -> string (con Si/No para booleanos).
export function formatCelda(valor: NlqCelda, formato: NlqFormato): string {
  if (valor == null || valor === '') return '—';
  switch (formato) {
    case 'money':
      return moneyPEN(typeof valor === 'number' ? valor : Number(valor));
    case 'int': {
      const n = typeof valor === 'number' ? valor : Number(valor);
      return Number.isFinite(n) ? Math.round(n).toLocaleString('es-PE') : String(valor);
    }
    case 'pct': {
      const n = typeof valor === 'number' ? valor : Number(valor);
      return Number.isFinite(n)
        ? `${n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
        : String(valor);
    }
    case 'date':
      return formatFecha(valor);
    case 'text':
    default:
      return valor === true ? 'Sí' : valor === false ? 'No' : String(valor);
  }
}

// Coaccion a number para los ejes/valores de recharts. null/no-numerico -> 0.
export function toNumero(valor: NlqCelda): number {
  if (valor == null) return 0;
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
}

// Clase de alineacion de la celda: numericas a la derecha con tabular-nums.
export const alineacion = (c: NlqColumna): string => (esColumnaNumerica(c) ? 'text-right tabular-nums' : 'text-left');

// Orden fijo de presentacion de los tipos de grafico (el switcher y el helper lo respetan).
const ORDEN_TIPOS: NlqChartTipo[] = ['bar', 'stackedBar', 'line', 'area', 'pie', 'donut', 'radar', 'scatter', 'kpi', 'tabla'];

// Que tipos de grafico tienen sentido para la forma del resultado (columnas x filas). No decide el mejor,
// solo filtra los que NO encajan (evita ofrecer un pie sin dimension, un scatter con 1 sola numerica, etc).
// dims = columnas no-numericas (fecha/texto). 'tabla' SIEMPRE disponible; 'kpi' con al menos 1 fila.
export function tiposCompatibles(columnas: NlqColumna[], nFilas: number): NlqChartTipo[] {
  const numericas = columnas.filter(esColumnaNumerica).length;
  const dims = columnas.length - numericas;
  const n = nFilas;
  const set = new Set<NlqChartTipo>();

  if (numericas >= 1 && n >= 1) { set.add('bar'); set.add('line'); set.add('area'); }
  if (numericas >= 2 && n >= 1) { set.add('stackedBar'); set.add('scatter'); }
  if (numericas >= 1 && dims >= 1 && n >= 1) { set.add('pie'); set.add('donut'); }
  if (numericas >= 1 && dims >= 1 && n >= 3) { set.add('radar'); }
  if (n >= 1) { set.add('kpi'); }
  set.add('tabla');

  return ORDEN_TIPOS.filter((t) => set.has(t));
}
