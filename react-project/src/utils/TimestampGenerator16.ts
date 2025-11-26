/**
 * Generador de timestamp de 16 dígitos en formato yyMMddHHmmssxxxx
 */
export class TimestampGenerator16 {
  
  /**
   * Genera un timestamp de 16 dígitos en formato yyMMddHHmmssxxxx
   * @param date Fecha opcional, si no se proporciona usa la fecha actual
   * @returns String de 16 dígitos con el formato especificado
   */
  static generate(date?: Date): string {
    const now = date || new Date();
    
    // Extraer componentes de fecha y hora
    const year = now.getFullYear().toString().slice(-2); // Últimos 2 dígitos del año
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // 01-12
    const day = now.getDate().toString().padStart(2, '0'); // 01-31
    const hours = now.getHours().toString().padStart(2, '0'); // 00-23
    const minutes = now.getMinutes().toString().padStart(2, '0'); // 00-59
    const seconds = now.getSeconds().toString().padStart(2, '0'); // 00-59
    const milliseconds = now.getMilliseconds().toString().padStart(4, '0'); // 0000-9999
    
    // Combinar todos los componentes
    return year + month + day + hours + minutes + seconds + milliseconds;
  }
} 