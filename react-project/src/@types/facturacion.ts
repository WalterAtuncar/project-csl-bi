// ========================================
// TIPOS PARA FACTURACIÓN MICROSERVICE
// ========================================

// ========================================
// REQUEST TYPES
// ========================================

export interface FiltroBusquedaMSRequest {
  fechaInicio: string;
  fechaFin: string;
  fechaInicioRet2Meses: string;
}

export interface FiltroBusquedaMSRequestSISOL {
  fechaInicio: string;
  fechaFin: string;
  fechaInicioRetard: string;
}

export interface FiltroBusquedaMSRequestSISOL2 {
  fechaInicio: string;
  fechaFin: string;
  agenteBusqueda: number;
}

export interface FiltroBusquedaMSVentas {
  fechaInicio: string;
  fechaFin: string;
  fechaInicioRetard: string;
  pacienteDni: string;
  tipoVenta?: number;
  comprobante: string;
}

export interface FiltroBusquedaMSVentas2 {
  fechaInicio: string;
  fechaFin: string;
  fechaInicioRetard: string;
  pacienteDni: string;
  tipoVenta?: number;
  comprobante: string;
  medicoTto?: number;
  consultorio?: number;
  estProtocoloAtencion?: number;
  campañaText: string;
  filtAlt: string;
}

export interface FiltroBusquedaMSEgresos {
  fechaInicio: string;
  fechaFin: string;
  tipoVenta?: number;
  dni: string;
}

export interface FiltroBusquedaMSVentasAll {
  fechaInicio: string;
  fechaFin: string;
  pacienteDni: string;
  comprobante: string;
}

export interface FiltroBusquedaFechasMSRequest {
  fechaInicio: string;
  fechaFin: string;
}

export interface GerenciaVentasAsistencialRequest {
  fechaInicio: string;
  fechaFin: string;
}

export interface LiquidacionFiltrosRequest {
  fechaInicio: string;
  fechaFin: string;
  cCosto: string;
  nroLiquidacion: string;
  facturacion: string;
  customer: string;
  employer: string;
  working: string;
}

export interface LiquidacionFiltrosEmpresaRequest {
  fechaInicio: string;
  fechaFin: string;
  nroLiquidacion: string;
  facturacion: string;
}

export interface LiquidacionFiltrosEmpresaFechas {
  fechaInicio: string;
  fechaFin: string;
}

export interface FiltroFechaInicioFechaFin {
  fechaInicio: string;
  fechaFin: string;
}

export interface FiltroDxFrecuente {
  dxname: string;
  categoriaId: number;
}

export interface FiltroBusquedaMSVentasFarmacia {
  fechaInicio: string;
  fechaFin: string;
  tipo?: number;
}

// ========================================
// RESPONSE TYPES
// ========================================

export interface GerenciaVentasDetalleResponse {
  totalGrupo: number;
  cantidadGrupo: number;
  venta: string;
  serie: string;
  correlativo: string;
  cliente: string;
  total: number;
  descripcion: string;
  cantidad: number;
  precioU: number;
  precioV: number;
  fechaEmision: string;
  condicion: string;
  tipo: string;
  usuario1: string;
  servicio: string;
  paciente: string;
  fechaServicio: string;
  comprobante: string;
  usuario2: string;
  value1: string;
  value2: string;
  value3: string;
  protocolo: string;
  listaVentas: GerenciaVentasDetalleVent[];
}

export interface GerenciaVentasDetalleVent {
  venta: string;
  serie: string;
  correlativo: string;
  cliente: string;
  total: number;
  fechaEmision: string;
  condicion: string;
  tipo: string;
  usuario1: string;
  servicio: string;
  paciente: string;
  fechaServicio: string;
  value1: string;
  value2: string;
  listaDetalle: ListaVentaDetalle[];
}

export interface ListaVentaDetalle {
  descripcion: string;
  cantidad: number;
  precioU: number;
  precioV: number;
  usuario2: string;
}

export interface mdlExternoSanLorenzoGlobResponse {
  idexterno: string;
  extdocumento_p: string;
  nrodocumento_p: string;
  paterno_p: string;
  materno_p: string;
  nombres_p: string;
  nacimiento_p: string;
  extsexo_p: string;
  idubigeo_p: string;
  dedireccion_p: string;
  detelefono_p: string;
  decorreo_p: string;
  deseguro_p: string;
  extestadocivil_p: string;
  apoderadonombre_p: string;
  apoderadocontacto_p: string;
  fechaServicio: string;
  comprobanteAt: string;
  usuario2: string;
  medico: string;
  protocolo: string;
  especialidadMedica: string;
  consultorio: string;
  tipoServicio: string;
  servicio_p: string;
  edad?: number;
  etareo: string;
  extdocumento_c: string;
  nrodocumento_c: string;
  nombres_c: string;
  idubigeo_c: string;
  dedireccion_c: string;
  extformapago_t: string;
  extserie_t: string;
  numero_t: string;
  emision_t: string;
  monto_t: string;
  usuario_t: string;
  estado_t: string;
  motivo_t: string;
  preciounitario_td: string;
  cantidad_td: string;
  total_td: string;
  codigo_td: string;
  nombreservicio_td: string;
  tieneatencion?: number;
  comprobante: string;
  fecharegistro_t?: string;
  total_tdD: number;
  idMedicoSolicita?: number;
  vMedicoSolicita: string;
  espMedicoSolicita: string;
}

export interface mdlExternoVentasSanLorenzoGlobResponse {
  idexterno: string;
  extdocumento_p: string;
  nrodocumento_p: string;
  paterno_p: string;
  materno_p: string;
  nombres_p: string;
  nacimiento_p: string;
  extsexo_p: string;
  idubigeo_p: string;
  dedireccion_p: string;
  detelefono_p: string;
  decorreo_p: string;
  deseguro_p: string;
  extestadocivil_p: string;
  apoderadonombre_p: string;
  apoderadocontacto_p: string;
  fechaServicio: string;
  comprobanteAt: string;
  usuario2: string;
  medico: string;
  protocolo: string;
  especialidadMedica: string;
  consultorio: string;
  tipoServicio: string;
  servicio_p: string;
  edad?: number;
  etareo: string;
  extdocumento_c: string;
  nrodocumento_c: string;
  nombres_c: string;
  idubigeo_c: string;
  dedireccion_c: string;
  extformapago_t: string;
  extserie_t: string;
  numero_t: string;
  emision_t: string;
  monto_t: string;
  usuario_t: string;
  estado_t: string;
  motivo_t: string;
  preciounitario_td: string;
  cantidad_td: string;
  total_td: string;
  codigo_td: string;
  nombreservicio_td: string;
  tieneatencion?: number;
  comprobante: string;
  fecharegistro_t?: string;
  total_tdD: number;
  idMedicoSolicita?: number;
  vMedicoSolicita: string;
  espMedicoSolicita: string;
  medioMkt: string;
  v_MarketingOtros: string;
  v_IdVentaDetalle: string;
  v_NroDocMed: string;
  dxNombre: string;
  dxCie10: string;
  dxEst: string;
  tipoProtocolo: string;
  examenesRec: number;
  farmRec: number;
  personId: string;
  auditoria: string;
  comentariosAud: string;
  iAUDITOR?: number;
  auditor: string;
  tipCaj: string;
  useriD?: number;
  consultorioId?: number;
  tipoProtocoloId?: number;
  value1: string;
  value2: string;
}

export interface mdlExternoVentasSanLorenzoMKTGlobResponse {
  idexterno: string;
  extdocumento_p: string;
  nrodocumento_p: string;
  paterno_p: string;
  materno_p: string;
  nombres_p: string;
  nacimiento_p: string;
  extsexo_p: string;
  idubigeo_p: string;
  dedireccion_p: string;
  detelefono_p: string;
  decorreo_p: string;
  deseguro_p: string;
  extestadocivil_p: string;
  apoderadonombre_p: string;
  apoderadocontacto_p: string;
  fechaServicio: string;
  comprobanteAt: string;
  usuario2: string;
  medico: string;
  protocolo: string;
  especialidadMedica: string;
  consultorio: string;
  tipoServicio: string;
  servicio_p: string;
  edad?: number;
  etareo: string;
  extdocumento_c: string;
  nrodocumento_c: string;
  nombres_c: string;
  idubigeo_c: string;
  dedireccion_c: string;
  extformapago_t: string;
  extserie_t: string;
  numero_t: string;
  emision_t: string;
  monto_t: string;
  usuario_t: string;
  estado_t: string;
  motivo_t: string;
  preciounitario_td: string;
  cantidad_td: string;
  total_td: string;
  codigo_td: string;
  nombreservicio_td: string;
  tieneatencion?: number;
  comprobante: string;
  fecharegistro_t?: string;
  total_tdD: number;
  idMedicoSolicita?: number;
  vMedicoSolicita: string;
  espMedicoSolicita: string;
  medioMkt: string;
  v_MarketingOtros: string;
  departamento: string;
  provincia: string;
  distrito: string;
  v_IdVentaDetalle: string;
  v_NroDocMed: string;
  tipoProtocolo: string;
}

export interface mdlExternoSanLorenzoGlobEgresos {
  idVenta: string;
  idCliente: string;
  medico: string;
  comprobante: string;
  descripcion: string;
  cantidad?: number;
  total: number;
  fecha?: string;
  value1: string;
  value2: string;
}

export interface mdlExternoVentasSanLorenzoGlobResponseAll {
  idexterno: string;
  extdocumento_p: string;
  nrodocumento_p: string;
  paterno_p: string;
  materno_p: string;
  nombres_p: string;
  nacimiento_p: string;
  extsexo_p: string;
  idubigeo_p: string;
  dedireccion_p: string;
  detelefono_p: string;
  decorreo_p: string;
  deseguro_p: string;
  extestadocivil_p: string;
  apoderadonombre_p: string;
  apoderadocontacto_p: string;
  fechaServicio: string;
  comprobanteAt: string;
  usuario2: string;
  medico: string;
  protocolo: string;
  especialidadMedica: string;
  consultorio: string;
  tipoServicio: string;
  servicio_p: string;
  edad?: number;
  etareo: string;
  extdocumento_c: string;
  nrodocumento_c: string;
  nombres_c: string;
  idubigeo_c: string;
  dedireccion_c: string;
  extformapago_t: string;
  extserie_t: string;
  numero_t: string;
  emision_t: string;
  monto_t: string;
  usuario_t: string;
  estado_t: string;
  motivo_t: string;
  preciounitario_td: string;
  cantidad_td: string;
  total_td: string;
  codigo_td: string;
  nombreservicio_td: string;
  tieneatencion?: number;
  comprobante: string;
  fecharegistro_t?: string;
  total_tdD: number;
  idMedicoSolicita?: number;
  vMedicoSolicita: string;
  espMedicoSolicita: string;
  medioMkt: string;
  v_MarketingOtros: string;
  v_IdVentaDetalle: string;
  v_NroDocMed: string;
  dxNombre: string;
  dxCie10: string;
  dxEst: string;
  v_Serv: string;
  useriD?: number;
}

export interface LiquidacionResponse {
  v_PersonId: string;
  v_ServiceId: string;
  v_OrganizationId: string;
  i_EsoTypeId?: number;
  esotype: string;
  v_CustomerOrganizationId: string;
  v_EmployerName: string;
  v_EmployerRuc: string;
  v_EmployerDireccion: string;
  v_EmployerRepr: string;
  v_EmployerTelefono: string;
  v_EmployerOrganizationId: string;
  v_WorkingOrganizationId: string;
  v_NroLiquidacion: string;
  trabajador: string;
  fechaNacimiento?: string;
  edad?: number;
  fechaExamen?: string;
  nroDocumemto: string;
  cargo: string;
  perfil: string;
  precio: number;
  subTotal: number;
  igv: number;
  cCosto: string;
  v_ProtocolId: string;
  creacionLiquidacion?: string;
  v_CustomerLocationId: string;
  v_EmployerLocationId: string;
  v_WorkingLocationId: string;
  totalPorGrupo: number;
  detalle: LiquidacionDetalle[];
  usuarioCrea: string;
}

export interface LiquidacionDetalle {
  v_PersonId: string;
  v_ProtocolId: string;
  v_NroLiquidacion: string;
  b_Seleccionar: boolean;
  item: number;
  v_ServiceId: string;
  trabajador: string;
  fechaNacimiento?: string;
  edad?: number;
  fechaExamen?: string;
  nroDocumemto: string;
  cargo: string;
  perfil: string;
  subTotal: number;
  igv: number;
  precio: number;
  cCosto: string;
  totalPorGrupo: number;
  esotype: string;
  usuarioCrea: string;
}

export interface IndicadoresLaboratorioResponse1 {
  servicio: string;
  cantidad: number;
}

export interface IndicadoresLaboratorioResponse2 {
  mina: string;
  cantidad: number;
}

export interface IndicadoresLaboratorioResponse34 {
  componenteId: string;
  examen: string;
  categoria: string;
  idCategoria: number;
  cantidad: number;
  servicio: string;
}

export interface IndicadoresLaboratorioResponse5 {
  servicio: string;
  cantidad: number;
}

export interface IndicadoresLaboratorioResponse6 {
  medico: string;
  cantidad: number;
}

export interface MarcaResponse {
  v_IdMarca: string;
  v_CodInterno: string;
  v_Descripcion: string;
  i_Eliminado?: number;
  i_InsertaIdUsuario?: number;
  t_InsertaFecha: string;
  i_ActualizaIdUsuario?: number;
  t_ActualizaFecha: string;
  v_HistActualizacioones: string;
  v_Observaciones: string;
}

export interface ProveedorResponse {
  v_IdProveedor: string;
  v_RazonSocial: string;
  v_RUC: string;
  v_Direccion: string;
  v_Representante: string;
  v_Celular: string;
  v_Email: string;
  i_Activo?: number;
  i_Eliminado?: number;
  i_InsertaIdUsuario?: number;
  t_InsertaFecha: string;
  i_ActualizaIdUsuario?: number;
  t_ActualizaFecha: string;
  v_HistActualizacioones: string;
  v_Observaciones: string;
}

export interface cobranzaDetalleResponse {
  v_IdCobranzaDetalle: string;
  v_IdCobranza: string;
  v_IdVenta: string;
  i_IdFormaPago: number;
  i_IdTipoDocumentoRef: number;
  v_DocumentoRef: string;
  i_IdMoneda: number;
  d_NetoXCobrar: number;
  d_ImporteSoles: number;
  d_ImporteDolares: number;
  v_Observacion: string;
  i_EsLetra: number;
  i_Eliminado: number;
  i_InsertaIdUsuario: number;
  t_InsertaFecha: string;
  i_ActualizaIdUsuario: number;
  t_ActualizaFecha: string;
  d_GastosFinancieros: number;
  d_IngresosFinancieros: number;
  i_EsAbonoLetraDescuento: number;
  i_AplicaRetencion: number;
  d_MontoRetencion: number;
  v_NroRetencion: string;
  d_Redondeo: number;
}

export interface LiquidacionEmpresaResponse {
  v_OrganizationName: string;
  v_Ruc: string;
  v_AddressLocation: string;
  v_TelephoneNumber: string;
  v_ContactName: string;
  v_LiquidacionId: string;
  v_NroLiquidacion: string;
  v_ServiceId: string;
  v_OrganizationId: string;
  d_Monto?: number;
  d_FechaVencimiento?: string;
  v_NroFactura: string;
  creacionLiquidacion?: string;
  detalle: LiquidacionEmpresaDetalle[];
  detalle_1: LiquidacionEmpresaDetalle[];
  totalDebe: string;
  totalPago: string;
  totalTotal: string;
  d_Debe: number;
  totalPagado: number;
  condicion: string;
  d_Pago?: number;
  d_Total?: number;
  v_IdVenta: string;
  fechaCreacion?: string;
  fechaVencimiento?: string;
  netoXCobrar?: number;
  docuemtosReferencia: string;
  nroComprobante: string;
}

export interface LiquidacionEmpresaDetalle {
  v_LiquidacionId: string;
  v_NroLiquidacion: string;
  d_Debe?: number;
  d_Pago?: number;
  d_Total?: number;
  v_NroFactura: string;
  v_IdVenta: string;
  fechaCreacion?: string;
  fechaVencimiento?: string;
  netoXCobrar?: number;
  totalPagado?: number;
  docuemtosReferencia: string;
  nroComprobante: string;
  condicion: string;
}

export interface LiquidacionEmpresaList {
  v_OrganizationName: string;
  v_Ruc: string;
}

export interface LiquidacionesConsolidadoResponse {
  v_OrganizationName: string;
  v_Ruc: string;
  v_AddressLocation: string;
  v_TelephoneNumber: string;
  v_ContactName: string;
  v_NroLiquidacion: string;
  v_ServiceId: string;
  v_OrganizationId: string;
  d_creaionLiq?: string;
  detalle: LiquidacionesConsolidadoDetalle[];
  v_Paciente: string;
  d_exam?: string;
  d_price?: number;
  v_UsuarRecord: string;
  v_CenterCost: string;
}

export interface LiquidacionesConsolidadoDetalle {
  v_ServiceId: string;
  v_NroLiquidacion: string;
  v_OrganizationId: string;
  v_Paciente: string;
  d_exam?: string;
  d_price?: number;
  v_UsuarRecord: string;
  v_CenterCost: string;
}

export interface GerenciaVentasFarmaciaResponse {
  venta: string;
  serie: string;
  correlativo: string;
  cliente: string;
  total: number;
  descripcion: string;
  cantidad: number;
  precioV: number;
  precioU: number;
  fechaEmision: string;
  condicion: string;
  tipo: string;
  usuario1: string;
  value1: string;
  servicio: string;
  paciente: string;
  fechaServicio: string;
  comprobante: string;
  usuario2: string;
  value2: string;
}

// ========================================
// COMMON TYPES
// ========================================

export interface FiltroBusquedaMS {
  fechaInicio: string;
  fechaFin: string;
  fechaInicioRet2Meses: string;
}

// ========================================
// API RESPONSE WRAPPER
// ========================================

export interface ApiResponse<T> {
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
