// Fechas del dominio conta: SIEMPRE la fecha civil de Lima (America/Lima), nunca la del reloj UTC.
// Bug corregido (auditoria 2026-07-25, D1): new Date().toISOString().slice(0,10) devuelve la fecha
// UTC -> a partir de las 19:00 hora Lima (UTC-5) da el dia SIGUIENTE, y un egreso "pagado hoy" a las
// 8pm caia en la caja de manana. 'en-CA' formatea directamente como YYYY-MM-DD.
export const todayLima = (): string =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
