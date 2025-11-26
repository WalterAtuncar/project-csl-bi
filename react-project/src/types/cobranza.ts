/**
 * Tipos específicos para el servicio de cobranza
 */

// Tipos para estadísticas de ventas
export interface EstadisticasVentas {
  totalVentas: number;
  totalIngresos: number;
  totalAnulaciones: number;
  promedioVenta: number;
  ventasPorTipo: Record<string, number>;
}

// Tipos para reportes avanzados
export interface ReporteVentasAvanzadoRequest {
  tipoReporte: 'asistencial' | 'ocupacional' | 'mtc' | 'farmacia' | 'global';
  incluirAnuladas?: boolean;
  agruparPor?: 'dia' | 'semana' | 'mes';
  fechaInicio: string;
  fechaFin: string;
  fechaInicioRet2Meses?: string;
  fechaInicioRetard?: string;
  pacienteDni?: string;
  tipoVenta?: string;
  comprobante?: string;
}

// Tipos para exportación
export interface DatosExportacion {
  'ID Venta'?: string;
  'Fecha'?: string;
  'Paciente'?: string;
  'Servicio'?: string;
  'Importe'?: number;
  'Estado'?: string;
  'Tipo'?: string;
  'ID Liquidación'?: string;
  'Empresa'?: string;
  'Monto'?: number;
  'Observaciones'?: string;
  'Período'?: string;
  'Indicador'?: string;
  'Valor'?: number;
  'Unidad'?: string;
  'Tendencia'?: string;
}

// Tipos para rangos de fechas
export interface RangoFechas {
  fechaInicio: string;
  fechaFin: string;
}

// Tipos para filtros de búsqueda extendidos
export interface FiltroBusquedaExtendido {
  fechaInicio: string;
  fechaFin: string;
  empresa?: string;
  tipoServicio?: string;
  estado?: string;
  paciente?: string;
  medico?: string;
  ordenarPor?: string;
  orden?: 'asc' | 'desc';
  pagina?: number;
  elementosPorPagina?: number;
}

// Tipos para resumen consolidado
export interface ResumenConsolidadoCierreCaja {
  asistencial: unknown[];
  asistencialSISOL: unknown[];
  ocupacional: unknown[];
  mtc: unknown[];
  farmacia: unknown[];
  sanLorenzoGlobal: unknown[];
}

// Tipos para manejo de errores
export interface CobranzaError {
  code: string;
  message: string;
  operation: string;
  timestamp: Date;
  details?: unknown;
}

// Tipos para configuración del servicio
export interface CobranzaServiceConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  enableLogging: boolean;
}

// Tipos para métricas de rendimiento
export interface MetricasRendimiento {
  tiempoRespuesta: number;
  intentos: number;
  exito: boolean;
  timestamp: Date;
  endpoint: string;
}

// Tipos para caché de datos
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

// Tipos para notificaciones del servicio
export interface NotificacionCobranza {
  tipo: 'info' | 'warning' | 'error' | 'success';
  mensaje: string;
  timestamp: Date;
  accion?: string;
  datos?: unknown;
}
