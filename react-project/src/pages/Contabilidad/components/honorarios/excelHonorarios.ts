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
    ['Esta plantilla debe ser llenada con los datos de las atenciones médicas realizadas.'],
    ['Por favor, siga las siguientes indicaciones para cada columna:'],
    [''],
    ['FECHA SERVICIO: (OBLIGATORIO)'],
    ['- Formato: DD/MM/YYYY (ejemplo: 05/06/2025)'],
    ['- Descripción: Fecha en que se realizó la atención médica'],
    ['- Ejemplo: 05/06/2025'],
    [''],
    ['PACIENTE: (OPCIONAL)'],
    ['- Formato: APELLIDOS, NOMBRES (todo en mayúsculas)'],
    ['- Descripción: Nombre completo del paciente'],
    ['- Ejemplo: GARCIA LOPEZ, MARIA ELENA'],
    [''],
    ['COMPROBANTE: (OBLIGATORIO)'],
    ['- Formato: B008-00074XXX (donde XXX son números)'],
    ['- Descripción: Código del comprobante de la atención'],
    ['- Ejemplo: B008-00074950'],
    [''],
    ['NOTAS IMPORTANTES:'],
    ['- Complete los campos obligatorios: FECHA SERVICIO y COMPROBANTE'],
    ['- Verifique que las fechas sean válidas'],
    ['- Asegúrese de que los nombres estén correctamente escritos'],
    ['- No modifique las cabeceras de las columnas'],
    ['- Puede agregar tantas filas como necesite'],
    ['- No deje filas vacías entre registros'],
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

  // Hoja 2: plantilla a llenar
  const templateData: string[][] = [
    ['Fecha Servicio', 'Paciente', 'Comprobante'],
    ['05/06/2025', 'GARCIA LOPEZ, MARIA ELENA', 'B008-00074950'],
    ['05/06/2025', 'RODRIGUEZ PEREZ, JUAN CARLOS', 'B008-00074951'],
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(templateData);
  worksheet['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 20 }];
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
