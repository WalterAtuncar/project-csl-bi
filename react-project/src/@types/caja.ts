// ========================================
// NUEVOS TIPOS - CAJA (alineados al nuevo backend)
// ========================================

// Request para obtener tipos de caja
export interface GetTiposCajaRequest {
  includeInactive?: boolean;
}

// Response de tipos de caja (DTO backend)
export interface TipoCajaResponse {
  idTipoCaja: number;
  nombreTipoCaja: string;
  descripcion?: string;
  estado: number;
  estadoDescripcion: string;
  fechaCreacion: string;
  // Compatibilidad con posibles propiedades en PascalCase
  IdTipoCaja?: number;
  NombreTipoCaja?: string;
  Descripcion?: string;
  Estado?: number;
  EstadoDescripcion?: string;
  FechaCreacion?: string;
}

// =============================
// Flujo de Caja Consolidado
// =============================
export interface FlujoCajaConsolidadoRequest {
  anio: number;
  idsTipoCaja: number[]; // lista de ids seleccionados
  tipoMovimiento: 'I' | 'E' | 'T' | null; // 'T' = Todos (no enviar al SP)
}

export interface FlujoCajaConsolidadoResponse {
  idTipoCaja: number;
  nombreTipoCaja: string;
  tipoMovimiento: 'I' | 'E';
  ene: number; feb: number; mar: number; abr: number; may: number; jun: number;
  jul: number; ago: number; set: number; oct: number; nov: number; dic: number;
  // Compatibilidad PascalCase
  IdTipoCaja?: number; NombreTipoCaja?: string; TipoMovimiento?: 'I' | 'E';
  Ene?: number; Feb?: number; Mar?: number; Abr?: number; May?: number; Jun?: number;
  Jul?: number; Ago?: number; Set?: number; Oct?: number; Nov?: number; Dic?: number;
}

// Flujo detallado (por clasificador)
export interface FlujoCajaDetalladoResponse {
  idTipoCaja: number;
  nombreTipoCaja: string;
  tipoMovimiento: 'I' | 'E';
  detalleTipo: string; // 'FORMA_PAGO' o 'ORIGEN'
  idDetalle: number;
  nombreDetalle: string;
  ene: number; feb: number; mar: number; abr: number; may: number; jun: number;
  jul: number; ago: number; set: number; oct: number; nov: number; dic: number;
  total: number;
  // Compatibilidad PascalCase
  IdTipoCaja?: number; NombreTipoCaja?: string; TipoMovimiento?: 'I' | 'E';
  DetalleTipo?: string; IdDetalle?: number; NombreDetalle?: string;
  Ene?: number; Feb?: number; Mar?: number; Abr?: number; May?: number; Jun?: number;
  Jul?: number; Ago?: number; Set?: number; Oct?: number; Nov?: number; Dic?: number;
  Total?: number;
}

// Response de estados de cierre (DTO backend)
export interface EstadoCierreResponse {
  idEstado: number;
  nombre: string;
  // Compatibilidad PascalCase
  IdEstado?: number;
  Nombre?: string;
}

// Wrapper de respuesta (ResponseDTO)
export interface CajaApiResponse<T> {
  status: number;
  description: string;
  objModel: T;
  token?: string;
}

// =============================
// Verificación y Borrado de Cierre
// =============================
export interface CheckCierreExistsRequest {
  anio: string;
  mes: string; // 'MM'
}

export interface CajaMayorCierreExistsResponse {
  // Estilo camelCase preferido en frontend
  exists: boolean;
  idCajaMayorCierre?: number;
  anio: number;
  mes: number;
  // Compatibilidad PascalCase (backend/C#)
  Exists?: boolean;
  IdCajaMayorCierre?: number;
  Anio?: number;
  Mes?: number;
}

export interface DeleteCierreRequest {
  eliminaIdUsuario: number;
}

export interface DeleteCajaMayorCierreResponse {
  // camelCase para frontend
  idCajaMayorCierre: number;
  rowsAffected: number;
  mensaje: string;
  // Compatibilidad PascalCase (backend/C#)
  IdCajaMayorCierre?: number;
  RowsAffected?: number;
  Mensaje?: string;
}

// =============================
// Cabecera de Cierre Mensual
// =============================
export interface CajaMayorCabeceraResponse {
  idCajaMayorCierre: number;
  anio: string;
  mes: string;
  fechaInicio: string; // ISO
  fechaFin: string;    // ISO
  estadoCierre: number; // byte
  saldoInicialTotal: number;
  totalIngresosTotal: number;
  totalEgresosTotal: number;
  saldoFinalTotal: number;
  observaciones?: string;
  insertaIdUsuario?: number;
  insertaFecha?: string;   // ISO
  actualizaIdUsuario?: number;
  actualizaFecha?: string; // ISO
  // Compatibilidad PascalCase
  IdCajaMayorCierre?: number;
  Anio?: string;
  Mes?: string;
  FechaInicio?: string;
  FechaFin?: string;
  EstadoCierre?: number;
  SaldoInicialTotal?: number;
  TotalIngresosTotal?: number;
  TotalEgresosTotal?: number;
  SaldoFinalTotal?: number;
  Observaciones?: string;
  InsertaIdUsuario?: number;
  InsertaFecha?: string;
  ActualizaIdUsuario?: number;
  ActualizaFecha?: string;
}

export interface GetListCabeceraRequest {
  anio: string;
  mes: string;
  estadoCierre?: number; // byte
  page?: number;
  pageSize?: number;
}

// Nuevo request: listar cabeceras por rango de período (YYYYMM)
export interface GetListCabeceraPorRangoRequest {
  periodoDesde: number; // e.g., 202401
  periodoHasta: number; // e.g., 202412
  estadoCierre?: number; // byte
  page?: number;
  pageSize?: number;
}

export interface GetCabeceraRequest {
  idCajaMayorCierre: number;
}

export interface CierreCreateUpdateRequest {
  anio: string;
  mes: string;
  fechaInicio: string; // ISO
  fechaFin: string;    // ISO
  observaciones?: string;
  insertaIdUsuario: number;
}

export interface CerrarRequest {
  idCajaMayorCierre: number;
  actualizaIdUsuario: number;
}

export interface ConfirmarRequest {
  idCajaMayorCierre: number;
  actualizaIdUsuario: number;
}

export interface ResumenTiposRequest {
  idCajaMayorCierre: number;
  actualizaIdUsuario: number;
}

export interface RecalcularTotalesRequest {
  idCajaMayorCierre: number;
  actualizaIdUsuario: number;
}

export interface UpdateSaldoInicialTipoCajaRequest {
  idCajaMayorCierre: number;
  idTipoCaja: number;
  saldoInicial: number;
  actualizaIdUsuario: number;
}

export interface GenerarEgresosDesdeVentasRequest {
  idCajaMayorCierre: number;
  insertaIdUsuario: number;
  defaultIdTipoCaja?: number;
}

export interface GenerarIngresosDesdeCobranzasRequest {
  idCajaMayorCierre: number;
  insertaIdUsuario: number;
  defaultIdTipoCaja?: number;
}

// =============================
// Resumen por Tipo de Caja
// =============================
export interface CajaMayorResumenTipoResponse {
  idCajaMayorCierre: number;
  idTipoCaja: number;
  saldoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoFinal: number;
  // Compatibilidad PascalCase
  IdCajaMayorCierre?: number;
  IdTipoCaja?: number;
  SaldoInicial?: number;
  TotalIngresos?: number;
  TotalEgresos?: number;
  SaldoFinal?: number;
}

export interface CajaMayorTotalesResponse {
  idCajaMayorCierre: number;
  saldoInicialTotal: number;
  totalIngresosTotal: number;
  totalEgresosTotal: number;
  saldoFinalTotal: number;
  // Compatibilidad PascalCase
  IdCajaMayorCierre?: number;
  SaldoInicialTotal?: number;
  TotalIngresosTotal?: number;
  TotalEgresosTotal?: number;
  SaldoFinalTotal?: number;
}

// =============================
// Resumen Mensual por Tipo de Caja (rango de períodos)
// =============================
export interface CajaMayorResumenMensualTipoResponse {
  periodo: number;       // YYYYMM
  anio: number;          // YYYY
  mes: number;           // MM
  idTipoCaja: number;
  nombreTipoCaja?: string;
  saldoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoFinal: number;
  // Compatibilidad PascalCase
  Periodo?: number;
  Anio?: number;
  Mes?: number;
  IdTipoCaja?: number;
  NombreTipoCaja?: string;
  SaldoInicial?: number;
  TotalIngresos?: number;
  TotalEgresos?: number;
  SaldoFinal?: number;
}

// =============================
// Movimientos
// =============================
export interface GetMovimientosRequest {
  idCajaMayorCierre: number;
  idTipoCaja?: number;
  tipoMovimiento?: string; // 'I' | 'E'
  origen?: string;         // Detalle | IngresoMensual | EgresoMensual
  fechaDesde?: string;     // ISO
  fechaHasta?: string;     // ISO
  page?: number;
  pageSize?: number;
  sinPaginacion?: boolean;
}

export interface InsertMovimientoManualRequest {
  idCajaMayorCierre: number;
  idTipoCaja: number;
  tipoMovimiento: string; // 'I' | 'E'
  total: number;
  fechaRegistro: string; // ISO
  observaciones?: string;
  // Campos nuevos para caja mayor movimiento manual
  conceptoMovimiento?: string;
  subtotal?: number | null;
  igv?: number | null;
  origen?: string; // e.g., 'manual'
  // Campos de documento/venta quedan opcionales y no usados en modal
  codigoDocumento?: string;
  serieDocumento?: string;
  numeroDocumento?: string;
  idVenta?: string;
  insertaIdUsuario: number;
}

export interface CajaMayorMovimientoResponse {
  idCajaMayorMovimiento: number;
  idCajaMayorCierre: number;
  idTipoCaja: number;
  nombreTipoCaja: string;
  tipoMovimiento: string; // 'I' | 'E'
  total: number;
  fechaRegistro: string; // ISO
  conceptoMovimiento?: string;
  observaciones?: string;
  origen?: string;
  codigoDocumento?: string;
  serieDocumento?: string;
  numeroDocumento?: string;
  idReferencia?: string;
  referencia?: string;
  // Compatibilidad PascalCase
  IdCajaMayorMovimiento?: number;
  IdCajaMayorCierre?: number;
  IdTipoCaja?: number;
  NombreTipoCaja?: string;
  TipoMovimiento?: string;
  Total?: number;
  FechaRegistro?: string;
  ConceptoMovimiento?: string;
  Observaciones?: string;
  Origen?: string;
  CodigoDocumento?: string;
  SerieDocumento?: string;
  NumeroDocumento?: string;
  IdReferencia?: string;
  Referencia?: string;
}

export interface CajaMayorMovimientoDbResponse {
  // Estilo camelCase para consumir en frontend
  idMovimiento?: number;
  idCajaMayorCierre?: number;
  idTipoCaja?: number;
  tipoMovimiento?: string;
  total?: number;
  fechaMovimiento?: string; // ISO
  observaciones?: string;
  origen?: string;
  codigoDocumento?: string;
  serieDocumento?: string;
  numeroDocumento?: string;
  idVenta?: string;
  insertaIdUsuario?: number;
  insertaFecha?: string; // ISO
  actualizaIdUsuario?: number;
  actualizaFecha?: string; // ISO
  // Compatibilidad exacta con nombres devueltos por SP (.NET/PascalCase y prefijos i_/v_/t_/d_)
  i_IdMovimiento?: number;
  i_IdCajaMayorCierre?: number;
  i_IdTipoCaja?: number;
  v_TipoMovimiento?: string;
  d_Total?: number;
  t_FechaMovimiento?: string;
  v_Observaciones?: string;
  v_Origen?: string;
  v_CodigoDocumento?: string;
  v_SerieDocumento?: string;
  v_NumeroDocumento?: string;
  v_IdVenta?: string;
  i_InsertaIdUsuario?: number;
  t_InsertaFecha?: string;
  i_ActualizaIdUsuario?: number;
  t_ActualizaFecha?: string;
}

// =============================
// Catálogo: Categorías de Egreso
// =============================
export interface CategoriaEgresoResponse {
  // Estructura general de catálogo jerárquico
  key: number;
  parentKeyId?: number | null;
  value1?: string; // nombre
  value2?: string; // descripción opcional
  // Compatibilidad PascalCase
  Key?: number;
  ParentKeyId?: number | null;
  Value1?: string;
  Value2?: string;
}
