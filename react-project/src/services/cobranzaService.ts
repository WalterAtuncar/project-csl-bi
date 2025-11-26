import { BaseApiService } from './BaseApiService';
import type { ApiResponse, RequestConfig } from './BaseApiService';
import {
  // Request types
  FiltroBusquedaMSRequest,
  FiltroBusquedaMSRequestSISOL,
  FiltroBusquedaMSRequestSISOL2,
  FiltroBusquedaMSVentas,
  FiltroBusquedaMSVentas2,
  FiltroBusquedaMSEgresos,
  FiltroBusquedaMSVentasAll,
  FiltroBusquedaFechasMSRequest,
  LiquidacionFiltrosRequest,
  LiquidacionFiltrosEmpresaFechas,
  LiquidacionFiltrosEmpresaRequest,
  // Response types
  GerenciaVentasDetalleResponse,
  mdlExternoVentasSanLorenzoGlobResponse,
  mdlExternoVentasSanLorenzoMKTGlobResponse,
  mdlExternoSanLorenzoGlobEgresos,
  mdlExternoVentasSanLorenzoGlobResponseAll,
  LiquidacionResponse,
  LiquidacionEmpresaResponse,
  LiquidacionesConsolidadoResponse,
  IndicadoresLaboratorioResponse1,
  IndicadoresLaboratorioResponse2,
  IndicadoresLaboratorioResponse34,
  IndicadoresLaboratorioResponse5,
  IndicadoresLaboratorioResponse6,
  MarcaResponse,
  ProveedorResponse,
  cobranzaDetalleResponse,
  LiquidacionEmpresaList
} from '../@types/facturacion';

/**
 * Servicio de Cobranza para Facturación
 * Maneja todas las operaciones relacionadas con cobranza, ventas y reportes gerenciales
 */
class CobranzaService extends BaseApiService {
  private static instance: CobranzaService;
  private readonly baseUrl = '/cobranza';

  private constructor() {
    super();
  }

  /**
   * Sobrescribe la URL base específicamente para cobranzas
   */
  protected getCobranzaBaseURL(): string {
    return import.meta.env.VITE_COBRANZA_API_BASE_URL || 'https://localhost:7043/api' ; //'http://190.116.90.35:8184/api'; //
  }

  /**
   * Método POST personalizado para cobranzas
   */
  protected async postCobranza<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    const fullUrl = `${this.getCobranzaBaseURL()}${this.baseUrl}${url}`;
    return this.customRequest<T>('POST', fullUrl, data, config);
  }

  /**
   * Método GET personalizado para cobranzas
   */
  protected async getCobranza<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const fullUrl = `${this.getCobranzaBaseURL()}${this.baseUrl}${url}`;
    return this.customRequest<T>('GET', fullUrl, undefined, config);
  }

  /**
   * Método POST personalizado para reportes gerenciales
   */
  protected async postReportesGerencia<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    const fullUrl = `${this.getCobranzaBaseURL()}/reportesGerencia${url}`;
    return this.customRequest<T>('POST', fullUrl, data, config);
  }

  /**
   * Método customizado para realizar requests con URL completa
   */
  private async customRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    fullUrl: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.request({
        method,
        url: fullUrl,
        data,
        ...config
      });

      return {
        status: 1,
        description: response.data.description || 'Operación exitosa',
        objModel: response.data.objModel || response.data,
        token: response.data.token
      };
    } catch (error) {
      console.error(`Error en ${method} ${fullUrl}:`, error);
      throw error;
    }
  }

  public static getInstance(): CobranzaService {
    if (!CobranzaService.instance) {
      CobranzaService.instance = new CobranzaService();
    }
    return CobranzaService.instance;
  }

  // ========================================
  // MÉTODOS PARA CIERRE DE CAJA - ASISTENCIAL
  // ========================================

  /**
   * Obtiene ventas asistenciales para cierre de caja
   */
  async getGerenciaVentasAsistencialMS(request: FiltroBusquedaMSRequest): Promise<ApiResponse<GerenciaVentasDetalleResponse[]>> {
    return this.postCobranza<GerenciaVentasDetalleResponse[]>('/GerenciaVentasAsistencialMS', request);
  }

  /**
   * Obtiene ventas asistenciales SISOL para cierre de caja
   */
  async getGerenciaVentasAsistencialMSSISOL(request: FiltroBusquedaMSRequest): Promise<ApiResponse<GerenciaVentasDetalleResponse[]>> {
    return this.postCobranza<GerenciaVentasDetalleResponse[]>('/GerenciaVentasAsistencialMSSISOL', request);
  }

  /**
   * Obtiene ventas asistenciales SISOL (nueva versión) para cierre de caja
   */
  async getGerenciaVentasAsistencialMSSISOL_NEW(request: FiltroBusquedaMSRequest): Promise<ApiResponse<GerenciaVentasDetalleResponse[]>> {
    return this.post<GerenciaVentasDetalleResponse[]>(`${this.baseUrl}/GerenciaVentasAsistencialMSSISOL_NEW`, request);
  }

  /**
   * Obtiene ventas asistenciales (nueva versión) para cierre de caja
   */
  async getGerenciaVentasAsistencialMS_NEW(request: FiltroBusquedaMSRequest): Promise<ApiResponse<GerenciaVentasDetalleResponse[]>> {
    return this.post<GerenciaVentasDetalleResponse[]>(`${this.baseUrl}/GerenciaVentasAsistencialMS_NEW`, request);
  }

  // ========================================
  // MÉTODOS PARA CIERRE DE CAJA - OCUPACIONAL
  // ========================================

  /**
   * Obtiene ventas ocupacionales para cierre de caja
   */
  async getGerenciaVentasOcupacionalMS(request: FiltroBusquedaMSRequest): Promise<ApiResponse<GerenciaVentasDetalleResponse[]>> {
    return this.postReportesGerencia<GerenciaVentasDetalleResponse[]>('/GerenciaVentasOcupacionalMS', request);
  }

  /**
   * Obtiene ventas ocupacionales (nueva versión) para cierre de caja
   */
  async getGerenciaVentasOcupacionalMS_NEW(request: FiltroBusquedaMSRequest): Promise<ApiResponse<GerenciaVentasDetalleResponse[]>> {
    return this.post<GerenciaVentasDetalleResponse[]>(`${this.baseUrl}/GerenciaVentasOcupacionalMS_NEW`, request);
  }

  // ========================================
  // MÉTODOS PARA CIERRE DE CAJA - MTC
  // ========================================

  /**
   * Obtiene ventas MTC para cierre de caja
   */
  async getGerenciaVentasMTCMS(request: FiltroBusquedaMSRequest): Promise<ApiResponse<GerenciaVentasDetalleResponse[]>> {
    return this.postReportesGerencia<GerenciaVentasDetalleResponse[]>('/GerenciaVentasMTCMS', request);
  }

  // ========================================
  // MÉTODOS PARA CIERRE DE CAJA - FARMACIA
  // ========================================

  /**
   * Obtiene ventas de farmacia para cierre de caja
   */
  async getGerenciaVentasFarmaciaMS(request: FiltroBusquedaMSRequest): Promise<ApiResponse<GerenciaVentasDetalleResponse[]>> {
    return this.postReportesGerencia<GerenciaVentasDetalleResponse[]>('/GerenciaVentasFarmaciaMS', request);
  }

  // ========================================
  // MÉTODOS PARA CIERRE DE CAJA - SAN LORENZO GLOBAL
  // ========================================

  /**
   * Obtiene ventas asistenciales San Lorenzo Global para cierre de caja
   */
  async getGerenciaVentasAsistencialMSGLOBAL_ListaVentas(request: FiltroBusquedaMSVentas): Promise<ApiResponse<mdlExternoVentasSanLorenzoGlobResponse[]>> {
    return this.post<mdlExternoVentasSanLorenzoGlobResponse[]>(`${this.baseUrl}/GerenciaVentasAsistencialMSGLOBAL_ListaVentas`, request);
  }

  /**
   * Obtiene servicios asistenciales San Lorenzo Global para cierre de caja
   */
  async getGerenciaVentasAsistencialMSGLOBAL_ListaService(request: FiltroBusquedaMSVentas): Promise<ApiResponse<mdlExternoVentasSanLorenzoGlobResponse[]>> {
    return this.post<mdlExternoVentasSanLorenzoGlobResponse[]>(`${this.baseUrl}/GerenciaVentasAsistencialMSGLOBAL_ListaService`, request);
  }

  /**
   * Obtiene servicios asistenciales San Lorenzo Global con filtros para cierre de caja
   */
  async getGerenciaVentasAsistencialMSGLOBAL_ListaService_Filtros(request: FiltroBusquedaMSVentas2): Promise<ApiResponse<mdlExternoVentasSanLorenzoGlobResponse[]>> {
    return this.post<mdlExternoVentasSanLorenzoGlobResponse[]>(`${this.baseUrl}/GerenciaVentasAsistencialMSGLOBAL_ListaService_Filtros`, request);
  }

  /**
   * Obtiene ventas asistenciales San Lorenzo Global para envío
   */
  async getGerenciaVentasAsistencialMSGLOBALT_ENVIO(request: FiltroBusquedaMSVentas): Promise<ApiResponse<mdlExternoVentasSanLorenzoGlobResponse[]>> {
    return this.post<mdlExternoVentasSanLorenzoGlobResponse[]>(`${this.baseUrl}/GerenciaVentasAsistencialMSGLOBALT_ENVIO`, request);
  }

  /**
   * Obtiene ventas asistenciales San Lorenzo Global para marketing
   */
  async getGerenciaVentasAsistencialMSGLOBAL_ENVIO_MKT(request: FiltroBusquedaMSVentas): Promise<ApiResponse<mdlExternoVentasSanLorenzoMKTGlobResponse[]>> {
    return this.post<mdlExternoVentasSanLorenzoMKTGlobResponse[]>(`${this.baseUrl}/GerenciaVentasAsistencialMSGLOBAL_ENVIO_MKT`, request);
  }

  /**
   * Obtiene todas las ventas asistenciales San Lorenzo Global para cierre de caja
   */
  async getGerenciaVentasAsistencialAll(request: FiltroBusquedaMSVentasAll): Promise<ApiResponse<mdlExternoVentasSanLorenzoGlobResponseAll[]>> {
    return this.post<mdlExternoVentasSanLorenzoGlobResponseAll[]>(`${this.baseUrl}/GerenciaVentasAsistencialAll`, request);
  }

  // ========================================
  // MÉTODOS PARA CIERRE DE CAJA - SISOL
  // ========================================

  /**
   * Obtiene ventas asistenciales SISOL para envío
   */
  async getGerenciaVentasAsistencialMSSISOL_ENVIO(request: FiltroBusquedaMSRequestSISOL): Promise<ApiResponse<mdlExternoVentasSanLorenzoGlobResponse[]>> {
    return this.post<mdlExternoVentasSanLorenzoGlobResponse[]>(`${this.baseUrl}/GerenciaVentasAsistencialMSSISOL_ENVIO`, request);
  }

  /**
   * Obtiene ventas asistenciales SISOL para envío (versión ventas)
   */
  async getGerenciaVentasAsistencialMSSISOL_ENVIO_Ventas(request: FiltroBusquedaMSVentas): Promise<ApiResponse<mdlExternoVentasSanLorenzoGlobResponse[]>> {
    return this.post<mdlExternoVentasSanLorenzoGlobResponse[]>(`${this.baseUrl}/GerenciaVentasAsistencialMSSISOL_ENVIO`, request);
  }

  /**
   * Obtiene ventas asistenciales SISOL anuladas para cierre de caja
   */
  async getGerenciaVentasAsistencialMSSISOL_ENVIO_ANULADOS(request: FiltroBusquedaMSRequestSISOL): Promise<ApiResponse<mdlExternoVentasSanLorenzoGlobResponse[]>> {
    return this.post<mdlExternoVentasSanLorenzoGlobResponse[]>(`${this.baseUrl}/GerenciaVentasAsistencialMSSISOL_ENVIO_ANULADOS`, request);
  }

  /**
   * Obtiene egresos asistenciales SISOL para cierre de caja
   */
  async getGerenciaVentasAsistencialMSSISOL_ENVIO_EGRESOS(request: FiltroBusquedaMSRequestSISOL2): Promise<ApiResponse<mdlExternoVentasSanLorenzoGlobResponse[]>> {
    return this.post<mdlExternoVentasSanLorenzoGlobResponse[]>(`${this.baseUrl}/GerenciaVentasAsistencialMSSISOL_ENVIO_EGRESOS`, request);
  }

  // ========================================
  // MÉTODOS PARA CIERRE DE CAJA - EGRESOS
  // ========================================

  /**
   * Obtiene egresos asistenciales San Lorenzo Global para cierre de caja
   */
  async getGerenciaVentasAsistencialMSGLOBAL_EGRESOS(request: FiltroBusquedaMSEgresos): Promise<ApiResponse<mdlExternoSanLorenzoGlobEgresos[]>> {
    return this.post<mdlExternoSanLorenzoGlobEgresos[]>(`${this.baseUrl}/GerenciaVentasAsistencialMSGLOBAL_EGRESOS`, request);
  }

  // ========================================
  // MÉTODOS PARA LIQUIDACIONES
  // ========================================

  /**
   * Obtiene liquidaciones no facturadas
   */
  async getNoLiquidados(request: LiquidacionFiltrosRequest): Promise<ApiResponse<LiquidacionResponse[]>> {
    return this.post<LiquidacionResponse[]>(`${this.baseUrl}/GetNoLiquidados`, request);
  }

  /**
   * Obtiene liquidaciones por empresa
   */
  async getLiquidacionCuentasPorCobrar(request: LiquidacionFiltrosEmpresaFechas): Promise<ApiResponse<LiquidacionEmpresaResponse[]>> {
    return this.post<LiquidacionEmpresaResponse[]>(`${this.baseUrl}/GetLiquidacionCuentasPorCobrar`, request);
  }

  /**
   * Obtiene liquidaciones pendientes de facturar
   */
  async getLiqPendFacturarDETALLE(request: LiquidacionFiltrosEmpresaFechas): Promise<ApiResponse<LiquidacionesConsolidadoResponse[]>> {
    return this.post<LiquidacionesConsolidadoResponse[]>(`${this.baseUrl}/GetLiqPendFacturarDETALLE`, request);
  }

  /**
   * Obtiene lista de liquidaciones por empresa
   */
  async getEmpresaPorLiquidacion(request: LiquidacionFiltrosEmpresaRequest): Promise<ApiResponse<LiquidacionEmpresaList[]>> {
    return this.post<LiquidacionEmpresaList[]>(`${this.baseUrl}/GetEmpresaPorLiquidacion`, request);
  }

  /**
   * Obtiene liquidaciones por estado
   */
  async getListaLiquidacionNoStatus(request: LiquidacionFiltrosRequest): Promise<ApiResponse<LiquidacionResponse[]>> {
    return this.post<LiquidacionResponse[]>(`${this.baseUrl}/ListaLiquidacionNoStatus`, request);
  }

  /**
   * Obtiene liquidaciones por estado específico
   */
  async getListaLiquidacion_Liq_2(request: LiquidacionFiltrosRequest): Promise<ApiResponse<LiquidacionResponse[]>> {
    return this.post<LiquidacionResponse[]>(`${this.baseUrl}/ListaLiquidacion_Liq_2`, request);
  }

  /**
   * Obtiene liquidaciones facturadas estado 1
   */
  async getListaLiquidacion_Liq_Fac_1(request: LiquidacionFiltrosRequest): Promise<ApiResponse<LiquidacionResponse[]>> {
    return this.post<LiquidacionResponse[]>(`${this.baseUrl}/ListaLiquidacion_Liq_Fac_1`, request);
  }

  /**
   * Obtiene liquidaciones facturadas estado 2
   */
  async getListaLiquidacion_Liq_Fac_2(request: LiquidacionFiltrosRequest): Promise<ApiResponse<LiquidacionResponse[]>> {
    return this.post<LiquidacionResponse[]>(`${this.baseUrl}/ListaLiquidacion_Liq_Fac_2`, request);
  }

  /**
   * Obtiene liquidaciones facturadas estado 3
   */
  async getListaLiquidacion_Liq_Fac_3(request: LiquidacionFiltrosRequest): Promise<ApiResponse<LiquidacionResponse[]>> {
    return this.post<LiquidacionResponse[]>(`${this.baseUrl}/ListaLiquidacion_Liq_Fac_3`, request);
  }

  // ========================================
  // MÉTODOS PARA INDICADORES DE LABORATORIO
  // ========================================

  /**
   * Obtiene indicadores de laboratorio por cantidad
   */
  async getLaboratorioIndicadores_Cantidad(request: FiltroBusquedaFechasMSRequest): Promise<ApiResponse<IndicadoresLaboratorioResponse1[]>> {
    return this.post<IndicadoresLaboratorioResponse1[]>(`${this.baseUrl}/LaboratorioIndicadores_Cantidad`, request);
  }

  /**
   * Obtiene indicadores de laboratorio por grupo y examen
   */
  async getLaboratorioIndicadores_GrupoyExamen(request: FiltroBusquedaFechasMSRequest): Promise<ApiResponse<IndicadoresLaboratorioResponse34[]>> {
    return this.post<IndicadoresLaboratorioResponse34[]>(`${this.baseUrl}/LaboratorioIndicadores_GrupoyExamen`, request);
  }

  /**
   * Obtiene indicadores de laboratorio por mina y empresa
   */
  async getLaboratorioIndicadores_MinaEmpresa(request: FiltroBusquedaFechasMSRequest): Promise<ApiResponse<IndicadoresLaboratorioResponse2[]>> {
    return this.post<IndicadoresLaboratorioResponse2[]>(`${this.baseUrl}/LaboratorioIndicadores_MinaEmpresa`, request);
  }

  /**
   * Obtiene indicadores de laboratorio por órdenes médicas
   */
  async getLaboratorioIndicadores_OrdenesMedicos6(request: FiltroBusquedaFechasMSRequest): Promise<ApiResponse<IndicadoresLaboratorioResponse6[]>> {
    return this.post<IndicadoresLaboratorioResponse6[]>(`${this.baseUrl}/LaboratorioIndicadores_OrdenesMedicos6`, request);
  }

  /**
   * Obtiene indicadores de laboratorio por servicio disgregado
   */
  async getLaboratorioIndicadores_ServicioDisgregado5(request: FiltroBusquedaFechasMSRequest): Promise<ApiResponse<IndicadoresLaboratorioResponse5[]>> {
    return this.post<IndicadoresLaboratorioResponse5[]>(`${this.baseUrl}/LaboratorioIndicadores_ServicioDisgregado5`, request);
  }

  // ========================================
  // MÉTODOS PARA CATÁLOGOS
  // ========================================

  /**
   * Obtiene marcas por filtro
   */
  async getCLMarca(filtro: string): Promise<ApiResponse<MarcaResponse[]>> {
    return this.get<MarcaResponse[]>(`${this.baseUrl}/GetCLMarca?filtro=${encodeURIComponent(filtro)}`);
  }

  /**
   * Obtiene proveedores por filtro
   */
  async getCLProveedor(filtro: string): Promise<ApiResponse<ProveedorResponse[]>> {
    return this.get<ProveedorResponse[]>(`${this.baseUrl}/GetCLProveedor?filtro=${encodeURIComponent(filtro)}`);
  }

  // ========================================
  // MÉTODOS PARA COBRANZA
  // ========================================

  /**
   * Obtiene detalle de cobranza por ID de venta
   */
  async getCobranzaDetalleByIdVenta(id: string): Promise<ApiResponse<cobranzaDetalleResponse[]>> {
    return this.get<cobranzaDetalleResponse[]>(`${this.baseUrl}/GetCobranzaDetalleByIdVenta?id=${encodeURIComponent(id)}`);
  }

  /**
   * Anula venta mal enviada
   */
  async anularVentaMalEnviada(id: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.post<{ success: boolean; message: string }>(`${this.baseUrl}/ANULAR_VENTA_MAL_ENVIADA`, { id });
  }

  // ========================================
  // MÉTODOS PARA CIERRE DE CAJA - CONSOLIDADO
  // ========================================

  /**
   * Obtiene resumen consolidado para cierre de caja de todos los tipos
   */
  async getResumenConsolidadoCierreCaja(fechaInicio: string, fechaFin: string) {
    const requests = [
      // Asistencial
      this.getGerenciaVentasAsistencialMS({ fechaInicio, fechaFin, fechaInicioRet2Meses: fechaInicio }),
      this.getGerenciaVentasAsistencialMSSISOL({ fechaInicio, fechaFin, fechaInicioRet2Meses: fechaInicio }),
      
      // Ocupacional
      this.getGerenciaVentasOcupacionalMS({ fechaInicio, fechaFin, fechaInicioRet2Meses: fechaInicio }),
      
      // MTC
      this.getGerenciaVentasMTCMS({ fechaInicio, fechaFin, fechaInicioRet2Meses: fechaInicio }),
      
      // Farmacia
      this.getGerenciaVentasFarmaciaMS({ fechaInicio, fechaFin, fechaInicioRet2Meses: fechaInicio }),
      
      // San Lorenzo Global
      this.getGerenciaVentasAsistencialMSGLOBAL_ListaVentas({ 
        fechaInicio, 
        fechaFin, 
        fechaInicioRetard: fechaInicio, 
        pacienteDni: '', 
        tipoVenta: undefined, 
        comprobante: '' 
      })
    ];

    try {
      const results = await Promise.all(requests);
      
      return {
        asistencial: results[0]?.objModel || [],
        asistencialSISOL: results[1]?.objModel || [],
        ocupacional: results[2]?.objModel || [],
        mtc: results[3]?.objModel || [],
        farmacia: results[4]?.objModel || [],
        sanLorenzoGlobal: results[5]?.objModel || []
      };
    } catch (error) {
      console.error('Error obteniendo resumen consolidado:', error);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS PARA VALIDACIONES Y UTILIDADES
  // ========================================

  /**
   * Valida que las fechas sean válidas y estén en el formato correcto
   */
  private validateDates(fechaInicio: string, fechaFin: string): boolean {
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Formato de fecha inválido');
    }
    
    if (startDate > endDate) {
      throw new Error('La fecha de inicio no puede ser mayor a la fecha de fin');
    }
    
    return true;
  }

  /**
   * Formatea las fechas para el formato esperado por la API
   */
  private formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Obtiene el rango de fechas del mes actual
   */
  getCurrentMonthRange(): { fechaInicio: string; fechaFin: string } {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      fechaInicio: this.formatDateForAPI(firstDay),
      fechaFin: this.formatDateForAPI(lastDay)
    };
  }

  /**
   * Obtiene el rango de fechas del mes anterior
   */
  getPreviousMonthRange(): { fechaInicio: string; fechaFin: string } {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    
    return {
      fechaInicio: this.formatDateForAPI(firstDay),
      fechaFin: this.formatDateForAPI(lastDay)
    };
  }

  // ========================================
  // MÉTODOS PARA REPORTES AVANZADOS
  // ========================================

  /**
   * Obtiene reporte de ventas por período con filtros avanzados
   */
  async getReporteVentasAvanzado(request: FiltroBusquedaMSRequest & {
    tipoReporte: 'asistencial' | 'ocupacional' | 'mtc' | 'farmacia' | 'global';
    incluirAnuladas?: boolean;
    agruparPor?: 'dia' | 'semana' | 'mes';
  }): Promise<ApiResponse<GerenciaVentasDetalleResponse[]>> {
    const { tipoReporte, incluirAnuladas = false, agruparPor = 'dia', ...baseRequest } = request;
    
    let endpoint = '';
    switch (tipoReporte) {
      case 'asistencial':
        endpoint = incluirAnuladas ? 'GerenciaVentasAsistencialMSSISOL_ENVIO_ANULADOS' : 'GerenciaVentasAsistencialMS';
        break;
      case 'ocupacional':
        endpoint = 'GerenciaVentasOcupacionalMS';
        break;
      case 'mtc':
        endpoint = 'GerenciaVentasMTCMS';
        break;
      case 'farmacia':
        endpoint = 'GerenciaVentasFarmaciaMS';
        break;
      case 'global':
        endpoint = 'GerenciaVentasAsistencialMSGLOBAL_ListaVentas';
        break;
      default:
        throw new Error('Tipo de reporte no válido');
    }

    const response = await this.post<GerenciaVentasDetalleResponse[]>(`${this.baseUrl}/${endpoint}`, {
      ...baseRequest,
      agruparPor,
      incluirAnuladas
    });

    return response;
  }

  /**
   * Obtiene estadísticas resumidas de ventas por período
   */
  async getEstadisticasVentas(fechaInicio: string, fechaFin: string): Promise<{
    totalVentas: number;
    totalIngresos: number;
    totalAnulaciones: number;
    promedioVenta: number;
    ventasPorTipo: Record<string, number>;
  }> {
    try {
      this.validateDates(fechaInicio, fechaFin);
      
      const [asistencial, ocupacional, mtc, farmacia] = await Promise.all([
        this.getGerenciaVentasAsistencialMS({ fechaInicio, fechaFin, fechaInicioRet2Meses: fechaInicio }),
        this.getGerenciaVentasOcupacionalMS({ fechaInicio, fechaFin, fechaInicioRet2Meses: fechaInicio }),
        this.getGerenciaVentasMTCMS({ fechaInicio, fechaFin, fechaInicioRet2Meses: fechaInicio }),
        this.getGerenciaVentasFarmaciaMS({ fechaInicio, fechaFin, fechaInicioRet2Meses: fechaInicio })
      ]);

      const asistencialData = asistencial?.objModel || [];
      const ocupacionalData = ocupacional?.objModel || [];
      const mtcData = mtc?.objModel || [];
      const farmaciaData = farmacia?.objModel || [];

      const totalVentas = asistencialData.length + ocupacionalData.length + mtcData.length + farmaciaData.length;
      
      const totalIngresos = [
        ...asistencialData,
        ...ocupacionalData,
        ...mtcData,
        ...farmaciaData
      ].reduce((sum, venta) => sum + ((venta as { importe?: number }).importe || 0), 0);

      const totalAnulaciones = [
        ...asistencialData,
        ...ocupacionalData,
        ...mtcData,
        ...farmaciaData
      ].filter(venta => (venta as { estado?: string }).estado === 'ANULADO').length;

      const promedioVenta = totalVentas > 0 ? totalIngresos / totalVentas : 0;

      const ventasPorTipo = {
        asistencial: asistencialData.length,
        ocupacional: ocupacionalData.length,
        mtc: mtcData.length,
        farmacia: farmaciaData.length
      };

      return {
        totalVentas,
        totalIngresos,
        totalAnulaciones,
        promedioVenta,
        ventasPorTipo
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de ventas:', error);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS PARA MANEJO DE ERRORES
  // ========================================

  /**
   * Maneja errores específicos de la API de cobranza
   */
  private handleCobranzaError(error: unknown, operation: string): never {
    // Type guard para errores con response
    if (error && typeof error === 'object' && 'response' in error) {
      const responseError = error as { response?: { status?: number } };
      if (responseError.response?.status === 401) {
        throw new Error('No autorizado para acceder a la información de cobranza');
      }
      
      if (responseError.response?.status === 404) {
        throw new Error(`Recurso de cobranza no encontrado: ${operation}`);
      }
      
      if (responseError.response?.status === 500) {
        throw new Error('Error interno del servidor de cobranza');
      }
    }
    
    // Type guard para errores de red
    if (error && typeof error === 'object' && 'code' in error) {
      const networkError = error as { code?: string };
      if (networkError.code === 'NETWORK_ERROR') {
        throw new Error('Error de conexión con el servidor de cobranza');
      }
    }
    
    // Type guard para errores con mensaje
    if (error && typeof error === 'object' && 'message' in error) {
      const messageError = error as { message?: string };
      throw new Error(`Error en operación de cobranza (${operation}): ${messageError.message || 'Error desconocido'}`);
    }
    
    throw new Error(`Error en operación de cobranza (${operation}): Error desconocido`);
  }

  /**
   * Retry automático para operaciones que pueden fallar temporalmente
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Solo reintentar para errores de red o temporales
        let shouldRetry = false;
        
        // Type guard para errores de red
        if (error && typeof error === 'object' && 'code' in error) {
          const networkError = error as { code?: string };
          if (networkError.code === 'NETWORK_ERROR') {
            shouldRetry = true;
          }
        }
        
        // Type guard para errores de servidor
        if (error && typeof error === 'object' && 'response' in error) {
          const serverError = error as { response?: { status?: number } };
          if (serverError.response?.status && serverError.response.status >= 500) {
            shouldRetry = true;
          }
        }
        
        if (shouldRetry) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
          continue;
        }
        
        break;
      }
    }
    
    throw lastError;
  }

  // ========================================
  // MÉTODOS PARA EXPORTACIÓN DE DATOS
  // ========================================

  /**
   * Exporta datos de cobranza a formato CSV
   */
  async exportToCSV(data: Record<string, unknown>[], filename: string = 'cobranza_export.csv'): Promise<void> {
    try {
      if (!data || data.length === 0) {
        throw new Error('No hay datos para exportar');
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exportando a CSV:', error);
      
      // Type guard para errores con mensaje
      let errorMessage = 'Error desconocido en exportación';
      if (error && typeof error === 'object' && 'message' in error) {
        const messageError = error as { message?: string };
        errorMessage = messageError.message || errorMessage;
      }
      
      throw new Error(`Error en exportación: ${errorMessage}`);
    }
  }

  /**
   * Prepara datos para exportación con formato específico
   */
  prepareDataForExport(data: Record<string, unknown>[], tipoExportacion: 'ventas' | 'liquidaciones' | 'indicadores'): Record<string, unknown>[] {
    switch (tipoExportacion) {
      case 'ventas':
        return data.map(item => ({
          'ID Venta': item.idVenta || '',
          'Fecha': item.fecha || '',
          'Paciente': item.paciente || '',
          'Servicio': item.servicio || '',
          'Importe': item.importe || 0,
          'Estado': item.estado || '',
          'Tipo': item.tipoVenta || ''
        }));
      
      case 'liquidaciones':
        return data.map(item => ({
          'ID Liquidación': item.idLiquidacion || '',
          'Empresa': item.empresa || '',
          'Fecha': item.fecha || '',
          'Monto': item.monto || 0,
          'Estado': item.estado || '',
          'Observaciones': item.observaciones || ''
        }));
      
      case 'indicadores':
        return data.map(item => ({
          'Período': item.periodo || '',
          'Indicador': item.indicador || '',
          'Valor': item.valor || 0,
          'Unidad': item.unidad || '',
          'Tendencia': item.tendencia || ''
        }));
      
      default:
        return data;
    }
  }
}

export default CobranzaService;
