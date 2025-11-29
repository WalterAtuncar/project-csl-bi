/**
 * Archivo de índice para exportar todos los servicios
 */

// Exportar el servicio base
export { BaseApiService } from './BaseApiService';
export type { ApiResponse, ApiError, RequestConfig } from './BaseApiService';

// Exportar configuración
export { getConfig, isDevelopment, isProduction, defaultConfig } from './config';
export type { ApiConfig, AppConfig } from './config';

// Exportar servicios específicos
export { DashboardService, dashboardService } from './DashboardService';
export type { GeneralDashboardRequest, GeneralDashboardResponse } from './DashboardService';

export { AuthService, authService } from './AuthService';
export type { LoginRequest, LoginResponse, UserData } from './AuthService';

// Exportar servicio de loader
export { LoaderService, loaderService } from './LoaderService';

// Exportar servicio de Anthropic
export { AnthropicService } from './AnthropicService';

// Exportar servicio de Crypto
export { CryptoService } from './CryptoService';

// Exportar servicio de Especialidades Médicas
export { EspecialidadesMedicasService, especialidadesMedicasService } from './EspecialidadesMedicasService';
export type { 
  CreateEspecialidadRequest, 
  CreateEspecialidadResponse,
  EspecialidadResponse,
  GetEspecialidadByIdResponse,
  UpdateEspecialidadRequest,
  UpdateEspecialidadResponse,
  DeleteEspecialidadResponse,
  UpdatePorcentajeRequest,
  UpdatePorcentajeResponse,
  SearchEspecialidadesRequest,
  GetEspecialidadesRequest,
  DeleteEspecialidadRequest,
  SearchProfesionalesRequest,
  ProfesionalResponse,
  ResponseDTO
} from './EspecialidadesMedicasService';

// Exportar servicio de Pago Médicos
export { pagoMedicosService } from './PagoMedicosService';
export type {
  GenerarPagoMedicoRequest,
  GenerarPagoMedicoResponse,
  ServicesPaidDetailRequest,
  ListarPagosMedicosResponse,
  EliminarPagoMedicoRequest,
  EliminarPagoMedicoResponse,
  GetPagoMedicoCompletoByIdResponse,
  PagoMedicoCompletoCabecera,
  PagoMedicoCompletoDetalle,
  PagoMedicoCompletoResponse,
  PagoMedicoCabecera,
  PagoMedicoDetalle,
  ListarPagosMedicosRequest,
  PagoMedicoAnalisisRequest
} from './PagoMedicosService';

// Exportar servicio de Caja
export { default as CajaService } from './CajaService';
export type {
  GetTiposCajaRequest,
  TipoCajaResponse,
  CajaApiResponse,
  EstadoCierreResponse,
  // Nuevos tipos para verificación y borrado de cierre
  CheckCierreExistsRequest,
  CajaMayorCierreExistsResponse,
  DeleteCierreRequest,
  DeleteCajaMayorCierreResponse
} from '../@types/caja';

// Aquí se exportarán otros servicios cuando se creen
// export { PatientService } from './PatientService';
// export { AppointmentService } from './AppointmentService';
// export { UserService } from './UserService';
// etc...