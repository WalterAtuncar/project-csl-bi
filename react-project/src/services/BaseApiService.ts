import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { loaderService } from './LoaderService';

// Interfaces para tipado fuerte - Coincide con ResponseDTO de C#
export interface ApiResponse<T = unknown> {
  status: number;           // 1 = success, 0 = failed
  description: string;      // Mensaje descriptivo
  objModel: T;             // Los datos principales
  token?: string;          // Token de autenticación (opcional)
  objPaginated?: {         // Datos de paginación (opcional)
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  message: string;
  status: number;
  errors?: string[];
  code?: string;
}

export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  timeout?: number;
  retries?: number;
  skipLoader?: boolean; // Nueva opción para omitir el loader
}

// Extender el tipo de configuración de axios para incluir propiedades personalizadas
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  _retry?: boolean;
  retries?: number;
  skipLoader?: boolean;
}

// Configuración por defecto
const DEFAULT_CONFIG: AxiosRequestConfig = {
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * Servicio base abstracto para manejar todas las peticiones HTTP
 * Proporciona métodos genéricos para GET, POST, PUT, PATCH, DELETE
 * Maneja autenticación, interceptores, retry logic y manejo de errores
 */
export abstract class BaseApiService {
  protected axiosInstance: AxiosInstance;
  protected baseURL: string;
  protected defaultHeaders: Record<string, string> = {};

  constructor(baseURL: string = '', config: AxiosRequestConfig = {}) {
    this.baseURL = baseURL || this.getBaseURL();
    
    // Crear instancia de axios con configuración personalizada
    this.axiosInstance = axios.create({
      ...DEFAULT_CONFIG,
      ...config,
      baseURL: this.baseURL,
    });

    this.setupInterceptors();
  }

  /**
   * Obtiene la URL base desde variables de entorno o configuración
   */
  private getBaseURL(): string {
    return 'http://190.116.90.35:8183/api'; //import.meta.env.VITE_API_BASE_URL || 'https://localhost:7036/api'; //
  }

  /**
   * Configura los interceptores de request y response
   */
  private setupInterceptors(): void {
    // Interceptor de request - agregar token de autenticación
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const extendedConfig = config as ExtendedAxiosRequestConfig;
        
        // Mostrar loader si no está deshabilitado
        if (!extendedConfig.skipLoader) {
          // Determinar mensaje según el endpoint
          let message = 'Procesando solicitud...';
          const url = config.url?.toLowerCase() || '';
          
          if (url.includes('/auth/login')) {
            message = 'Iniciando sesión...';
          } else if (url.includes('/dashboard')) {
            message = 'Cargando dashboard...';
          } else if (url.includes('/auth/logout')) {
            message = 'Cerrando sesión...';
          } else if (config.method?.toLowerCase() === 'post') {
            message = 'Guardando datos...';
          } else if (config.method?.toLowerCase() === 'put' || config.method?.toLowerCase() === 'patch') {
            message = 'Actualizando información...';
          } else if (config.method?.toLowerCase() === 'delete') {
            message = 'Eliminando registro...';
          } else if (config.method?.toLowerCase() === 'get') {
            message = 'Cargando información...';
          }
          
          loaderService.show(message);
        }
        
        // Agregar token de autenticación si existe
        const token = this.getAuthToken();
        if (token && !extendedConfig.skipAuth) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Agregar headers por defecto
        config.headers = config.headers || {};
        Object.assign(config.headers, this.defaultHeaders);

        // Log de request en desarrollo
        if (import.meta.env.DEV) {
          console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
            data: config.data,
            params: config.params,
          });
        }

        return config;
      },
      (error) => {
        // Ocultar loader en caso de error
        loaderService.hide();
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Interceptor de response - manejo de errores globales
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Ocultar loader en respuesta exitosa
        const config = response.config as ExtendedAxiosRequestConfig;
        if (!config.skipLoader) {
          loaderService.hide();
        }
        
        // Log de response en desarrollo
        if (import.meta.env.DEV) {
          console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
        }

        // Verificar si la respuesta del API indica éxito
        const apiResponse = response.data as ApiResponse;
        if (apiResponse.status === 0) {
          // El API retornó error (status = 0)
          throw new Error(apiResponse.description || 'Error en la respuesta del servidor');
        }

        // Actualizar token si viene en la respuesta
        if (apiResponse.token) {
          localStorage.setItem('authToken', apiResponse.token);
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as ExtendedAxiosRequestConfig;

        // Ocultar loader en caso de error (excepto en retry)
        if (!originalRequest.skipLoader && !originalRequest._retry) {
          loaderService.hide();
        }

        // Manejo de token expirado (401)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshToken();
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        // Retry logic para errores de red
        if (this.shouldRetry(error) && originalRequest.retries && originalRequest.retries > 0) {
          originalRequest.retries--;
          await this.delay(1000); // Esperar 1 segundo antes del retry
          return this.axiosInstance(originalRequest);
        }

        // Log de error
        console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });

        return Promise.reject(this.formatError(error));
      }
    );
  }

  /**
   * Obtiene el token de autenticación del localStorage o context
   */
  protected getAuthToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  /**
   * Maneja la renovación del token de autenticación
   */
  protected async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/refresh`, {
        refreshToken,
      });

      const apiResponse = response.data as ApiResponse<{ token: string; refreshToken: string }>;
      if (apiResponse.status === 1 && apiResponse.objModel) {
        localStorage.setItem('authToken', apiResponse.objModel.token);
        localStorage.setItem('refreshToken', apiResponse.objModel.refreshToken);
      } else {
        throw new Error(apiResponse.description || 'Error al renovar token');
      }
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      throw error;
    }
  }

  /**
   * Maneja errores de autenticación (logout, redirect, etc.)
   */
  protected handleAuthError(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    
    // Disparar evento personalizado para que la app maneje el logout
    window.dispatchEvent(new CustomEvent('auth:logout'));
    
    // Opcional: redirect a login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  /**
   * Determina si se debe reintentar la petición
   */
  private shouldRetry(error: AxiosError): boolean {
    return (
      !error.response || // Error de red
      error.response.status >= 500 || // Error del servidor
      error.code === 'ECONNABORTED' // Timeout
    );
  }

  /**
   * Delay para retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Formatea errores de axios a un formato consistente
   */
  private formatError(error: AxiosError): ApiError {
    const apiError: ApiError = {
      message: 'Ha ocurrido un error inesperado',
      status: 500,
    };

    if (error.response) {
      // Error de respuesta del servidor
      const responseData = error.response.data as ApiResponse;
      apiError.status = error.response.status;
      
      // Si es una respuesta del API con formato ResponseDTO
      if (responseData && typeof responseData === 'object' && 'description' in responseData) {
        apiError.message = responseData.description || error.message;
        apiError.code = responseData.status?.toString();
      } else {
        // Respuesta de error genérica
        const genericResponse = error.response.data as Record<string, unknown>;
        apiError.message = (genericResponse?.message as string) || error.message;
        apiError.errors = genericResponse?.errors as string[];
        apiError.code = genericResponse?.code as string;
      }
    } else if (error.request) {
      // Error de red
      apiError.message = 'Error de conexión. Verifique su conexión a internet.';
      apiError.status = 0;
    } else {
      // Error de configuración
      apiError.message = error.message;
    }

    return apiError;
  }

  /**
   * Establece headers por defecto para todas las peticiones
   */
  public setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Método GET genérico
   */
  protected async get<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance.get(endpoint, {
      params,
      ...config,
    });
    return response.data;
  }

  /**
   * Método POST genérico
   */
  protected async post<T = unknown, D = unknown>(
    endpoint: string,
    data?: D,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance.post(endpoint, data, config);
    return response.data;
  }

  /**
   * Método PUT genérico
   */
  protected async put<T = unknown, D = unknown>(
    endpoint: string,
    data?: D,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance.put(endpoint, data, config);
    return response.data;
  }

  /**
   * Método PATCH genérico
   */
  protected async patch<T = unknown, D = unknown>(
    endpoint: string,
    data?: D,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance.patch(endpoint, data, config);
    return response.data;
  }

  /**
   * Método DELETE genérico
   */
  protected async delete<T = unknown>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance.delete(endpoint, config);
    return response.data;
  }

  /**
   * Método DELETE genérico con body
   */
  protected async deleteWithBody<T = unknown, D = unknown>(
    endpoint: string,
    data?: D,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance.delete(endpoint, {
      data,
      ...config,
    });
    return response.data;
  }

  /**
   * Método para subir archivos
   */
  protected async uploadFile<T = unknown>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, unknown>,
    onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, String(additionalData[key]));
      });
    }

    const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
      ...config,
    });

    return response.data;
  }

  /**
   * Método para descargar archivos
   */
  protected async downloadFile(
    endpoint: string,
    filename?: string,
    params?: Record<string, unknown>,
    config?: RequestConfig
  ): Promise<void> {
    const response = await this.axiosInstance.get(endpoint, {
      params,
      responseType: 'blob',
      ...config,
    });

    // Crear URL del blob y descargar
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'download');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Método para cancelar peticiones
   */
  protected createCancelToken() {
    return axios.CancelToken.source();
  }

  /**
   * Método para verificar si una petición fue cancelada
   */
  protected isCancelledRequest(error: unknown): boolean {
    return axios.isCancel(error);
  }

  /**
   * Método para limpiar recursos
   */
  public dispose(): void {
    // Limpiar interceptores si es necesario
    this.axiosInstance.interceptors.request.clear();
    this.axiosInstance.interceptors.response.clear();
  }
} 