// ========================================
// TIPOS PARA CAJA MICROSERVICE
// ========================================

// ========================================
// REQUEST TYPES - CAJA MAYOR
// ========================================

export interface CreateCajaMayorRequest {
  idTipoCaja: number;
  periodo: string;
  mes: string;
  anio: string;
  fechaInicio: string;
  fechaFin: string;
  saldoInicialMes: number;
  totalIngresos: number;
  totalEgresos: number;
  observacionesCierre?: string;
  insertaIdUsuario: number;
  detalle?: CajaMayorDetalleRequest[];
}

export interface UpdateCajaMayorRequest {
  idCajaMayor: number;
  idTipoCaja: number;
  periodo: string;
  mes: string;
  anio: string;
  fechaInicio: string;
  fechaFin: string;
  saldoInicialMes: number;
  totalIngresos: number;
  totalEgresos: number;
  observacionesCierre?: string;
  actualizaIdUsuario: number;
  detalle?: CajaMayorDetalleRequest[];
}

export interface CajaMayorDetalleRequest {
  idVenta?: string;
  codigoDocumento: string;
  tipoMovimiento: string; // 'I' = Ingreso, 'E' = Egreso
  conceptoMovimiento?: string;
  fechaMovimiento: string;
  subtotal: number;
  igv: number;
  total: number;
  numeroDocumento?: string;
  serieDocumento?: string;
  observaciones?: string;
}

export interface InsertCajaMayorDetalleRequest {
  idCajaMayor: number;
  idVenta?: string;
  codigoDocumento?: string;
  tipoMovimiento: string; // 'I' = Ingreso, 'E' = Egreso
  conceptoMovimiento: string;
  fechaMovimiento: string;
  subtotal: number;
  igv: number;
  total: number;
  numeroDocumento?: string;
  serieDocumento?: string;
  observaciones?: string;
  insertaIdUsuario: number;
}

export interface GetCajaMayorListRequest {
  idTipoCaja?: number;
  anio?: string;
  mes?: string;
  estadoCierre?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface CerrarCajaMayorRequest {
  idCajaMayor: number;
  observacionesCierre?: string;
  usuarioIdCierre: number;
}

export interface DeleteCajaMayorRequest {
  idCajaMayor: number;
  usuarioIdEliminacion: number;
}

// ========================================
// REQUEST TYPES - INGRESOS/EGRESOS MENSUALES
// ========================================

export interface CreateIngresoMensualRequest {
  idCajaMayor: number;
  idTipoIngresoMensual: number;
  conceptoIngreso: string;
  fechaIngreso: string;
  montoIngreso: number;
  numeroDocumento?: string;
  origen?: string;
  observaciones?: string;
  insertaIdUsuario: number;
}

export interface UpdateIngresoMensualRequest {
  idIngresoMensual: number;
  conceptoIngreso: string;
  fechaIngreso: string;
  montoIngreso: number;
  numeroDocumento?: string;
  origen?: string;
  observaciones?: string;
  actualizaIdUsuario: number;
}

export interface DeleteIngresoMensualRequest {
  idIngresoMensual: number;
  actualizaIdUsuario: number;
}

export interface GetIngresoMensualListRequest {
  idCajaMayor?: number;
  idTipoIngresoMensual?: number;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateEgresoMensualRequest {
  idCajaMayor: number;
  idTipoEgresoMensual: number;
  conceptoEgreso: string;
  fechaEgreso: string;
  montoEgreso: number;
  numeroDocumento?: string;
  beneficiario?: string;
  observaciones?: string;
  insertaIdUsuario: number;
}

export interface UpdateEgresoMensualRequest {
  idEgresoMensual: number;
  conceptoEgreso: string;
  fechaEgreso: string;
  montoEgreso: number;
  numeroDocumento?: string;
  beneficiario?: string;
  observaciones?: string;
  actualizaIdUsuario: number;
}

export interface DeleteEgresoMensualRequest {
  idEgresoMensual: number;
  actualizaIdUsuario: number;
}

export interface GetEgresoMensualListRequest {
  idCajaMayor?: number;
  idTipoEgresoMensual?: number;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: number;
  pageNumber?: number;
  pageSize?: number;
}

// ========================================
// REQUEST TYPES - TIPOS DE CAJA/INGRESO/EGRESO
// ========================================

export interface CreateTipoCajaRequest {
  nombreTipoCaja: string;
  descripcion?: string;
  insertaIdUsuario: number;
}

export interface UpdateTipoCajaRequest {
  idTipoCaja: number;
  nombreTipoCaja: string;
  descripcion?: string;
  actualizaIdUsuario: number;
}

export interface DeleteTipoCajaRequest {
  idTipoCaja: number;
  actualizaIdUsuario: number;
}

export interface GetTiposCajaRequest {
  includeInactive?: boolean;
}

export interface CreateTipoIngresoMensualRequest {
  nombreTipoIngreso: string;
  descripcion?: string;
  insertaIdUsuario: number;
}

export interface UpdateTipoIngresoMensualRequest {
  idTipoIngresoMensual: number;
  nombreTipoIngreso: string;
  descripcion?: string;
  actualizaIdUsuario: number;
}

export interface DeleteTipoIngresoMensualRequest {
  idTipoIngresoMensual: number;
  actualizaIdUsuario: number;
}

export interface GetTiposIngresoMensualRequest {
  includeInactive?: boolean;
}

export interface CreateTipoEgresoMensualRequest {
  nombreTipoEgreso: string;
  descripcion?: string;
  insertaIdUsuario: number;
}

export interface UpdateTipoEgresoMensualRequest {
  idTipoEgresoMensual: number;
  nombreTipoEgreso: string;
  descripcion?: string;
  actualizaIdUsuario: number;
}

export interface DeleteTipoEgresoMensualRequest {
  idTipoEgresoMensual: number;
  actualizaIdUsuario: number;
}

export interface GetTiposEgresoMensualRequest {
  includeInactive?: boolean;
}

export interface GetSaldoCajaRequest {
  idTipoCaja?: number;
}

// ========================================
// RESPONSE TYPES - CAJA MAYOR
// ========================================

export interface CreateCajaMayorResponse {
  idCajaMayor: number;
  isUpdate: boolean;
  mensaje: string;
  saldoFinal: number;
}

export interface CajaMayorListResponse {
  idCajaMayor: number;
  periodo: string;
  mes: string;
  anio: string;
  nombreTipoCaja: string;
  fechaInicio: string;
  fechaFin: string;
  saldoInicialMes: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoFinalMes: number;
  estadoCierre: number;
  estadoCierreDescripcion: string;
  fechaCierre?: string;
  observacionesCierre?: string;
  fechaCreacion: string;
  totalRecords: number;
}

export interface CajaMayorHeaderResponse {
  idCajaMayor: number;
  idTipoCaja: number;
  nombreTipoCaja: string;
  periodo: string;
  mes: string;
  anio: string;
  fechaInicio: string;
  fechaFin: string;
  saldoInicialMes: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoFinalMes: number;
  estadoCierre: number;
  fechaCierre?: string;
  observacionesCierre?: string;
  fechaCreacion: string;
}

export interface CajaMayorMovimientoResponse {
  idCajaMayorDetalle: number;
  idVenta?: string;
  codigoDocumento?: string;
  tipoMovimiento: string;
  tipoMovimientoDescripcion: string;
  conceptoMovimiento?: string;
  fechaMovimiento: string;
  subtotal: number;
  igv: number;
  total: number;
  numeroDocumento?: string;
  serieDocumento?: string;
  observaciones?: string;
  fechaRegistro: string;
}

export interface CajaMayorDetalleResponse {
  header: CajaMayorHeaderResponse;
  movimientos: CajaMayorMovimientoResponse[];
}

export interface CerrarCajaMayorResponse {
  idCajaMayor: number;
  mensaje: string;
  fechaCierre: string;
}

export interface DeleteCajaMayorResponse {
  idCajaMayor: number;
  mensaje: string;
}

// ========================================
// RESPONSE TYPES - INGRESOS/EGRESOS MENSUALES
// ========================================

export interface CreateIngresoMensualResponse {
  idIngresoMensual: number;
  mensaje: string;
  montoIngreso: number;
  nuevoSaldoCaja: number;
}

export interface UpdateIngresoMensualResponse {
  idIngresoMensual: number;
  mensaje: string;
  montoIngreso: number;
  nuevoSaldoCaja: number;
}

export interface DeleteIngresoMensualResponse {
  idIngresoMensual: number;
  mensaje: string;
  nuevoSaldoCaja: number;
}

export interface IngresoMensualListResponse {
  idIngresoMensual: number;
  idCajaMayor: number;
  periodoCajaMayor: string;
  idTipoIngresoMensual: number;
  nombreTipoIngreso: string;
  conceptoIngreso: string;
  fechaIngreso: string;
  montoIngreso: number;
  numeroDocumento?: string;
  origen?: string;
  observaciones?: string;
  estado: number;
  estadoDescripcion: string;
  fechaCreacion: string;
  totalRecords: number;
}

export interface CreateEgresoMensualResponse {
  idEgresoMensual: number;
  mensaje: string;
  montoEgreso: number;
  nuevoSaldoCaja: number;
}

export interface UpdateEgresoMensualResponse {
  idEgresoMensual: number;
  mensaje: string;
  montoEgreso: number;
  nuevoSaldoCaja: number;
}

export interface DeleteEgresoMensualResponse {
  idEgresoMensual: number;
  mensaje: string;
  nuevoSaldoCaja: number;
}

export interface EgresoMensualListResponse {
  idEgresoMensual: number;
  idCajaMayor: number;
  periodoCajaMayor: string;
  idTipoEgresoMensual: number;
  nombreTipoEgreso: string;
  conceptoEgreso: string;
  fechaEgreso: string;
  montoEgreso: number;
  numeroDocumento?: string;
  beneficiario?: string;
  observaciones?: string;
  estado: number;
  estadoDescripcion: string;
  fechaCreacion: string;
  totalRecords: number;
}

// ========================================
// RESPONSE TYPES - TIPOS DE CAJA/INGRESO/EGRESO
// ========================================

export interface CreateTipoCajaResponse {
  idTipoCaja: number;
  nombreTipoCaja: string;
  mensaje: string;
}

export interface UpdateTipoCajaResponse {
  idTipoCaja: number;
  mensaje: string;
}

export interface DeleteTipoCajaResponse {
  idTipoCaja: number;
  mensaje: string;
}

export interface TipoCajaResponse {
  idTipoCaja: number;
  nombreTipoCaja: string;
  descripcion?: string;
  estado: number;
  estadoDescripcion: string;
  fechaCreacion: string;
}

export interface CreateTipoIngresoMensualResponse {
  idTipoIngresoMensual: number;
  nombreTipoIngreso: string;
  mensaje: string;
}

export interface UpdateTipoIngresoMensualResponse {
  idTipoIngresoMensual: number;
  mensaje: string;
}

export interface DeleteTipoIngresoMensualResponse {
  idTipoIngresoMensual: number;
  mensaje: string;
}

export interface TipoIngresoMensualResponse {
  idTipoIngresoMensual: number;
  nombreTipoIngreso: string;
  descripcion?: string;
  estado: number;
  estadoDescripcion: string;
  fechaCreacion: string;
}

export interface CreateTipoEgresoMensualResponse {
  idTipoEgresoMensual: number;
  nombreTipoEgreso: string;
  mensaje: string;
}

export interface UpdateTipoEgresoMensualResponse {
  idTipoEgresoMensual: number;
  mensaje: string;
}

export interface DeleteTipoEgresoMensualResponse {
  idTipoEgresoMensual: number;
  mensaje: string;
}

export interface TipoEgresoMensualResponse {
  idTipoEgresoMensual: number;
  nombreTipoEgreso: string;
  descripcion?: string;
  estado: number;
  estadoDescripcion: string;
  fechaCreacion: string;
}

export interface SaldoCajaResponse {
  idSaldoCaja: number;
  idTipoCaja: number;
  nombreTipoCaja: string;
  saldoActual: number;
  ultimaActualizacion: string;
}

// ========================================
// UTILITY TYPES
// ========================================

export interface CajaEstadisticas {
  totalCajas: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoTotal: number;
  promedioMensual: number;
  cajasPorEstado: Record<string, number>;
}

export interface CajaFilters {
  fechaInicio?: string;
  fechaFin?: string;
  idTipoCaja?: number;
  estadoCierre?: number;
  busqueda?: string;
}

export interface CajaPaginatedResponse<T> {
  data: T[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ========================================
// API RESPONSE WRAPPER (Para mantener consistencia con facturacion.ts)
// ========================================

export interface CajaApiResponse<T> {
  status: number;
  description: string;
  objModel: T;
  token?: string;
  objPaginated?: {
    totalRecords?: number;
    totalPages?: number;
    currentPage?: number;
    pageSize?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

// ========================================
// TIPOS PARA CIERRE DE CAJA
// ========================================

export interface CierreCajaRequest {
  idTipoCaja: number;
  anio: string;
  mes: string;
}

export interface DatosCierreCajaResponse {
  fechaInicio: string;
  fechaFin: string;
  datos: import('./facturacion').GerenciaVentasDetalleResponse[];
  resumen: {
    totalRegistros: number;
    montoTotal: number;
    fechaGeneracion: string;
  };
}

export interface ResumenCierreCaja {
  totalRegistros: number;
  montoTotal: number;
  fechaGeneracion: string;
  periodo: string;
  nombreTipoCaja: string;
}

// ========================================
// TIPOS PARA FILTROS DE GERENCIA VENTAS
// ========================================

export interface FiltroBusquedaMSRequest {
  fechaInicio: string;
  fechaFin: string;
  fechaInicioRet2Meses: string;
}
