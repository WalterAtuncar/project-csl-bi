// Helpers de Excel para Honorarios Médicos (portados del page legacy, sin dependencias legacy).
// 1) Descarga de la "Plantilla de atenciones" (2 hojas: Instrucciones + Plantilla Atenciones).
// 2) Normalizador de fechas a ddMMyyyy para el cruce del Excel contra el análisis.
import * as XLSX from 'xlsx';

// Descarga el XLSX de 2 hojas (Instrucciones + Plantilla Atenciones), calcado del legacy.
export function descargarPlantillaAtenciones(): void {
  const workbook = XLSX.utils.book_new();

  // Hoja 1: instrucciones
  const instructionsData: string[][] = [
    ['INSTRUCCIONES PARA LLENAR LA PLANTILLA DE ATENCIONES'],
    [''],
    ['Esta plantilla debe ser llenada con los datos de las boletas de las atenciones.'],
    ['Por favor, siga las siguientes indicaciones para cada columna:'],
    [''],
    ['FECHA SERVICIO: (OBLIGATORIO)'],
    ['- Formato: DD/MM/YYYY (ejemplo: 05/06/2025)'],
    ['- Descripción: fecha de EMISIÓN de la boleta — la impresa en el comprobante (dd/mm/aaaa).'],
    ['- Ejemplo: 05/06/2025'],
    [''],
    ['PACIENTE: (OPCIONAL)'],
    ['- Formato: APELLIDOS, NOMBRES (todo en mayúsculas)'],
    ['- Descripción: Nombre completo del paciente'],
    ['- Ejemplo: GARCIA LOPEZ, MARIA ELENA'],
    [''],
    ['COMPROBANTE: (OBLIGATORIO)'],
    ['- Formato: tal como está impreso: SERIE-NÚMERO (ejemplo: B008-00074950)'],
    ['- Descripción: Código del comprobante de la boleta'],
    ['- Ejemplo: B008-00074950'],
    [''],
    ['MONTO (S/): (OBLIGATORIO)'],
    ['- Formato: número con decimales (ejemplo: 296.00)'],
    ['- Descripción: TOTAL de la boleta tal como está impreso, con decimales (ej. 296.00).'],
    ['- Si la boleta incluye servicios de otras áreas, igual anote el TOTAL impreso.'],
    ['- Ejemplo: 296.00'],
    [''],
    ['NOTAS IMPORTANTES:'],
    ['- Complete los campos obligatorios: FECHA SERVICIO, COMPROBANTE y MONTO (S/).'],
    ['- Verifique que las fechas sean válidas'],
    ['- Asegúrese de que los nombres estén correctamente escritos'],
    ['- No modifique ni borre la fila de cabeceras de las columnas'],
    ['- Una fila por boleta; puede agregar tantas filas como necesite'],
    ['- No deje filas a medias (incompletas) ni filas vacías entre registros'],
    ['- Las filas con ejemplos son solo para referencia'],
    [''],
    ['PASOS A SEGUIR:'],
    ['1. Vaya a la hoja "Plantilla Atenciones"'],
    ['2. Complete los datos a partir de la fila 2 (reemplace los ejemplos)'],
    ['3. Guarde el archivo cuando termine'],
    ['4. Cargue el archivo en el modal de "Generar Nuevo Pago"'],
    [''],
    ['En caso de dudas, comuníquese con el administrador.'],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsSheet['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

  // Hoja 2: plantilla a llenar. La columna D "Monto (S/)" va APPEND al final (el parser es
  // posicional: A=fecha, C=comprobante, D=monto; insertar en medio rompería la lectura).
  const templateData: (string | number)[][] = [
    ['Fecha Servicio', 'Paciente', 'Comprobante', 'Monto (S/)'],
    ['05/06/2025', 'GARCIA LOPEZ, MARIA ELENA', 'B008-00074950', 296.00],
    ['05/06/2025', 'RODRIGUEZ PEREZ, JUAN CARLOS', 'B008-00074951', 296.00],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(templateData);
  worksheet['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Atenciones');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  XLSX.writeFile(workbook, `plantilla-atenciones-${timestamp}.xlsx`);
}

// Normaliza cualquier representación de fecha a ddMMyyyy (port EXACTO del legacy):
// serial de Excel con bug 1900, DD/MM/YYYY, YYYY-MM-DD, DD.MM.YYYY, 8 dígitos (DDMMYYYY o YYYYMMDD).
export function formatDateToDDMMYYYY(dateString: string): string {
  try {
    let cleaned = (dateString ?? '').toString().trim();
    if (cleaned.startsWith("'")) cleaned = cleaned.substring(1);

    // Serial de Excel (numérico puro, sin separadores)
    const numericValue = parseFloat(cleaned);
    if (!isNaN(numericValue) && numericValue > 0 && !cleaned.includes('/') && !cleaned.includes('-')) {
      const excelEpoch = new Date(1900, 0, 1);
      // Bug de Excel: 1900 tratado como bisiesto -> restar 1 día si el serial >= 60
      const adjustedSerial = numericValue >= 60 ? numericValue - 1 : numericValue;
      const date = new Date(excelEpoch.getTime() + (adjustedSerial - 1) * 24 * 60 * 60 * 1000);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString();
      return `${day}${month}${year}`;
    }

    // DD/MM/YYYY
    if (cleaned.includes('/')) {
      const parts = cleaned.split('/');
      if (parts.length === 3) return `${parts[0].padStart(2, '0')}${parts[1].padStart(2, '0')}${parts[2]}`;
    } else if (cleaned.includes('-')) {
      // YYYY-MM-DD (parse directo, luego manual)
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        return `${day}${month}${year}`;
      }
      const parts = cleaned.split('-');
      if (parts.length === 3) return `${parts[2].padStart(2, '0')}${parts[1].padStart(2, '0')}${parts[0]}`;
    } else if (cleaned.includes('.')) {
      // DD.MM.YYYY (europeo con puntos)
      const parts = cleaned.split('.');
      if (parts.length === 3) return `${parts[0].padStart(2, '0')}${parts[1].padStart(2, '0')}${parts[2]}`;
    } else if (/^\d{8}$/.test(cleaned)) {
      // 8 dígitos: DDMMYYYY o YYYYMMDD
      const firstTwo = parseInt(cleaned.substring(0, 2), 10);
      const firstFour = parseInt(cleaned.substring(0, 4), 10);
      if (firstFour >= 1900 && firstFour <= 2100) {
        const year = cleaned.substring(0, 4);
        const month = cleaned.substring(4, 6);
        const day = cleaned.substring(6, 8);
        return `${day}${month}${year}`;
      }
      if (firstTwo >= 1 && firstTwo <= 31) return cleaned;
      return cleaned;
    } else {
      return cleaned.replace(/\D/g, '');
    }
  } catch {
    return '';
  }
  return '';
}

// Primer token del campo comprobante (separado por '|').
export function getFirstComprobante(comprobante?: string): string {
  if (!comprobante || comprobante.trim() === '') return '';
  return (comprobante.split('|')[0] || '').trim();
}

// ---------------------------------------------------------------------------
// Núcleo PURO de la validación por plantilla (boleta + fecha + monto).
// Se extrae aquí para que sea testeable sin React; el modal solo lo orquesta.
// ---------------------------------------------------------------------------

// Normaliza el comprobante del Excel: trim + UPPER, y si matchea SERIE-correlativo,
// zero-pad del correlativo a 8 dígitos (el correlativo real SIEMPRE es 8 dígitos → salva
// "B008-107041"). Si no matchea (sin guión / caracteres raros), se devuelve trim+upper tal
// cual (fallará el match y caerá en "No se encuentra en el sistema" — sin heurísticas mágicas).
export function normComprobante(c: unknown): string {
  const s = String(c ?? '').trim().toUpperCase();
  const m = s.match(/^([A-Z0-9]+)-(\d{1,8})$/);
  return m ? `${m[1]}-${m[2].padStart(8, '0')}` : s;
}

// Parsea un monto que puede venir como número (celda numérica) o texto ("S/ 296,00",
// "1,296.00", "1.296,00", "296"). Quita símbolo de moneda, espacios y separadores de miles;
// acepta coma o punto como separador decimal. Devuelve null si no es parseable.
export function parseMonto(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (s === '') return null;
  s = s.replace(/[^\d.,-]/g, ''); // quita 'S/', espacios, letras y símbolos
  if (!/\d/.test(s)) return null;
  const nDots = (s.match(/\./g) || []).length;
  const nCommas = (s.match(/,/g) || []).length;
  if (nDots > 0 && nCommas > 0) {
    // ambos presentes: el que aparece más a la derecha es el decimal; el otro, miles
    if (s.lastIndexOf('.') > s.lastIndexOf(',')) s = s.replace(/,/g, '');
    else s = s.replace(/\./g, '').replace(/,/g, '.');
  } else if (nCommas > 1) {
    s = s.replace(/,/g, ''); // varias comas → miles
  } else if (nCommas === 1) {
    s = s.replace(',', '.'); // una coma → decimal
  } else if (nDots > 1) {
    s = s.replace(/\./g, ''); // varios puntos → miles
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export interface FilaPlantilla { fecha: string; comprobanteNorm: string; monto: number; filaN: number; }
export interface ErrorPlantilla { comprobante: string; motivo: string; }
export interface ParsePlantillaResult { plantillaVieja: boolean; filas: FilaPlantilla[]; errores: ErrorPlantilla[]; }

// Parsea el AOA (sheet_to_json header:1) de la hoja 'Plantilla Atenciones' (posicional
// A=fecha, C=comprobante, D=monto). Reglas: detecta plantilla vieja por cabecera D1 (debe
// empezar con 'Monto'); fila con ALGUNO pero no todos → 'Fila incompleta'; monto no parseable
// → 'Monto inválido'; comprobante repetido → 1ª cuenta, resto 'Comprobante duplicado'.
export function parsePlantilla(aoa: (string | number | undefined)[][]): ParsePlantillaResult {
  const header = aoa[0] || [];
  const d1 = String(header[3] ?? '').trim();
  if (!/^monto/i.test(d1)) return { plantillaVieja: true, filas: [], errores: [] };

  const filas: FilaPlantilla[] = [];
  const errores: ErrorPlantilla[] = [];
  const vistos = new Set<string>();
  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i] || [];
    const fechaRaw = r[0];
    const compRaw = r[2];
    const montoRaw = r[3];
    const hasFecha = fechaRaw != null && String(fechaRaw).trim() !== '';
    const hasComp = compRaw != null && String(compRaw).trim() !== '';
    const hasMonto = montoRaw != null && String(montoRaw).trim() !== '';
    if (!hasFecha && !hasComp && !hasMonto) continue; // fila vacía → se ignora
    const filaN = i + 1; // Excel es 1-based con cabecera en fila 1
    if (!hasFecha || !hasComp || !hasMonto) {
      errores.push({ comprobante: hasComp ? normComprobante(compRaw) : '—', motivo: `Fila incompleta en la plantilla (fila ${filaN})` });
      continue;
    }
    const comprobanteNorm = normComprobante(compRaw);
    const monto = parseMonto(montoRaw);
    if (monto == null) { errores.push({ comprobante: comprobanteNorm, motivo: `Monto inválido (fila ${filaN})` }); continue; }
    if (vistos.has(comprobanteNorm)) { errores.push({ comprobante: comprobanteNorm, motivo: `Comprobante duplicado en la plantilla (fila ${filaN})` }); continue; }
    vistos.add(comprobanteNorm);
    filas.push({ fecha: String(fechaRaw), comprobanteNorm, monto, filaN });
  }
  return { plantillaVieja: false, filas, errores };
}

// Fila del sistema (análisis) reducida a lo que necesita el cruce. El comprobante ya viene
// canónico (getFirstComprobante) y la fecha ya sliceada a 'dd/MM/yyyy' (soloFechaPago).
export interface FilaSistema { _key: string; medicoId: number; esPagado: number; comprobante: string; fechaDia: string; monto: number; }
export interface MatchResult { validKeys: Set<string>; medicosDeValidos: Set<number>; errores: ErrorPlantilla[]; }

// Cruce definitivo: por cada fila del sistema, busca su fila de plantilla por comprobante
// normalizado y valida fecha (día exacto) + monto (|Δ| <= 0.01). Una boleta fan-out
// (varias filas de sistema con mismo comprobante/fecha/monto) valida TODAS sus filas.
// Para cada fila de plantilla que no matcheó ninguna, se emite el motivo más informativo.
export function matchPlantilla(rowsSistema: FilaSistema[], filas: FilaPlantilla[]): MatchResult {
  const validKeys = new Set<string>();
  const medicosDeValidos = new Set<number>();
  const errores: ErrorPlantilla[] = [];

  const porComp = new Map<string, FilaPlantilla>();
  filas.forEach((f) => porComp.set(f.comprobanteNorm, f));

  const usados = new Set<string>(); // comprobantes de plantilla que matchearon ≥1 fila
  rowsSistema.forEach((row) => {
    const f = porComp.get(row.comprobante);
    if (!f) return; // sin fila de plantilla → queda inválida (XCircle), sin error de plantilla
    const fechaOk = formatDateToDDMMYYYY(f.fecha) === formatDateToDDMMYYYY(row.fechaDia);
    // Comparacion por centavos ENTEROS: evita el borde no-determinista de IEEE-754
    // (|80.01-80.00| = 0.01000000000000512 > 0.01). Tolerancia = 1 centavo exacto.
    const montoOk = Math.abs(Math.round(f.monto * 100) - Math.round(row.monto * 100)) <= 1;
    if (fechaOk && montoOk) {
      validKeys.add(row._key);
      usados.add(f.comprobanteNorm);
      if (row.esPagado !== 1) medicosDeValidos.add(row.medicoId);
    }
  });

  filas.forEach((f) => {
    if (usados.has(f.comprobanteNorm)) return; // matcheó → sin error
    const candidatos = rowsSistema.filter((row) => row.comprobante === f.comprobanteNorm);
    if (candidatos.length === 0) { errores.push({ comprobante: f.comprobanteNorm, motivo: 'No se encuentra en el sistema' }); return; }
    const conFechaOk = candidatos.filter((row) => formatDateToDDMMYYYY(f.fecha) === formatDateToDDMMYYYY(row.fechaDia));
    if (conFechaOk.length === 0) { errores.push({ comprobante: f.comprobanteNorm, motivo: 'No coincide la fecha' }); return; }
    errores.push({ comprobante: f.comprobanteNorm, motivo: `No coincide el monto (plantilla: ${f.monto.toFixed(2)} / sistema: ${conFechaOk[0].monto.toFixed(2)})` });
  });

  return { validKeys, medicosDeValidos, errores };
}
