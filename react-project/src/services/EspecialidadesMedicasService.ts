import { BaseApiService } from './BaseApiService';

// Interface para la request de creación de especialidad
export interface CreateEspecialidadRequest {
  nombreEspecialidad: string;
  porcentajePago?: number;
  userId?: number;
}

// Interface para la response de creación de especialidad
export interface CreateEspecialidadResponse {
  id: number;
  nombreEspecialidad: string | null;
  porcentajePago: number;
  isDeleted: boolean;
  createdBy: number;
  createdDate: string;
  updatedBy: number;
  updatedDate: string | null;
  status: string | null;
  message: string | null;
}

// Interface para la response de especialidad
export interface EspecialidadResponse {
  id: number;
  nombreEspecialidad: string | null;
  porcentajePago: number;
  isDeleted: boolean;
  createdBy: number;
  createdDate: string;
  updatedBy: number;
  updatedDate: string | null;
}

// Interface para la response de obtener especialidad por ID
export interface GetEspecialidadByIdResponse {
  id: number;
  nombreEspecialidad: string | null;
  porcentajePago: number;
  isDeleted: boolean;
  createdBy: number;
  createdDate: string;
  updatedBy: number;
  updatedDate: string | null;
  status: string | null;
  message: string | null;
}

// Interface para la request de actualización de especialidad
export interface UpdateEspecialidadRequest {
  nombreEspecialidad: string;
  porcentajePago?: number;
  userId?: number;
}

// Interface para la response de actualización de especialidad
export interface UpdateEspecialidadResponse {
  id: number;
  nombreEspecialidad: string | null;
  porcentajePago: number;
  updatedBy: number;
  updatedDate: string;
  status: string | null;
  message: string | null;
}

// Interface para la response de eliminación de especialidad
export interface DeleteEspecialidadResponse {
  id: number;
  status: string | null;
  message: string | null;
}

// Interface para la request de actualización de porcentaje
export interface UpdatePorcentajeRequest {
  nuevoPorcentaje?: number;
  userId?: number;
}

// Interface para la response de actualización de porcentaje
export interface UpdatePorcentajeResponse {
  id: number;
  nombreEspecialidad: string | null;
  porcentajePago: number;
  updatedBy: number;
  updatedDate: string;
  status: string | null;
  message: string | null;
}

// Interface para los parámetros de búsqueda de especialidades
export interface SearchEspecialidadesRequest {
  Filtro?: string;
  PorcentajeMin?: number;
  PorcentajeMax?: number;
  IncludeDeleted?: boolean;
}

// Interface para los parámetros de listado de especialidades
export interface GetEspecialidadesRequest {
  includeDeleted?: boolean;
}

// Interface para los parámetros de eliminación
export interface DeleteEspecialidadRequest {
  userId?: number;
}

// Interface para la request de búsqueda de profesionales
export interface SearchProfesionalesRequest {
  TextSearch?: string;
}

// Interface para la respuesta de profesional/usuario
export interface ProfesionalResponse {
  systemUserId: number;
  personId: string;
  userName: string;
  name: string;
}

// Interface para la estructura de respuesta base de la API
export interface ResponseDTO<T = unknown> {
  status: number;
  description: string | null;
  objModel: T | null;
  token: string | null;
  objPaginated: unknown | null;
}

/**
 * Servicio para manejar las operaciones de especialidades médicas
 * Hereda de BaseApiService para obtener todos los métodos HTTP
 */
export class EspecialidadesMedicasService extends BaseApiService {
  constructor() {
    super(); // Usar la URL base por defecto
  }

  /**
   * Crea una nueva especialidad médica
   */
  async createEspecialidad(request: CreateEspecialidadRequest): Promise<CreateEspecialidadResponse> {
    const response = await this.post<CreateEspecialidadResponse, CreateEspecialidadRequest>(
      '/Especialidades',
      request
    );

    return response.objModel;
  }

  /**
   * Obtiene todas las especialidades médicas
   */
  async getEspecialidades(request?: GetEspecialidadesRequest): Promise<EspecialidadResponse[]> {
    const params: Record<string, unknown> = {};

    if (request?.includeDeleted !== undefined) {
      params.includeDeleted = request.includeDeleted;
    }

    const response = await this.get<EspecialidadResponse[]>(
      '/Especialidades',
      Object.keys(params).length > 0 ? params : undefined
    );

    return response.objModel;
  }

  /**
   * Obtiene una especialidad médica por ID
   */
  async getEspecialidadById(id: number): Promise<GetEspecialidadByIdResponse> {
    const response = await this.get<GetEspecialidadByIdResponse>(
      `/Especialidades/${id}`
    );

    return response.objModel;
  }

  /**
   * Actualiza una especialidad médica
   */
  async updateEspecialidad(id: number, request: UpdateEspecialidadRequest): Promise<UpdateEspecialidadResponse> {
    const response = await this.put<UpdateEspecialidadResponse, UpdateEspecialidadRequest>(
      `/Especialidades/${id}`,
      request
    );

    return response.objModel;
  }

  /**
   * Elimina una especialidad médica
   */
  async deleteEspecialidad(id: number, request?: DeleteEspecialidadRequest): Promise<DeleteEspecialidadResponse> {
    const params: Record<string, unknown> = {};

    if (request?.userId !== undefined) {
      params.userId = request.userId;
    }

    const response = await this.delete<DeleteEspecialidadResponse>(
      `/Especialidades/${id}`,
      Object.keys(params).length > 0 ? params : undefined
    );

    return response.objModel;
  }

  /**
   * Actualiza solo el porcentaje de pago de una especialidad
   */
  async updatePorcentaje(id: number, request: UpdatePorcentajeRequest): Promise<UpdatePorcentajeResponse> {
    const response = await this.patch<UpdatePorcentajeResponse, UpdatePorcentajeRequest>(
      `/Especialidades/${id}/porcentaje`,
      request
    );

    return response.objModel;
  }

  /**
   * Busca especialidades con filtros avanzados
   */
  async searchEspecialidades(request?: SearchEspecialidadesRequest): Promise<EspecialidadResponse[]> {
    const params: Record<string, unknown> = {};

    if (request?.Filtro !== undefined && request.Filtro.trim() !== '') {
      params.Filtro = request.Filtro;
    }
    if (request?.PorcentajeMin !== undefined) {
      params.PorcentajeMin = request.PorcentajeMin;
    }
    if (request?.PorcentajeMax !== undefined) {
      params.PorcentajeMax = request.PorcentajeMax;
    }
    if (request?.IncludeDeleted !== undefined) {
      params.IncludeDeleted = request.IncludeDeleted;
    }

    const response = await this.get<EspecialidadResponse[]>(
      '/Especialidades/search',
      Object.keys(params).length > 0 ? params : undefined
    );

    return response.objModel;
  }

  /**
   * Busca profesionales por texto
   */
  async searchProfesionales(request?: SearchProfesionalesRequest): Promise<ProfesionalResponse[]> {
    const params: Record<string, unknown> = {};

    if (request?.TextSearch !== undefined && request.TextSearch.trim() !== '') {
      params.TextSearch = request.TextSearch;
    }

    const response = await this.get<ProfesionalResponse[]>(
      '/Especialidades/profesionales/search',
      Object.keys(params).length > 0 ? params : undefined
    );

    return response.objModel;
  }
}

// Crear instancia singleton del servicio
export const especialidadesMedicasService = new EspecialidadesMedicasService(); 