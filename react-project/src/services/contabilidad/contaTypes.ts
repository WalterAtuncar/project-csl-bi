// Tipos del modulo de Contabilidad (API dedicada SanLorenzo.Contabilidad.Services).
// Los nombres coinciden con las columnas/DTOs del backend (JSON sin camelCase).

export interface ContaLoginResponse {
  Token: string;
  IdUsuario: number;
  Username: string;
  Nombre: string;
  Roles: string[];
}

// Usuario del sistema legacy (objModel de /Auth/Login), devuelto por el login unificado
// para poblar el userData que las pantallas legacy ya usan.
export interface LegacyUser {
  i_SystemUserId: number;
  v_UserName: string;
  i_RoleId: number;
  v_PersonId: string;
  i_RolVentaId: number;
  i_ProfesionId: number;
}
export interface LoginBiResponse extends ContaLoginResponse {
  LegacyUser: LegacyUser | null; // null si el login fue LOCAL (breakglass del sa)
}

export interface CentroCosto {
  i_IdCentroCosto: number;
  i_IdPadre: number | null;
  v_Codigo: string;
  v_Nombre: string;
  v_Descripcion: string | null;
  i_IdTipoCaja: number | null;
  v_NombreTipoCaja: string | null;
  b_Activo: boolean;
}

export interface TipoGasto {
  i_IdTipoGasto: number;
  i_IdPadre: number | null;
  v_Codigo: string;
  v_Nombre: string;
  v_SeccionFlujo: string | null;
  SeccionPadre: string | null;
  b_Activo: boolean;
}

export interface Entidad {
  i_IdEntidad: number;
  v_Nombre: string;
  v_Tipo: string;
  b_Activo: boolean;
}

export interface CuentaBancaria {
  i_IdCuentaBancaria: number;
  v_Banco: string;
  v_NroCuenta: string;
  v_Moneda: string;
  b_Activo: boolean;
}

// Proveedor (dbo.proveedores via conta.sp_Proveedor_List / GET /proveedores) — catalogo
// del toggle receptor del egreso unificado. JSON sin camelCase (calca el ProveedorDto).
export interface ProveedorRow {
  i_IdProveedor: number;
  Ruc: string;
  RazonSocial: string;
}

// Alta de proveedor IN-LIVE desde el modal de egreso (POST /proveedores -> devuelve ProveedorRow).
// Calca el ProveedorCreateDto del backend (JSON sin camelCase). Direccion/Email opcionales.
export interface ProveedorCreate {
  Ruc: string;
  RazonSocial: string;
  Direccion?: string | null;
  Email?: string | null;
}

export type EstadoEgreso = 'POR_PAGAR' | 'PAGADO' | 'ANULADO';

export interface Egreso {
  i_IdEgreso: number;
  t_FechaDocumento: string;
  v_TipoDocumento: string;
  v_SerieNumero: string | null;
  Receptor: string;
  // Discriminador del receptor (sp_Egreso_List, D7). PROVEEDOR = compra; ENTIDAD = asociado/convenio.
  TipoReceptor?: 'PROVEEDOR' | 'ENTIDAD';
  CentroCosto: string;
  i_IdTipoCaja: number | null;
  TipoGasto: string;
  Seccion: string | null;
  v_Condicion: string;
  v_Moneda: string;
  d_TipoCambio: number;
  d_MontoBruto: number;
  d_IGV: number;
  d_MontoNeto: number;
  v_Estado: EstadoEgreso;
  t_FechaPago: string | null;
  i_IdFormaPago: number | null;
  v_Glosa: string | null;
  // Ids crudos: SOLO los expone sp_Egreso_Get (SELECT e.*), no la lista. Se usan para prefillar
  // el modal en modo Editar (D8) y derivar el tipo de receptor.
  i_IdProveedor?: number | null;
  i_IdEntidad?: number | null;
  i_IdCentroCosto?: number | null;
  i_IdTipoGasto?: number | null;
}

export interface EgresoListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: Egreso[];
}

export interface EgresoCreate {
  IdProveedor?: number | null;
  IdEntidad?: number | null;
  FechaDocumento: string;
  TipoDocumento: string;
  SerieNumero?: string | null;
  IdCentroCosto: number;
  IdTipoGasto: number;
  Condicion: string;
  Moneda: string;
  TipoCambio: number;
  MontoBruto: number;
  IGV: number;
  Glosa?: string | null;
  IdCompra?: number | null;
  // Estado inicial (sp_Egreso_Insert extendido, D3/D4). Default 'POR_PAGAR' (el service no lo
  // envia si es el default). 'PAGADO' EXIGE FechaPago; IdFormaPago default EFECTIVO(1).
  Estado?: string;
  FechaPago?: string | null;
  IdFormaPago?: number | null;
  IdCuentaBancaria?: number | null;
}

export interface EgresoUpdate extends EgresoCreate {
  IdEgreso: number;
}

export interface EgresoPagar {
  IdEgreso: number;
  FechaPago: string;
  IdFormaPago?: number | null;
  IdCuentaBancaria?: number | null;
}

export interface EgresoCargaFila {
  RucOEntidad: string;
  FechaDocumento: string | null;
  TipoDocumento?: string | null;
  SerieNumero?: string | null;
  CodCentroCosto: string;
  CodTipoGasto: string;
  Condicion?: string | null;
  Moneda?: string | null;
  TipoCambio?: number | null;
  MontoBruto: number | null;
  IGV?: number | null;
  Glosa?: string | null;
}

export interface EgresoCargaError {
  fila: number;
  v_RucOEntidad: string;
  v_CodCentroCosto: string;
  v_CodTipoGasto: string;
  d_MontoBruto: number | null;
  v_Error: string;
}

export interface EgresoCargaResultado {
  Insertadas: number;
  ConError: number;
  Errores: EgresoCargaError[];
}

export interface CostoPersonal {
  i_Id: number;
  n_Anio: number;
  n_Mes: number;
  i_IdCentroCosto: number;
  CentroCosto: string;
  v_Concepto: string;
  d_Monto: number;
  v_Estado: string;
  t_FechaPago: string | null;
}

export interface CostoPersonalUpsert {
  Anio: number;
  Mes: number;
  IdCentroCosto: number;
  Concepto: string;
  Monto: number;
}

export const CONCEPTOS_PERSONAL = [
  'REMUNERACION',
  'GRATIFICACION',
  'CTS',
  'UTILIDADES',
  'BENEFICIOS_SOCIALES',
  'PERSONAL_ADICIONAL',
] as const;

// ---- Motor de caja ----
// Catalogo dinamico de medios de pago con uso reciente (conta.sp_Caja_FormasPago).
export interface FormaPagoRow {
  i_IdFormaPago: number;
  FormaPago: string;
}

export interface CajaIngresoRow {
  i_IdTipoCaja: number | null;
  Unidad: string | null;
  i_IdFormaPago: number | null;
  FormaPago: string | null;
  EsCobranzaCredito: boolean;
  Dia: string;
  Monto: number;
}

export interface CajaEgresoRow {
  Seccion: string;
  i_IdCentroCosto: number | null;
  CentroCosto: string | null;
  Dia: string;
  EsIngreso: boolean;
  Monto: number;
}

export interface CajaDiaRow {
  Dia: string;
  Ingresos: number;
  Egresos: number;
  OtrosIngresos: number;
  FlujoDia: number;
  SaldoAcumulado: number;
}
export interface CajaIndicadores {
  PorPagar: number;
  PorCobrar: number;
  CreditoFacturado: number;
  CreditoCobrado: number;
}

// Cuadre de caja diario (conta.sp_Caja_CuadreDia): detalle a nivel documento de UN dia,
// estilo del reporte "Cuadre de Caja" del SAMBHS. Espejo exacto de los DTOs C#
// (CuadreDiaIngresoDto / CuadreDiaEgresoDto / CuadreDiaDto). JSON sin camelCase.
export interface CuadreDiaIngresoRow {
  Documento: string | null;
  Unidad: string;
  i_IdFormaPago: number | null;
  FormaPago: string;
  EsCobranzaCredito: boolean;
  Monto: number;
}
export interface CuadreDiaEgresoRow {
  Origen: 'EGRESO CONTA' | 'PERSONAL' | 'CAJA LEGACY' | string;
  Documento: string | null;
  CentroCosto: string;
  Concepto: string | null;
  Monto: number;
}
export interface CuadreDiaResponse {
  Ingresos: CuadreDiaIngresoRow[];
  Egresos: CuadreDiaEgresoRow[];
}

export interface FlujoMesRow {
  Mes: number;
  IngresosOp: number;
  EgrPersonal: number;
  EgrAdmin: number;
  EgrMedico: number;
  EgrTributos: number;
  EgrRenta: number;
  TotalEgresosOp: number;
  FlujoOperativo: number;
  Inversion: number;
  CajaOpInversion: number;
  Financiamiento: number;
  CajaOpFinanciamiento: number;
  OtrosEgresos: number;
  OtrosIngresos: number;
  SaldoDeCaja: number;
  SaldoInicial: number;
  SaldoFinal: number;
}

export interface FlujoIngresoUnidadRow {
  Mes: number;
  i_IdTipoCaja: number | null;
  Unidad: string;
  EsCredito: boolean;
  Monto: number;
}

export interface FlujoEgresoSeccionRow {
  Mes: number;
  Seccion: string;
  Monto: number;
}

export interface FlujoConsolidado {
  Resumen: FlujoMesRow[];
  IngresosPorUnidad: FlujoIngresoUnidadRow[];
  EgresosPorSeccion: FlujoEgresoSeccionRow[];
}

// ---- Flujo de caja DETALLADO (mockups 02/03) — espejo de FlujoDetalladoDto. JSON sin camelCase.
// SOLO detalle: la cola (flujo operativo/cajas/saldos) se reusa del Resumen del consolidado (D1).
// i_IdEntidad/Entidad son nullable (hoy siempre null); Personal hoy viene vacio (demo).
export interface FlujoDetalleIngresoRow {
  Mes: number;
  i_IdTipoCaja: number | null;
  Unidad: string;
  i_IdFormaPago: number | null;
  FormaPago: string;
  EsCredito: boolean;
  Monto: number;
}
export interface FlujoDetallePersonalRow {
  Mes: number;
  Unidad: string;
  Concepto: string;
  Monto: number;
}
export interface FlujoDetalleEgresoRow {
  Mes: number;
  Seccion: string;
  CodigoHoja: string;
  Hoja: string;
  i_IdEntidad: number | null;
  Entidad: string | null;
  Monto: number;
}
export interface FlujoDetalleCatalogoRow {
  Seccion: string;
  CodigoHoja: string;
  Hoja: string;
  Orden: number;
}
export interface FlujoDetallado {
  Ingresos: FlujoDetalleIngresoRow[];
  Personal: FlujoDetallePersonalRow[];
  Egresos: FlujoDetalleEgresoRow[];
  Catalogo: FlujoDetalleCatalogoRow[];
}

export interface CerrarMesResultado {
  ingresos: number;
  egresos: number;
  otrosIngresos: number;
  saldoFinal: number;
}

// ---- Rentabilidad ----
export interface RentabilidadGeneral {
  Ingresos: number;
  Gastos: number;
  Resultado: number;
  MargenPorc: number;
  Semaforo: 'RENTABLE' | 'BAJO_MARGEN' | 'PERDIDA' | string;
  RentableMin: number;
  BajoMin: number;
}
export interface RentabilidadUnidadRow {
  i_IdTipoCaja: number | null;
  Unidad: string;
  Ingresos: number;
  Gastos: number;
  Resultado: number;
  MargenPorc: number;
  Semaforo: string;
  EsTotal: boolean;
  EsAdministracion: boolean;
}
export interface RentabilidadGastoRow {
  i_IdTipoCaja: number | null;
  Unidad: string;
  i_IdCentroCosto: number | null;
  CentroCosto: string | null;
  Gasto: number;
}
export interface RentabilidadIngresoRow {
  i_IdTipoCaja: number | null;
  Unidad: string;
  BrutoConIGV: number;
  IGV: number;
  NetoSinIGV: number;
  PorcClinica: number;
  NetoRentabilidad: number;
  ParticipacionHospital: number;
}
export interface ComparativaMesRow {
  Mes: number;
  Ingresos: number;
  Gastos: number;
  Resultado: number;
  MargenPorc: number;
  TrimestralActiva: boolean;
  SemestralActiva: boolean;
}
export interface ComparativaPeriodoRow {
  Trimestre: number;
  Semestre: number;
  Ingresos: number;
  Gastos: number;
  Resultado: number;
}
export interface ComparativaResponse {
  Mensual: ComparativaMesRow[];
  Trimestral: ComparativaPeriodoRow[];
  Semestral: ComparativaPeriodoRow[];
}

// ---- Rentabilidad por Consultorio (Asistencial / Ocupacional) ----
// Calcados de los DTOs C# (PLAN_RENTABILIDAD_CONSULTORIO §4). JSON sin camelCase.
export interface RentabilidadConsultorioRow {
  Grupo: 'ASISTENCIAL' | 'OCUPACIONAL' | 'OTRAS_UNIDADES' | string;
  Consultorio: string;
  Ingresos: number;
  // Egresos por consultorio = pagos de honorarios registrados en el módulo (Rentabilidad v2, FASE 1).
  Egresos: number;
  Resultado: number; // Ingresos − Egresos
  PorcDelGrupo: number;
  EsNoClasificado: boolean;
  EsTotal: boolean;
}
export interface RentabilidadConsultorioDiagRow {
  Grupo: string;
  Motivo: 'SIN_SERVICE' | 'SIN_CONSULTORIO' | 'SIN_LIQUIDACION' | string;
  Referencia: string;
  Monto: number;
}
export interface RentabilidadConsultorioResponse {
  Filas: RentabilidadConsultorioRow[];
  SinClasificar: RentabilidadConsultorioDiagRow[];
}

// ---- SISOL ----
export interface SisolLiquidacion {
  i_IdLiquidacion: number;
  n_Anio: number;
  n_Mes: number;
  d_VentaNeta: number;
  d_PorcClinica: number;
  d_ParticipacionClinica: number;
  d_ParticipacionHospital: number;
  v_Estado: 'CALCULADO' | 'PAGADO' | string;
  t_FechaPago: string | null;
  i_IdEgresoHospital: number | null;
}
export interface SisolEspecialista {
  i_Id: number;
  v_IdMedico: string;
  v_NombreMedico: string;
  d_BaseCalculo: number;
  d_Porcentaje: number;
  d_Monto: number;
  v_Estado: string;
}
export interface SisolEspecialistaInput {
  IdMedico: string;
  NombreMedico: string;
  Porcentaje: number;
}
export interface SisolDetalle {
  Liquidacion: SisolLiquidacion | null;
  Especialistas: SisolEspecialista[];
}

// ---- Catalogos (write) ----
export interface CentroCostoCreate { IdPadre?: number | null; Codigo: string; Nombre: string; Descripcion?: string | null; IdTipoCaja?: number | null; }
export interface CentroCostoUpdate { IdCentroCosto: number; Nombre: string; Descripcion?: string | null; IdTipoCaja?: number | null; Activo: boolean; }
export interface TipoGastoCreate { IdPadre?: number | null; Codigo: string; Nombre: string; SeccionFlujo?: string | null; }
export interface TipoGastoUpdate { IdTipoGasto: number; Nombre: string; SeccionFlujo?: string | null; Activo: boolean; }
export interface EntidadCreate { Nombre: string; Tipo: string; }
export interface EntidadUpdate { IdEntidad: number; Nombre: string; Tipo: string; Activo: boolean; }
export interface SisolParticipacion { i_IdParticipacion: number; d_PorcClinica: number; d_PorcHospital: number; t_VigenciaDesde: string; t_VigenciaHasta: string | null; }
export interface SisolParticipacionCreate { PorcClinica: number; PorcHospital: number; VigenciaDesde: string; }
export interface SisolParticipacionUpdate { IdParticipacion: number; PorcClinica: number; PorcHospital: number; VigenciaDesde: string; }
export interface ConfigRow { v_Clave: string; v_Valor: string; v_Descripcion: string; }

// ---- Usuarios ----
export interface Rol { i_IdRol: number; v_Codigo: string; v_Nombre: string; }
export interface Usuario {
  i_IdUsuario: number;
  v_Username: string;
  v_NombreCompleto: string;
  b_Activo: boolean;
  t_UltimoLogin: string | null;
  v_AuthOrigen: 'LOCAL' | 'LEGACY' | string;
  v_UsernameLegacy: string | null;
  i_SystemUserIdLegacy: number | null;
  Roles: string;
}
export interface UsuarioCreate { Username: string; Password: string; NombreCompleto: string; Roles: string; }
export interface UsuarioUpdate { IdUsuario: number; NombreCompleto: string; Activo: boolean; Roles: string; }

// ---- Login unificado: cableado de usuarios del sistema legacy ----
export interface LegacyUsuarioBusqueda {
  i_SystemUserId: number;
  v_UserName: string;
  Nombre: string;
  YaVinculado: boolean;
}
export interface VincularRequest { SystemUserId: number; Username: string; Nombre: string; Roles: string; }
export interface VinculoUpdateRequest { IdUsuario: number; Roles: string; Activo: boolean; }

// ---- Honorarios médicos (API conta /honorarios) ----
// Tipos calcados de los DTOs de FASE 2 (JSON sin camelCase; los nombres coinciden 1:1 con el backend).

// GET /honorarios/consultorios (catálogo systemparameter grupo 403).
export interface HonorarioConsultorio {
  Id: number;
  Nombre: string;
  PorcMedico: number | null;
}

// GET /honorarios/medicos?consultorioId=
export interface HonorarioMedico {
  MedicoTratanteId: number;
  userName: string;
  name: string;
  consultorioId: number;
  consultorio: string;
  i_RoleId: number;
}

// GET /honorarios/profesionales?texto= (mín 3 chars)
export interface HonorarioProfesional {
  systemUserId: number;
  personId: string;
  userName: string;
  Name: string;
}

// GET /honorarios/analisis — fila plana (una por servicio). Claves de registro: v_ServiceId + consultorioId.
export interface AnalisisHonorarioRow {
  idVenta: number;
  formaPagoName: string;
  serie: string;
  numero: string;
  fechaPago: string;
  monto: number;
  precioServicio: number;
  cantidad: number;
  montoPagadoReal: number;
  total: number;
  nombreServicio: string;
  v_ComprobantePago: string;
  v_ServiceId: string;
  docNumberPaciente: string;
  apPaternoPaciente: string;
  apMaternoPaciente: string;
  nombresPaciente: string;
  medicoId: number;
  nombreMedico: string;
  especialidadMedico: string;
  consultorio: string;
  consultorioId: number;
  tipoServicio: string;
  edadPaciente: number | string | null;
  PorcRef: number | null;
  esPagado: number; // 0 | 1
}

// GET /honorarios/pagos (paginado server-side).
export interface HonorarioPagoListItem {
  i_IdPago: number;
  t_FechaPago: string;
  v_MedicoNombre: string;
  i_MedicoId: number;
  t_PeriodoDesde: string;
  t_PeriodoHasta: string;
  d_TotalPago: number;
  d_TotalServicios: number;
  NroConsultorios: number;
  NroServicios: number;
  v_Estado: 'PAGADO' | 'ANULADO' | string;
}
export interface HonorarioPagosResponse {
  Total: number;
  Items: HonorarioPagoListItem[];
  Page: number;
  PageSize: number;
}
export interface HonorarioPagosFilters {
  desde?: string;
  hasta?: string;
  medicoId?: number;
  incluirAnulados?: boolean;
  page?: number;
  pageSize?: number;
}

// GET /honorarios/pagos/{id}
export interface HonorarioPagoConsultorio {
  i_IdConsultorio: number;
  v_ConsultorioNombre: string;
  d_MontoServicios: number;
  d_MontoPago: number;
  i_IdEgreso: number | null;
  EgresoEstado: string | null;
}
export interface HonorarioPagoServicio {
  v_ServiceId: string;
  i_IdConsultorio: number;
  d_Precio: number | null;
  d_Porc: number | null;
  d_Pagado: number | null;
  b_Anulado: boolean;
}
// Cabecera del detalle: campos del List + los opcionales que solo expone el Get.
export interface HonorarioPagoCabecera extends HonorarioPagoListItem {
  d_PorcMedico?: number | null;
  i_IdFormaPago?: number | null;
  i_IdCuentaBancaria?: number | null;
  v_Glosa?: string | null;
  v_MotivoAnulacion?: string | null;
}
export interface HonorarioPagoDetalle {
  Cabecera: HonorarioPagoCabecera;
  Consultorios: HonorarioPagoConsultorio[];
  Servicios: HonorarioPagoServicio[];
}

// POST /honorarios/pagos — el IdUsuario NO se manda (sale del JWT).
export interface HonorarioServicioInput {
  ServiceId: string;
  IdConsultorio: number;
  Precio?: number | null;
  Porc?: number | null;
  Pagado?: number | null;
}
export interface HonorarioPagoCreate {
  MedicoId: number;
  MedicoNombre: string;
  Desde: string;
  Hasta: string;
  PorcMedico?: number | null;
  FechaPago: string;
  IdFormaPago?: number | null;
  IdCuentaBancaria?: number | null;
  Glosa?: string | null;
  TotalServicios: number;
  TotalPago: number;
  Servicios: HonorarioServicioInput[];
}
export interface HonorarioPagoCreateResult {
  i_IdPago: number;
  Consultorios: {
    i_IdConsultorio: number;
    v_ConsultorioNombre: string;
    d_MontoServicios: number;
    d_MontoPago: number;
    i_IdEgreso: number;
  }[];
}

// ---- Reconciliación de caja mayor legacy (poller conta) ----
// TUBERÍA DISTINTA de la Caja Diaria del módulo conta: este bloque reconcilia por DÍA los cierres
// del legacy (dbo.cajamayor_*) que mantiene el BackgroundService del API conta
// (PLAN_RECONCILIACION_CIERRE_DIARIO — RESULTADOS FASE 2). JSON sin camelCase (calca los DTOs C#).

// Config del BackgroundService (§7.1). ProximoHorarioUtc viene en UTC -> convertir a hora local en el front.
export interface ReconConfigDto {
  Enabled: boolean;
  Modo: string;                       // 'Observacion' | 'Escritura'
  PisoFecha: string;                  // 'yyyy-MM-dd'
  Horarios: string[];                 // ['09:00','13:00','17:00','21:00','00:00']
  TimeZone: string;                   // 'SA Pacific Standard Time'
  ProximoHorarioUtc: string | null;   // ISO UTC; null si Enabled=false
}

// Una fila del log de auditoría (conta.caja_reconciliacion_log). v_Detalle = texto JSON-like -> JSON.parse en el front.
export interface ReconLogRow {
  i_IdLog: number;
  t_Inicio: string;
  t_Fin: string | null;
  v_Origen: string;                   // POLLER | MANUAL | STARTUP_CATCHUP
  v_Modo: string;                     // OBSERVACION | ESCRITURA
  v_Accion: string;                   // TICK | RECONCILIAR_DIA | CIERRE_DIA | REAPERTURA_AUTO | BARRIDO_CORTO | BARRIDO_PROFUNDO
  d_Fecha: string | null;
  v_Resultado: string;                // OK | OK_SIN_CAMBIOS | DERIVA_DETECTADA | ERROR | SKIPPED_LOCK
  v_Detalle: string | null;           // JSON-like en texto plano (SQL 2012 sin OPENJSON) -> JSON.parse en el front
  i_IdUsuario: number | null;
}

// Estado por FECHA (conta.caja_reconciliacion_dia).
export interface ReconDiaRow {
  d_Fecha: string;
  v_Estado: string;                   // PENDIENTE | RECONCILIADO | CERRADO | REABIERTO_AUTO
  n_Version: number;
  i_IdCajaMayorCierre: number | null;
  d_TotalIngresos: number;
  d_TotalEgresos: number;
  i_CntIngresos: number;
  i_CntEgresos: number;
  hf_Cnt: number | null;
  hf_Sum: number | null;
  hf_Chk: number | null;
  t_UltimaReconciliacion: string | null;
  t_UltimoCierre: string | null;
  t_UltimaVerificacion: string | null;
}

// GET /caja/reconciliacion/estado
export interface ReconEstadoResponse {
  Config: ReconConfigDto;
  Corridas: ReconLogRow[];            // últimas N corridas del log (más reciente primero)
  Dias: ReconDiaRow[];                // estados de los últimos ~35 días
}

// POST /caja/reconciliar (body). Sin fecha => Tick completo; con fecha => ReconciliarDia de esa fecha.
// El back decide el Modo: 'modo' solo puede DEGRADAR a Observación; nunca fuerza Escritura por request.
export interface ReconciliarBody {
  fecha?: string | null;              // 'yyyy-MM-dd'
  barridoProfundo?: boolean;
  modo?: 'Observacion' | 'Escritura';
}

// POST /caja/reconciliar (respuesta).
export interface ReconciliacionCorridaResponse {
  Modo: string;
  Origen: string;
  Fecha: string | null;
  BarridoProfundo: boolean;
  Corrida: ReconLogRow[];
}

// ---- Compras ----
export interface CompraRow {
  i_IdCompra: number;
  periodo: string;
  fecha_emision: string | null;
  tipo_comprobante: string;
  Documento: string;
  Proveedor: string;
  Ruc: string;
  base_imponible: number;
  igv: number;
  importe_total: number;
  codigo_moneda: string;
  estado: string;
  i_IdCentroCosto: number | null;
  CentroCosto: string | null;
  i_IdTipoGasto: number | null;
  TipoGasto: string | null;
  i_IdEgreso: number | null;
  Clasificada: boolean;
}
