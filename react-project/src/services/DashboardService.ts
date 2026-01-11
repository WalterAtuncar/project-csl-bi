import { BaseApiService, ApiResponse } from './BaseApiService';

// Interfaces basadas en la respuesta real del backend
export interface GeneralDashboardRequest {
  startDate: string;        // formato: "20240101"
  endDate: string;          // formato: "20240731"
  periodType: 'daily' | 'weekly' | 'monthly';
  quickFilter: string;
  rankingCriteria: 'patients' | 'revenue';
  maxRecentTransactions: number;
  maxSpecialtiesRanking: number;
  [key: string]: unknown; // Index signature para compatibilidad
}

// Nuevo interface para Sales Dashboard Request
export interface SalesDashboardRequest {
  startDate: string;        // formato: "20250101"
  endDate: string;          // formato: "20250115"
  topResults: number;
  includePriceRangeAnalysis: boolean;
  includeDailyTrend: boolean;
  [key: string]: unknown; // Index signature para compatibilidad
}

// Interfaces para Sales Dashboard Response
export interface DocumentTypeSales {
  documentType: string;
  documentCode: number;
  totalSales: number;
  totalValueWithoutTax: number;
  totalTax: number;
  totalWithTax: number;
  averageSale: number;
  percentageOfTotal: number;
  formattedTotal: string;
}

export interface MedicalVsPharmacy {
  category: string;
  totalSales: number;
  totalItems: number;
  totalQuantity: number;
  totalValueWithoutTax: number;
  totalTax: number;
  totalWithTax: number;
  averageItemPrice: number;
  percentageOfTotal: number;
  formattedTotal: string;
  color: string;
}

export interface TopPharmacyProduct {
  productId: string;
  productName: string;
  timesSold: number;
  totalQuantity: number;
  totalSales: number;
  averagePrice: number;
  percentageOfPharmacy: number;
  formattedTotal: string;
  rank: number;
}

export interface MedicalAttentionAnalysis {
  attentionType: string;
  totalAttentions: number;
  totalRevenue: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  percentageOfAttentions: number;
  formattedRevenue: string;
}

export interface DailySalesTrend {
  saleDate: string;
  weekDay: string;
  dailySales: number;
  totalSales: number;
  medicalAttentionSales: number;
  pharmacySales: number;
  percentageAttentions: number;
  percentagePharmacy: number;
  formattedDate: string;
  formattedTotal: string;
}

export interface DiscountAnalysis {
  category: string;
  totalItems: number;
  totalDiscounts: number;
  averageDiscount: number;
  itemsWithDiscount: number;
  percentageWithDiscount: number;
  totalWithoutTax: number;
  totalTax: number;
  totalWithTax: number;
  formattedTotalDiscounts: string;
  formattedTotal: string;
}

export interface GeneralSalesStats {
  totalSales: number;
  totalItems: number;
  totalRevenue: number;
  averageSalePerInvoice: number;
  salesWithAttentions: number;
  salesWithPharmacy: number;
  attentionRevenue: number;
  pharmacyRevenue: number;
  percentageRevenueAttentions: number;
  percentageRevenuePharmacy: number;
  percentageSalesWithAttentions: number;
  percentageSalesWithPharmacy: number;
  formattedTotalRevenue: string;
  formattedAttentionRevenue: string;
  formattedPharmacyRevenue: string;
}

export interface RecentSale {
  saleId: string;
  saleDate: string;
  documentType: string;
  totalSale: number;
  itemsCount: number;
  attentionsAmount: number;
  pharmacyAmount: number;
  formattedDate: string;
  formattedTotal: string;
  formattedAttentions: string;
  formattedPharmacy: string;
  hasAttentions: boolean;
  hasPharmacy: boolean;
}

export interface PriceRangeAnalysis {
  category: string;
  priceRange: string;
  itemsCount: number;
  totalSales: number;
  averageSale: number;
  percentageWithinCategory: number;
  formattedTotal: string;
  sortOrder: number;
}

export interface SalesDashboardMetadata {
  lastUpdated: string;
  processingTimeMs: number;
  totalRecordsProcessed: number;
  apiVersion: string;
  config: {
    currency: string;
    currencySymbol: string;
    timeZone: string;
    dateFormat: string;
    language: string;
    medicalAttentionProductId: string;
  };
  generatedBy: string;
}

export interface SalesDateRangeInfo {
  startDate: string;
  endDate: string;
  quickFilter: string | null;
  totalDays: number;
}

export interface SalesDashboardResponse {
  dateRange: SalesDateRangeInfo;
  salesByDocumentType: DocumentTypeSales[];
  medicalVsPharmacy: MedicalVsPharmacy[];
  topPharmacyProducts: TopPharmacyProduct[];
  medicalAttentionsDetail: MedicalAttentionAnalysis[];
  dailySalesTrend: DailySalesTrend[];
  discountAnalysis: DiscountAnalysis[];
  generalStats: GeneralSalesStats;
  recentSales: RecentSale[];
  priceRangeAnalysis: PriceRangeAnalysis[];
  metadata: SalesDashboardMetadata;
}

export interface DateRangeInfo {
  startDate: string;
  endDate: string;
  quickFilter: string;
  totalDays: number;
}

export interface StatItem {
  title: string;
  value: string;
  numericValue: number;
  trend: string;
  trendDirection: 'up' | 'down' | 'neutral';
  trendValue: number;
  trendDescription: string;
}

export interface MainStats {
  patientsAttended: StatItem;
  dailyRevenue: StatItem;
  pendingAppointments: StatItem;
  occupancyRate: StatItem;
}

export interface IncomeDataPoint {
  value: number;
  label: string;
  date: string;
  normalizedHeight: number;
}

export interface IncomeChart {
  periodType: string;
  dataPoints: IncomeDataPoint[];
  maxValue: number;
  minValue: number;
  totalRevenue: number;
  averageRevenue: number;
}

export interface ServiceDistribution {
  name: string;
  percentage: number;
  count: number;
  color: string;
  revenue: number;
}

export interface SpecialtyRanking {
  rank: number;
  name: string;
  patients: number;
  revenue: number;
  formattedRevenue: string;
  patientPercentage: number;
  revenuePercentage: number;
  rankChange: number;
}

export interface RecentTransaction {
  id: string;
  patientName: string;
  service: string;
  amount: number;
  formattedAmount: string;
  status: string;
  statusColor: string;
  date: string;
  formattedDate: string;
  patientId: string;
  doctorId: number;
  doctorName: string;
  paymentMethod: string;
}

export interface DashboardMetadata {
  lastUpdated: string;
  processingTimeMs: number;
  totalRecordsProcessed: number;
  apiVersion: string;
  config: {
    currency: string;
    currencySymbol: string;
    timeZone: string;
    dateFormat: string;
    language: string;
  };
}

export interface GeneralDashboardResponse {
  dateRange: DateRangeInfo;
  mainStats: MainStats;
  incomeChart: IncomeChart;
  servicesDistribution: ServiceDistribution[];
  specialtiesRanking: SpecialtyRanking[];
  recentTransactions: RecentTransaction[];
  metadata: DashboardMetadata;
}

// Nuevo interface para Script Execution Request
export interface ScriptExecutionRequest {
  scriptText: string;
  [key: string]: unknown; // Index signature para compatibilidad
}

// Interface para Script Execution Response
export interface ScriptExecutionResponse {
  status: number;
  description: string;
  objModel: string; // El resultado viene como string JSON
  token: string | null;
  objPaginated: unknown | null;
}

// Interface genérica para resultados de scripts parseados
export interface ParsedScriptResult<T = unknown> {
  data: T[];
  rawResult: string;
}

// Nuevo interface para Financial Dashboard Request
export interface FinancialDashboardRequest {
  startDate: string;           // formato: "2025-04-01T00:37:38.473Z"
  endDate: string;             // formato: "2025-05-31T00:37:38.473Z"
  clienteEsAgente: string;     // formato: "2,8,9" (IDs separados por coma)
  documentoEgreso: number;     // ej: 502
  distribucion: string;        // ej: "mensual"
  [key: string]: unknown;     // Index signature para compatibilidad
}

// Interfaces para Financial Dashboard Response
export interface ResumenComparativo {
  pacientesActual: number;
  ingresosActual: number;
  egresosActual: number;
  pacientesAnterior: number;
  ingresosAnterior: number;
  egresosAnterior: number;
  balanceActual: number;
  balanceAnterior: number;
  diferenciaIngresos: number;
  diferenciaEgresos: number;
  diferenciaPacientes: number;
  diferenciaBalance: number;
  porcentajeCrecimientoIngresos: number;
  porcentajeCrecimientoEgresos: number;
  porcentajeCrecimientoPacientes: number;
}

export interface DatosPorPeriodo {
  anio: number;
  mes: number;
  nombreMes: string;
  ingresosMes: number;
  egresosMes: number;
  balanceMes: number;
  numeroSemana: number | null;
  nombreSemana: string | null;
  ingresosSemana: number | null;
  egresosSemana: number | null;
  balanceSemana: number | null;
  fechaInicio: string;
  fechaFin: string;
  ingresos: number;
  egresos: number;
  balance: number;
  nombre: string;
  esMensual: boolean;
  esSemanal: boolean;
}

export interface DatosPorConsultorio {
  nombreConsultorio: string;
  cantidadVentas: number;
  montoTotal: number;
  promedioVenta: number;
}

export interface ParametrosUtilizados {
  periodoActualInicio: string;
  periodoActualFin: string;
  periodoAnteriorInicio: string;
  periodoAnteriorFin: string;
  clientesIncluidos: string;
  documentoEgresoUtilizado: number;
  tipoDistribucion: string;
  diasEnPeriodo: number;
}

export interface FinancialDashboardResponse {
  resumenComparativo: ResumenComparativo;
  datosPorPeriodo: DatosPorPeriodo[];
  datosPorConsultorio: DatosPorConsultorio[];
  parametrosUtilizados: ParametrosUtilizados;
}

// Filas base del cierre de caja mayor mensual
export interface CajaMayorCierreRow {
  n_Anio: number;
  n_Mes: number;
  d_TotalIngresosTotal: number;
  d_TotalEgresosTotal: number;
  d_SaldoFinalTotal: number;
}

// Nuevo interface para Services Dashboard Request
export interface ServicesDashboardRequest {
  fechaInicio: string;          // formato: "2025-05-01T06:39:34.200Z"
  fechaFin: string;             // formato: "2025-05-07T06:39:34.200Z"
  [key: string]: unknown;      // Index signature para compatibilidad
}

// Interface para un servicio individual en Services Dashboard
export interface ServicesDashboardData {
  servicioId: string;
  medioMarketing: string;
  tipoDocumento: string;
  sexo: string;
  edad: number;
  ubigeoId: string;
  estadoCivil: string;
  fechaServicio: string;
  comprobante: string;
  usuarioRegistro: string;
  medicoTratante: string;
  protocoloNombre: string;
  especialidadMedica: string;
  consultorioNombre: string;
  tipoServicio: string;
  medicoSolicitanteNombre: string;
  especialidadSolicitante: string;
  diagnosticoNombre: string;
  diagnosticoCie10: string;
  estadoDiagnostico: string;
  procedenciaNombre: string;
}

// Interface para Services Dashboard Response
export interface ServicesDashboardResponse {
  status: number;
  description: string;
  objModel: ServicesDashboardData[];
  token: string | null;
  objPaginated: unknown | null;
}

/**
 * Servicio para manejar las operaciones del dashboard
 * Hereda de BaseApiService para obtener todos los métodos HTTP
 */
export class DashboardService extends BaseApiService {
  constructor() {
    super(); // Usar la URL base por defecto
  }

  /**
   * Obtiene los datos del dashboard general
   */
  async getGeneralDashboard(request: GeneralDashboardRequest): Promise<GeneralDashboardResponse> {
    const response = await this.post<GeneralDashboardResponse, GeneralDashboardRequest>(
      '/Dashboard/GeneralDashboard',
      request
    );

    return response.objModel;
  }

  /**
   * Obtiene los datos del dashboard de ventas
   */
  async getSalesDashboard(request: SalesDashboardRequest): Promise<SalesDashboardResponse> {
    const response = await this.post<SalesDashboardResponse, SalesDashboardRequest>(
      '/Dashboard/SalesDashboard',
      request
    );

    return response.objModel;
  }

  /**
   * Obtiene los datos del dashboard financiero
   */
  async getFinancialDashboard(request: FinancialDashboardRequest): Promise<FinancialDashboardResponse> {
    const response = await this.post<FinancialDashboardResponse, FinancialDashboardRequest>(
      '/Dashboard/DashboardFinanciero',
      request
    );

    return response.objModel;
  }

  /**
   * Obtiene los datos del dashboard de servicios
   */
  async getServicesDashboard(request: ServicesDashboardRequest): Promise<ServicesDashboardData[]> {
    const response = await this.post<ServicesDashboardData[], ServicesDashboardRequest>(
      '/Dashboard/DashboardServicios',
      request
    );

    return response.objModel;
  }

  /**
   * Ejecuta un script SQL personalizado y retorna los resultados
   */
  async executeScript(request: ScriptExecutionRequest): Promise<string> {
    const response = await this.post<string, ScriptExecutionRequest>(
      '/Dashboard/EjecutarScript',
      request
    );

    return response.objModel; // Retornamos el objModel que contiene el JSON string
  }

  /**
   * Ejecuta un script SQL y parsea automáticamente el resultado JSON
   * @param scriptText - El script SQL a ejecutar
   * @returns Los datos parseados como array de objetos
   */
  async executeScriptParsed<T = unknown>(scriptText: string): Promise<ParsedScriptResult<T>> {
    const request: ScriptExecutionRequest = { scriptText };
    const jsonResult = await this.executeScript(request);

    try {
      const parsedData = JSON.parse(jsonResult) as T[];
      return {
        data: parsedData,
        rawResult: jsonResult
      };
    } catch (error) {
      throw new Error(`Error parseando resultado del script: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Convierte un período en formato YYYY-MM a entero YYYYMM para comparación
   */
  private periodStringToInt(periodYYYYMM: string): number {
    const [yearStr, monthStr] = periodYYYYMM.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (isNaN(year) || isNaN(month)) {
      throw new Error('Período inválido. Debe ser YYYY-MM');
    }
    return year * 100 + month;
  }

  /**
   * Obtiene cierres mensuales desde cajamayor_cierre para un rango de períodos
   * No usa el endpoint financiero actual; utiliza ejecución de script SQL directa.
   */
  async getCajaMayorCierres(periodFromYYYYMM: string, periodToYYYYMM: string): Promise<CajaMayorCierreRow[]> {
    const fromInt = this.periodStringToInt(periodFromYYYYMM);
    const toInt = this.periodStringToInt(periodToYYYYMM);
    // Script seguro: interpolamos sólo números ya validados
    const script = `
      SELECT 
        n_Anio,
        n_Mes,
        d_TotalIngresosTotal,
        d_TotalEgresosTotal,
        d_SaldoFinalTotal
      FROM cajamayor_cierre WITH (NOLOCK)
      WHERE (n_Anio * 100 + n_Mes) BETWEEN ${fromInt} AND ${toInt}
      ORDER BY n_Anio, n_Mes;
    `;
    const result = await this.executeScriptParsed<CajaMayorCierreRow>(script);
    return result.data;
  }

  /**
   * Método helper para crear una request con valores por defecto
   */
  createDefaultRequest(overrides: Partial<GeneralDashboardRequest> = {}): GeneralDashboardRequest {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return {
      startDate: this.formatDateForAPI(startOfYear),
      endDate: this.formatDateForAPI(now),
      periodType: 'monthly',
      quickFilter: '',
      rankingCriteria: 'patients',
      maxRecentTransactions: 5,
      maxSpecialtiesRanking: 5,
      ...overrides
    };
  }

  /**
   * Método helper para crear una request de Sales Dashboard con valores por defecto
   */
  createDefaultSalesRequest(overrides: Partial<SalesDashboardRequest> = {}): SalesDashboardRequest {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      startDate: this.formatDateForAPI(startOfMonth),
      endDate: this.formatDateForAPI(now),
      topResults: 5,
      includePriceRangeAnalysis: true,
      includeDailyTrend: true,
      ...overrides
    };
  }

  /**
   * Método helper para crear una request de Financial Dashboard con valores por defecto
   */
  createDefaultFinancialRequest(overrides: Partial<FinancialDashboardRequest> = {}): FinancialDashboardRequest {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      startDate: startOfMonth.toISOString(),
      endDate: now.toISOString(),
      clienteEsAgente: "2,8,9",
      documentoEgreso: 502,
      distribucion: "mensual",
      ...overrides
    };
  }

  /**
   * Método helper para crear una request de Services Dashboard con valores por defecto
   */
  createDefaultServicesRequest(overrides: Partial<ServicesDashboardRequest> = {}): ServicesDashboardRequest {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 días atrás

    return {
      fechaInicio: weekAgo.toISOString(),
      fechaFin: now.toISOString(),
      ...overrides
    };
  }

  /**
   * Formatea una fecha para el API (formato: YYYYMMDD)
   */
  private formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Convierte una fecha del formato YYYY-MM-DD al formato del API
   */
  formatDateStringForAPI(dateString: string): string {
    // Evitar problemas de zona horaria creando la fecha directamente desde los componentes
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month - 1 porque los meses en JS van de 0-11
    return this.formatDateForAPI(date);
  }

  /**
   * Convierte una fecha del formato del API (YYYYMMDD) al formato de datepicker (YYYY-MM-DD)
   */
  formatAPIDateToString(apiDateString: string): string {
    if (apiDateString.length !== 8) {
      throw new Error('Formato de fecha API inválido. Debe ser YYYYMMDD');
    }

    const year = apiDateString.substring(0, 4);
    const month = apiDateString.substring(4, 6);
    const day = apiDateString.substring(6, 8);

    return `${year}-${month}-${day}`;
  }

  /**
   * Exporta los datos del dashboard en formato PDF
   */
  async exportDashboardPDF(request: GeneralDashboardRequest): Promise<void> {
    return this.downloadFile('/general/export/pdf', 'dashboard-report.pdf', request);
  }

  /**
   * Exporta los datos del dashboard en formato Excel
   */
  async exportDashboardExcel(request: GeneralDashboardRequest): Promise<void> {
    return this.downloadFile('/general/export/excel', 'dashboard-report.xlsx', request);
  }

  /**
   * Exporta los datos del dashboard de ventas en formato PDF
   */
  async exportSalesDashboardPDF(request: SalesDashboardRequest): Promise<void> {
    return this.downloadFile('/Dashboard/SalesDashboard/export/pdf', 'sales-dashboard-report.pdf', request);
  }

  /**
   * Exporta los datos del dashboard de ventas en formato Excel
   */
  async exportSalesDashboardExcel(request: SalesDashboardRequest): Promise<void> {
    return this.downloadFile('/Dashboard/SalesDashboard/export/excel', 'sales-dashboard-report.xlsx', request);
  }

  /**
   * Exporta los datos del dashboard financiero en formato PDF
   */
  async exportFinancialDashboardPDF(request: FinancialDashboardRequest): Promise<void> {
    return this.downloadFile('/Dashboard/DashboardFinanciero/export/pdf', 'financial-dashboard-report.pdf', request);
  }

  /**
   * Exporta los datos del dashboard financiero en formato Excel
   */
  async exportFinancialDashboardExcel(request: FinancialDashboardRequest): Promise<void> {
    return this.downloadFile('/Dashboard/DashboardFinanciero/export/excel', 'financial-dashboard-report.xlsx', request);
  }

  /**
   * Obtiene datos en tiempo real del dashboard (para actualizaciones automáticas)
   */
  async getDashboardRealTimeData(): Promise<Partial<GeneralDashboardResponse>> {
    const response = await this.get<Partial<GeneralDashboardResponse>>('/general/realtime');
    return response.objModel;
  }

  /**
   * Obtiene estadísticas específicas por rango de fechas
   */
  async getStatsByDateRange(startDate: string, endDate: string): Promise<GeneralDashboardResponse['mainStats']> {
    const response = await this.get<GeneralDashboardResponse['mainStats']>('/stats', {
      startDate,
      endDate,
    });
    return response.objModel;
  }

  /**
   * Obtiene el ranking de especialidades con paginación
   */
  async getSpecialtiesRanking(
    criteria: 'patients' | 'revenue' = 'patients',
    page: number = 1,
    pageSize: number = 10
  ): Promise<{
    data: GeneralDashboardResponse['specialtiesRanking'];
    pagination?: ApiResponse<unknown>['objPaginated'];
  }> {
    const response = await this.get<GeneralDashboardResponse['specialtiesRanking']>('/specialties/ranking', {
      criteria,
      page,
      pageSize,
    });

    return {
      data: response.objModel,
      pagination: response.objPaginated,
    };
  }

  /**
   * Obtiene transacciones recientes con filtros
   */
  async getRecentTransactions(
    limit: number = 10,
    status?: string,
    serviceType?: string
  ): Promise<GeneralDashboardResponse['recentTransactions']> {
    const response = await this.get<GeneralDashboardResponse['recentTransactions']>('/transactions/recent', {
      limit,
      status,
      serviceType,
    });
    return response.objModel;
  }

  /**
   * Obtiene datos del gráfico de ingresos por período específico
   */
  async getIncomeChartData(
    periodType: 'daily' | 'weekly' | 'monthly',
    startDate: string,
    endDate: string
  ): Promise<GeneralDashboardResponse['incomeChart']> {
    const response = await this.get<GeneralDashboardResponse['incomeChart']>('/income/chart', {
      periodType,
      startDate,
      endDate,
    });
    return response.objModel;
  }

  /**
   * Obtiene la distribución de servicios
   */
  async getServicesDistribution(
    startDate: string,
    endDate: string
  ): Promise<GeneralDashboardResponse['servicesDistribution']> {
    const response = await this.get<GeneralDashboardResponse['servicesDistribution']>('/services/distribution', {
      startDate,
      endDate,
    });
    return response.objModel;
  }

  /**
   * Método helper para verificar si la respuesta fue exitosa
   */
  private isSuccessResponse<T>(response: ApiResponse<T>): boolean {
    return response.status === 1;
  }

  /**
   * Método helper para obtener el mensaje de error de una respuesta
   */
  private getErrorMessage<T>(response: ApiResponse<T>): string {
    return response.description || 'Error desconocido';
  }
}

// Crear instancia singleton del servicio
export const dashboardService = new DashboardService();