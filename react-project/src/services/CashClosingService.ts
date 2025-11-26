import { BaseApiService } from './BaseApiService';

// Interface para la request del cierre de caja
export interface CashClosingRequest {
  anio: number;
  mes: number;
  usuarioCreacion: number;
  observaciones: string;
  clienteEsAgente?: string;
  documentoEgreso?: number;
}

// Interface para la request del cierre diario de caja
export interface CashClosingDailyRequest {
  dia: string;
  clienteEsAgente?: string;
  documentoEgreso?: number;
}

// Interface para la response del cierre de caja
export interface CashClosingResponse {
  idCierreCaja: number;
  año: number;
  mes: number;
  nombreMes: string;
  fechaInicio: string;
  fechaFin: string;
  totalIngresos: number;
  totalEgresos: number;
  totalNeto: number;
  cantidadVentas: number;
  cantidadIngresos: number;
  cantidadEgresos: number;
  mensaje: string;
}

// Interface para la response del cierre diario de caja
export interface CashClosingDailyResponse {
  idCierreMensual: number;
  fechaDia: string;
  ingresosDia: number;
  egresosDia: number;
  netoDia: number;
  cantidadVentasDia: number;
  totalIngresosMensualActualizado: number;
  totalEgresosMensualActualizado: number;
  totalNetoMensualActualizado: number;
  mensaje: string;
}

// Interface para la request de Gerencia Ventas Asistencial
export interface GerenciaVentasAsistencialRequest {
  FechaInicio: string; // formato: 2025-06-01T00:00:01.000Z
  FechaFin: string;    // formato: 2025-06-01T23:59:59.000Z
}

// Interface para un item de Gerencia Ventas Asistencial
export interface GerenciaVentasAsistencialItem {
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
  protocolo: string;
  value3: string;
}

// Interface para la response de Gerencia Ventas Asistencial
export interface GerenciaVentasAsistencialResponse {
  status: number;
  description: string;
  objModel: GerenciaVentasAsistencialItem[];
  token: string | null;
  objPaginated: unknown | null;
}

// Interface para la request del detalle de cierre de caja (LEGACY - mantener para compatibilidad)
export interface CashClosingDetailRequest {
  operacion: string;
  idCierreCaja: number;
  idVenta: string;
  fechaVenta: string;
  tipoDocumento: number;
  nombreTipoDocumento: string;
  montoVenta: number;
  esEgreso: boolean;
  tipoOperacion: string;
}

// Interface para el nuevo objeto detallado de movimiento
export interface CashClosingMovementRequest {
  // Campos de identificación
  idCierreCaja: number | null;
  idCierreCajaDetalle: number | null;
  
  // Campos básicos requeridos
  d_FechaVenta: string;
  I_EsEgreso: boolean;
  I_TipoMovimiento: number;
  v_MovimientoNombre: string | null;
  d_MontoVenta: number;
  v_Description: string;
  v_ReceivedBy: string | null;
  
  // Campos específicos para egresos
  I_AuthorizedBy: number | null;
  v_UserName: string | null;
  I_TipoDocumento: number | null;
  v_NombreTipoDocumento: string | null;
  v_TipoOperacion: string;
  
  // Campos de comprobante
  d_FechaComprobante: string | null;
  v_Serie: string | null;
  v_Correlativo: string | null;
  v_Proveedor: string | null;
  d_IGV: number | null;
  d_SubTotal: number | null;
}

// Interface para la request de actualización del detalle de cierre de caja
export interface CashClosingDetailUpdateRequest {
  operacion: string;
  idCierreCajaDetalle: number;
  montoVenta: number;
}

// Interface para la request de eliminación del detalle de cierre de caja
export interface CashClosingDetailDeleteRequest {
  operacion: string;
  idCierreCajaDetalle: number;
}

// Interface para los parámetros de consulta paginada
export interface CashClosingPagedRequest {
  Page: number;
  PageSize: number;
  Anio?: number;
  Mes?: number;
  ClienteEsAgente?: string;
  DocumentoEgreso?: number;
  TipoPeriodo?: string; // 'mensual' | 'diario'
}

// Interface para un cierre de caja en la consulta paginada
export interface CashClosingPagedItem {
  idCierreDiario?: number;
  idCierreCaja: number;
  año: number;
  mes: number;
  nombreMes: string;
  fechaInicio: string;
  fechaFin: string;
  totalIngresos: number;
  totalEgresos: number;
  totalNeto: number;
  cantidadVentas: number;
  cantidadIngresos: number;
  cantidadEgresos: number;
  estadoCierre: number;
  estadoNombre: string;
  estadoColor: string;
  observaciones: string;
  usuarioCreacion: number;
  fechaCreacion: string;
  usuarioModificacion: number;
  fechaModificacion: string;
  formattedTotalIngresos: string;
  formattedTotalEgresos: string;
  formattedTotalNeto: string;
  periodoFormateado: string;
}

// Interface para la información de paginación
export interface CashClosingPagination {
  totalRegistros: number;
  paginaActual: number;
  tamañoPagina: number;
  totalPaginas: number;
}

// Interface para la response de consulta paginada
export interface CashClosingPagedResponse {
  cierres: CashClosingPagedItem[];
  paginacion: CashClosingPagination;
}

// Interface para la response del detalle de cierre de caja
export interface CashClosingDetailResponse {
  operacionRealizada: string;
  idCierreCajaAfectado: number;
  idCierreCajaDetalle: number;
  mensaje: string;
  info: string;
}

// Interface para los parámetros de consulta de detalle paginado
export interface CashClosingDetailPagedRequest {
  IdCierreCaja: number;
  Page: number;
  PageSize: number;
  CorrelativoDocumento?: string;
  EsEgreso?: boolean;
  FechaVenta?: string;
}

// Interface para un detalle de cierre de caja en la consulta paginada
export interface CashClosingDetailPagedItem {
  idCierreCajaDetalle: number;
  idCierreCaja: number;
  idVenta: string;
  fechaVenta: string;
  tipoDocumento: number;
  nombreTipoDocumento: string;
  montoVenta: number;
  esEgreso: boolean;
  tipoOperacion: string;
  categoria: string;
  concepto?: string;
  urlEnvio?: string;
  fechaRegistro: string;
  usuarioCreacion?: number;
  formattedMonto: string;
  formattedFecha: string;
  colorClass: string;
  iconClass: string;
  signPrefix: string;
  correlativoDocumento: string;
}

// Interface para la response de consulta de detalle paginado
export interface CashClosingDetailPagedResponse {
  detalles: CashClosingDetailPagedItem[];
  paginacion: CashClosingPagination;
}

/**
 * Servicio para manejar las operaciones de cierre de caja
 * Hereda de BaseApiService para obtener todos los métodos HTTP
 */
export class CashClosingService extends BaseApiService {
  constructor() {
    super(); // Usar la URL base por defecto
  }

  /**
   * Realiza el cierre de caja mensual
   */
  async createCashClosing(request: CashClosingRequest): Promise<CashClosingResponse> {
    const response = await this.post<CashClosingResponse, CashClosingRequest>(
      '/CashClosing/caja',
      request
    );
    
    return response.objModel;
  }

  /**
   * Realiza el cierre de caja diario
   */
  async createDailyCashClosing(request: CashClosingDailyRequest): Promise<CashClosingDailyResponse> {
    const response = await this.post<CashClosingDailyResponse, CashClosingDailyRequest>(
      '/CashClosing/cajaDiario',
      request
    );
    
    return response.objModel;
  }

  /**
   * Maneja el detalle del cierre de caja (LEGACY)
   */
  async createCashClosingDetail(request: CashClosingDetailRequest): Promise<CashClosingDetailResponse> {
    const response = await this.post<CashClosingDetailResponse, CashClosingDetailRequest>(
      '/CashClosing/detalle',
      request
    );
    
    return response.objModel;
  }

  /**
   * Crea un nuevo movimiento con el objeto completo
   */
  async createCashClosingMovement(request: CashClosingMovementRequest): Promise<CashClosingDetailResponse> {
    const response = await this.post<CashClosingDetailResponse, CashClosingMovementRequest>(
      '/CashClosing/detalle',
      request
    );
    
    return response.objModel;
  }

  /**
   * Actualiza el detalle del cierre de caja (LEGACY - solo monto)
   */
  async updateCashClosingDetail(id: number, request: CashClosingDetailUpdateRequest): Promise<CashClosingDetailResponse> {
    const response = await this.put<CashClosingDetailResponse, CashClosingDetailUpdateRequest>(
      `/CashClosing/detalle/${id}`,
      request
    );
    
    return response.objModel;
  }

  /**
   * Actualiza un movimiento completo usando el objeto completo
   */
  async updateCashClosingMovement(id: number, request: CashClosingMovementRequest): Promise<CashClosingDetailResponse> {
    const response = await this.put<CashClosingDetailResponse, CashClosingMovementRequest>(
      `/CashClosing/detalle/${id}`,
      request
    );
    
    return response.objModel;
  }

  /**
   * Elimina el detalle del cierre de caja
   */
  async deleteCashClosingDetail(id: number, request: CashClosingDetailDeleteRequest): Promise<CashClosingDetailResponse> {
    const response = await this.deleteWithBody<CashClosingDetailResponse, CashClosingDetailDeleteRequest>(
      `/CashClosing/detalle/${id}`,
      request
    );
    
    return response.objModel;
  }

  /**
   * Obtiene los cierres de caja de forma paginada
   */
  async getCashClosingPaged(request: CashClosingPagedRequest): Promise<CashClosingPagedResponse> {
    // Filtrar parámetros nulos o vacíos
    const params: Record<string, unknown> = {};
    
    // Page y PageSize son obligatorios
    params.Page = request.Page;
    params.PageSize = request.PageSize;
    
    // Agregar parámetros opcionales solo si tienen valor
    if (request.Anio !== null && request.Anio !== undefined) {
      params.Anio = request.Anio;
    }
    if (request.Mes !== null && request.Mes !== undefined) {
      params.Mes = request.Mes;
    }
    if (request.ClienteEsAgente !== null && request.ClienteEsAgente !== undefined && request.ClienteEsAgente.trim() !== '') {
      params.ClienteEsAgente = request.ClienteEsAgente;
    }
    if (request.DocumentoEgreso !== null && request.DocumentoEgreso !== undefined && request.DocumentoEgreso !== -1) {
      params.DocumentoEgreso = request.DocumentoEgreso;
    }
    if (request.TipoPeriodo !== null && request.TipoPeriodo !== undefined && request.TipoPeriodo.trim() !== '') {
      params.TipoPeriodo = request.TipoPeriodo;
    }

    const response = await this.get<CashClosingPagedResponse>(
      '/CashClosing/cajaPaged',
      params
    );
    
    return response.objModel;
  }

  /**
   * Obtiene los detalles de un cierre de caja de forma paginada
   */
  async getCashClosingDetailPaged(request: CashClosingDetailPagedRequest): Promise<CashClosingDetailPagedResponse> {
    // Construir parámetros dinámicamente, incluyendo solo los que tienen valor
    const params: Record<string, unknown> = {
      IdCierreCaja: request.IdCierreCaja,
      Page: request.Page,
      PageSize: request.PageSize
    };

    // Agregar parámetros opcionales solo si tienen valor
    if (request.CorrelativoDocumento !== null && request.CorrelativoDocumento !== undefined && request.CorrelativoDocumento.trim() !== '') {
      params.CorrelativoDocumento = request.CorrelativoDocumento;
    }
    if (request.EsEgreso !== null && request.EsEgreso !== undefined) {
      params.EsEgreso = request.EsEgreso;
    }
    if (request.FechaVenta !== null && request.FechaVenta !== undefined && request.FechaVenta.trim() !== '') {
      params.FechaVenta = request.FechaVenta;
    }

    const response = await this.get<CashClosingDetailPagedResponse>(
      '/CashClosing/cajaDetallePaged',
      params
    );
    
    return response.objModel;
  }

  /**
   * Cambia el estado de un cierre de caja (cerrar la caja)
   */
  async closeCashClosing(idCierreCaja: number): Promise<boolean> {
    const response = await this.put<boolean, null>(
      `/CashClosing/caja/${idCierreCaja}`,
      null
    );
    
    return response.objModel;
  }

  /**
   * Obtiene los datos de Gerencia Ventas Asistencial por rango de fechas
   */
  async getGerenciaVentasAsistencial(request: GerenciaVentasAsistencialRequest): Promise<GerenciaVentasAsistencialItem[]> {
    const params = {
      FechaInicio: request.FechaInicio,
      FechaFin: request.FechaFin
    };

    const response = await this.get<GerenciaVentasAsistencialResponse>(
      '/CashClosing/GerenciaVentasAsistencial',
      params
    );
    
    // Si response.objModel es directamente el array, devolverlo
    if (Array.isArray(response.objModel)) {
      return response.objModel;
    }
    
    // Si no, verificar la estructura anidada
    if (response.objModel && typeof response.objModel === 'object' && 'status' in response.objModel) {
      const nestedResponse = response.objModel as { status: number; description?: string; objModel?: GerenciaVentasAsistencialItem[] };
      if (nestedResponse.status === 1) {
        return nestedResponse.objModel || [];
      } else {
        throw new Error(nestedResponse.description || 'Error al obtener datos de Gerencia Ventas Asistencial');
      }
    }
    
    throw new Error('Estructura de respuesta no reconocida');
  }

  /**
   * Obtiene los datos de Gerencia Ventas Farmacia por rango de fechas
   */
  async getGerenciaVentasFarmacia(request: GerenciaVentasAsistencialRequest): Promise<GerenciaVentasAsistencialItem[]> {
    const params = {
      FechaInicio: request.FechaInicio,
      FechaFin: request.FechaFin
    };

    const response = await this.get<GerenciaVentasAsistencialResponse>(
      '/CashClosing/GerenciaVentasFarmacia',
      params
    );
    
    // Si response.objModel es directamente el array, devolverlo
    if (Array.isArray(response.objModel)) {
      return response.objModel;
    }
    
    // Si no, verificar la estructura anidada
    if (response.objModel && typeof response.objModel === 'object' && 'status' in response.objModel) {
      const nestedResponse = response.objModel as { status: number; description?: string; objModel?: GerenciaVentasAsistencialItem[] };
      if (nestedResponse.status === 1) {
        return nestedResponse.objModel || [];
      } else {
        throw new Error(nestedResponse.description || 'Error al obtener datos de Gerencia Ventas Farmacia');
      }
    }
    
    throw new Error('Estructura de respuesta no reconocida');
  }

  /**
   * Obtiene los datos de Gerencia Ventas Ocupacional por rango de fechas
   */
  async getGerenciaVentasOcupacional(request: GerenciaVentasAsistencialRequest): Promise<GerenciaVentasAsistencialItem[]> {
    const params = {
      FechaInicio: request.FechaInicio,
      FechaFin: request.FechaFin
    };

    const response = await this.get<GerenciaVentasAsistencialResponse>(
      '/CashClosing/GerenciaVentasOcupacional',
      params
    );
    
    // Si response.objModel es directamente el array, devolverlo
    if (Array.isArray(response.objModel)) {
      return response.objModel;
    }
    
    // Si no, verificar la estructura anidada
    if (response.objModel && typeof response.objModel === 'object' && 'status' in response.objModel) {
      const nestedResponse = response.objModel as { status: number; description?: string; objModel?: GerenciaVentasAsistencialItem[] };
      if (nestedResponse.status === 1) {
        return nestedResponse.objModel || [];
      } else {
        throw new Error(nestedResponse.description || 'Error al obtener datos de Gerencia Ventas Ocupacional');
      }
    }
    
    throw new Error('Estructura de respuesta no reconocida');
  }

  /**
   * Obtiene los datos de Gerencia Ventas Asistencial MSSISOL por rango de fechas
   */
  async getGerenciaVentasAsistencialMSSISOL(request: GerenciaVentasAsistencialRequest): Promise<GerenciaVentasAsistencialItem[]> {
    const params = {
      FechaInicio: request.FechaInicio,
      FechaFin: request.FechaFin
    };

    const response = await this.get<GerenciaVentasAsistencialResponse>(
      '/CashClosing/GerenciaVentasAsistencialMSSISOL',
      params
    );
    
    // Si response.objModel es directamente el array, devolverlo
    if (Array.isArray(response.objModel)) {
      return response.objModel;
    }
    
    // Si no, verificar la estructura anidada
    if (response.objModel && typeof response.objModel === 'object' && 'status' in response.objModel) {
      const nestedResponse = response.objModel as { status: number; description?: string; objModel?: GerenciaVentasAsistencialItem[] };
      if (nestedResponse.status === 1) {
        return nestedResponse.objModel || [];
      } else {
        throw new Error(nestedResponse.description || 'Error al obtener datos de Gerencia Ventas Asistencial MSSISOL');
      }
    }
    
    throw new Error('Estructura de respuesta no reconocida');
  }
}

// Crear instancia singleton del servicio
export const cashClosingService = new CashClosingService(); 