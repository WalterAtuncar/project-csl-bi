import { BaseApiService } from './BaseApiService';

// ============================================================================
// INTERFACES DE REQUEST
// ============================================================================

export interface GenerarPagoMedicoRequest {
  i_MedicoTratanteId: number;
  d_FechaInicio: string; // format: date-time
  d_FechaFin: string; // format: date-time
  r_PagadoTotal: number;
  v_Comprobante?: string;
  i_InsertUserId: number;
  servicesDetails?: ServicesPaidDetailRequest[];
}

export interface ServicesPaidDetailRequest {
  v_ServiceId?: string;
  r_Price: number;
  r_Porcentaje: number;
  r_Pagado: number;
}

export interface EliminarPagoMedicoRequest {
  i_PaidId: number;
  i_UpdateUserId: number;
  v_MotivoEliminacion?: string;
}

// ============================================================================
// INTERFACES DE RESPONSE
// ============================================================================

export interface GenerarPagoMedicoResponse {
  paidId: number;
  medicoId: number;
  totalPagado: number;
  serviciosInsertados: number;
  fechaPago: string; // format: date-time
  status?: string;
  message?: string;
}

export interface ListarPagosMedicosResponse {
  i_PaidId: number;
  d_PayDate: string; // format: date-time
  i_MedicoTratanteId: number;
  nombreMedico?: string;
  r_PagadoTotal: number;
  v_Comprobante?: string;
  i_IsDeleted: number;
  totalServicios: number;
  totalFormateado?: string;
  fechaPagoFormateada?: string;
  estado?: string;
}

export interface EliminarPagoMedicoResponse {
  paidId: number;
  serviciosEliminados: number;
  montoEliminado: number;
  status?: string;
  message?: string;
}

export interface GetPagoMedicoCompletoByIdResponse {
  cabecera: PagoMedicoCompletoCabecera;
  detalles?: PagoMedicoCompletoDetalle[];
}

export interface PagoMedicoCompletoCabecera {
  i_PaidId: number;
  d_PayDate: string; // format: date-time
  i_MedicoTratanteId: number;
  nombreMedico?: string;
  especialidadMedico?: string;
  r_PagadoTotal: number;
  v_Comprobante?: string;
  i_IsDeleted: number;
  i_InsertUserId: number;
  d_InsertDate: string; // format: date-time
  i_UpdateUserId?: number;
  d_UpdateDate?: string; // format: date-time
  totalServicios: number;
  totalFormateado?: string;
  fechaPagoFormateada?: string;
}

export interface PagoMedicoCompletoDetalle {
  i_PaidDetailId: number;
  i_PaidId: number;
  v_ServiceComponentId?: string;
  r_Price: number;
  r_Porcentaje: number;
  r_Pagado: number;
  d_ServiceDate: string; // format: date-time
  paciente?: string;
  v_ComprobantePago?: string;
  precioFormateado?: string;
  pagadoFormateado?: string;
  fechaServicioFormateada?: string;
  numeroLinea: number;
}

export interface PagoMedicoCompletoResponse {
  cabecera: PagoMedicoCabecera[];
  detalles?: PagoMedicoDetalle[];
}

export interface PagoMedicoCabecera {
  medicoId: number;
  nombreMedico?: string;
  especialidadMedico?: string;
  porcentajeMedico: number;
  totalServiciosGenerados: number;
  montoTotalGenerado: number;
  pagoTotalGenerado: number;
  serviciosPagados: number;
  montoYaPagado: number;
  pagoYaRealizado: number;
  serviciosPendientes: number;
  montoPendientePago: number;
  totalAPagar: number;
  primerServicio: string; // format: date-time
  ultimoServicio: string; // format: date-time
  fechaInicio: string; // format: date-time
  fechaFin: string; // format: date-time
  fechaCalculo: string; // format: date-time
  estadoGeneral?: string;
  totalAPagarFormateado?: string;
  pagoYaRealizadoFormateado?: string;
  pagoTotalGeneradoFormateado?: string;
}

export interface PagoMedicoDetalle {
  v_ServiceComponentId?: string;
  v_ServiceId?: string;
  d_ServiceDate: string; // format: date-time
  paciente?: string;
  v_ComprobantePago?: string;
  precioServicio: number;
  medicoId: number;
  porcentajeMedico: number;
  pagoMedico: number;
  estadoPago?: string;
  fechaPago?: string; // format: date-time
  numeroLinea: number;
  esPagado: number;
  fechaServicioFormateada?: string;
  precioServicioFormateado?: string;
  pagoMedicoFormateado?: string;
  fechaPagoFormateada?: string;
  colorEstado?: string;
  iconoEstado?: string;
  montoPagadoReal?: number;
  porcentajePagadoReal?: number;
  esValido?: boolean;
}

export interface OrganizationInfoResponse {
  v_OrganizationId: string;
  v_IdentificationNumber: string;
  v_Name: string;
  v_Address: string;
  v_PhoneNumber: string;
  v_Mail: string;
}

export interface ResponseDTO {
  status: number;
  description?: string;
  objModel?: unknown;
  token?: string;
  objPaginated?: {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}

// ============================================================================
// INTERFACES PARA FILTROS DE CONSULTA
// ============================================================================

export interface ListarPagosMedicosRequest {
  i_MedicoTratanteId?: number;
  d_FechaInicio?: string; // format: date-time
  d_FechaFin?: string; // format: date-time
  i_IncludeDeleted?: boolean;
}

export interface PagoMedicoAnalisisRequest {
  i_Consultorio?: number;
  i_MedicoTratanteId?: number; // compatibilidad temporal si backend aún no migra
  d_FechaInicio?: string; // format: date-time
  d_FechaFin?: string; // format: date-time
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

class PagoMedicosService extends BaseApiService {
  constructor() {
    super();
  }

  /**
   * POST /PagoMedicos
   * Generar/crear un nuevo pago médico
   */
  async generarPagoMedico(request: GenerarPagoMedicoRequest): Promise<GenerarPagoMedicoResponse> {
    try {
      const response = await this.post<GenerarPagoMedicoResponse>('/PagoMedicos', request);
      return response.objModel as GenerarPagoMedicoResponse;
    } catch (error) {
      console.error('Error al generar pago médico:', error);
      throw error;
    }
  }

  /**
   * GET /PagoMedicos
   * Listar pagos médicos con filtros opcionales
   */
  async listarPagosMedicos(request?: ListarPagosMedicosRequest): Promise<ListarPagosMedicosResponse[]> {
    try {
      const params = new URLSearchParams();
      
      if (request?.i_MedicoTratanteId !== undefined) {
        params.append('i_MedicoTratanteId', request.i_MedicoTratanteId.toString());
      }
      if (request?.d_FechaInicio) {
        params.append('d_FechaInicio', request.d_FechaInicio);
      }
      if (request?.d_FechaFin) {
        params.append('d_FechaFin', request.d_FechaFin);
      }
      if (request?.i_IncludeDeleted !== undefined) {
        params.append('i_IncludeDeleted', request.i_IncludeDeleted.toString());
      }

      const queryString = params.toString();
      const url = `/PagoMedicos${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.get<ListarPagosMedicosResponse[]>(url);
      return response.objModel as ListarPagosMedicosResponse[];
    } catch (error) {
      console.error('Error al listar pagos médicos:', error);
      throw error;
    }
  }

  /**
   * GET /PagoMedicos/{id}
   * Obtener pago médico completo por ID
   */
  async getPagoMedicoCompletoById(id: number): Promise<GetPagoMedicoCompletoByIdResponse> {
    try {
      const response = await this.get<GetPagoMedicoCompletoByIdResponse>(`/PagoMedicos/${id}`);
      return response.objModel as GetPagoMedicoCompletoByIdResponse;
    } catch (error) {
      console.error('Error al obtener pago médico completo:', error);
      throw error;
    }
  }

  /**
   * DELETE /PagoMedicos/{id}
   * Eliminar un pago médico
   */
  async eliminarPagoMedico(id: number, request: EliminarPagoMedicoRequest): Promise<EliminarPagoMedicoResponse> {
    try {
      const response = await this.deleteWithBody<EliminarPagoMedicoResponse>(`/PagoMedicos/${id}`, request);
      return response.objModel as EliminarPagoMedicoResponse;
    } catch (error) {
      console.error('Error al eliminar pago médico:', error);
      throw error;
    }
  }

  /**
   * GET /PagoMedicos/analisis
   * Obtener análisis de pagos médicos
   */
  async getPagoMedicoAnalisis(request?: PagoMedicoAnalisisRequest): Promise<PagoMedicoCompletoResponse> {
    try {
      const params = new URLSearchParams();
      
      // Preferir i_Consultorio si está presente; mantener compatibilidad con i_MedicoTratanteId si no
      if (request?.i_Consultorio !== undefined) {
        params.append('i_Consultorio', request.i_Consultorio.toString());
      } else if (request?.i_MedicoTratanteId !== undefined) {
        params.append('i_MedicoTratanteId', request.i_MedicoTratanteId.toString());
      }
      if (request?.d_FechaInicio) {
        params.append('d_FechaInicio', request.d_FechaInicio);
      }
      if (request?.d_FechaFin) {
        params.append('d_FechaFin', request.d_FechaFin);
      }

      const queryString = params.toString();
      const url = `/PagoMedicos/analisis${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.get<PagoMedicoCompletoResponse>(url);
      return response.objModel as PagoMedicoCompletoResponse;
    } catch (error) {
      console.error('Error al obtener análisis de pago médico:', error);
      throw error;
    }
  }

  /**
   * GET /PagoMedicos/info
   * Obtener información de la organización/clínica
   */
  async getOrganizationInfo(): Promise<OrganizationInfoResponse> {
    try {
      const response = await this.get<OrganizationInfoResponse>('/PagoMedicos/info');
      return response.objModel as OrganizationInfoResponse;
    } catch (error) {
      console.error('Error al obtener información de la organización:', error);
      throw error;
    }
  }
}

// Exportar instancia única del servicio
export const pagoMedicosService = new PagoMedicosService();