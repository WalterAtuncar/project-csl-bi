import { BaseApiService } from './BaseApiService';
import type { ApiResponse } from './BaseApiService';
import type { GerenciaVentasDetalleResponse } from '../@types/facturacion';
import {
  // Request types - Caja Mayor
  CreateCajaMayorRequest,
  UpdateCajaMayorRequest,
  InsertCajaMayorDetalleRequest,
  GetCajaMayorListRequest,
  CerrarCajaMayorRequest,
  DeleteCajaMayorRequest,
  
  // Request types - Ingresos/Egresos
  CreateIngresoMensualRequest,
  UpdateIngresoMensualRequest,
  DeleteIngresoMensualRequest,
  GetIngresoMensualListRequest,
  CreateEgresoMensualRequest,
  UpdateEgresoMensualRequest,
  DeleteEgresoMensualRequest,
  GetEgresoMensualListRequest,
  
  // Request types - Tipos
  CreateTipoCajaRequest,
  UpdateTipoCajaRequest,
  DeleteTipoCajaRequest,
  GetTiposCajaRequest,
  CreateTipoIngresoMensualRequest,
  UpdateTipoIngresoMensualRequest,
  DeleteTipoIngresoMensualRequest,
  GetTiposIngresoMensualRequest,
  CreateTipoEgresoMensualRequest,
  UpdateTipoEgresoMensualRequest,
  DeleteTipoEgresoMensualRequest,
  GetTiposEgresoMensualRequest,
  GetSaldoCajaRequest,
  
  // Response types - Caja Mayor
  CreateCajaMayorResponse,
  CajaMayorListResponse,
  CajaMayorDetalleResponse,
  CerrarCajaMayorResponse,
  DeleteCajaMayorResponse,
  
  // Response types - Ingresos/Egresos
  CreateIngresoMensualResponse,
  UpdateIngresoMensualResponse,
  DeleteIngresoMensualResponse,
  IngresoMensualListResponse,
  CreateEgresoMensualResponse,
  UpdateEgresoMensualResponse,
  DeleteEgresoMensualResponse,
  EgresoMensualListResponse,
  
  // Response types - Tipos
  CreateTipoCajaResponse,
  UpdateTipoCajaResponse,
  DeleteTipoCajaResponse,
  TipoCajaResponse,
  CreateTipoIngresoMensualResponse,
  UpdateTipoIngresoMensualResponse,
  DeleteTipoIngresoMensualResponse,
  TipoIngresoMensualResponse,
  CreateTipoEgresoMensualResponse,
  UpdateTipoEgresoMensualResponse,
  DeleteTipoEgresoMensualResponse,
  TipoEgresoMensualResponse,
  SaldoCajaResponse,
  
  // Utility types
  CajaEstadisticas,
  CajaApiResponse,
  
  // Tipos para cierre de caja
  DatosCierreCajaResponse,
  FiltroBusquedaMSRequest
} from '../@types/caja';

/**
 * Servicio de Caja para gestión de cajas, ingresos, egresos y tipos
 * Maneja todas las operaciones relacionadas con el módulo de caja mayor
 */
class CajaService extends BaseApiService {
  private static instance: CajaService;
  private readonly baseUrl = '/Caja';

  private constructor() {
    super();
  }

  public static getInstance(): CajaService {
    if (!CajaService.instance) {
      CajaService.instance = new CajaService();
    }
    return CajaService.instance;
  }

  // ========================================
  // MÉTODOS PARA CAJA MAYOR
  // ========================================

  /**
   * Crea una nueva caja mayor
   */
  async createCajaMayor(request: CreateCajaMayorRequest): Promise<CajaApiResponse<CreateCajaMayorResponse>> {
    return this.post<CreateCajaMayorResponse>(`${this.baseUrl}/caja-mayor`, request);
  }

  /**
   * Actualiza una caja mayor existente
   */
  async updateCajaMayor(request: UpdateCajaMayorRequest): Promise<CajaApiResponse<CreateCajaMayorResponse>> {
    return this.put<CreateCajaMayorResponse>(`${this.baseUrl}/caja-mayor`, request);
  }

  /**
   * Obtiene lista paginada de cajas mayor con filtros
   */
  async getCajaMayorList(request?: GetCajaMayorListRequest): Promise<CajaApiResponse<CajaMayorListResponse[]>> {
    const params = new URLSearchParams();
    
    if (request?.idTipoCaja) params.append('IdTipoCaja', request.idTipoCaja.toString());
    if (request?.anio) params.append('Anio', request.anio);
    
    // Si mes está vacío o nulo, usar enero (01) por defecto
    const mes = this.normalizeMes(request?.mes);
    params.append('Mes', mes);
    
    if (request?.estadoCierre !== undefined) params.append('EstadoCierre', request.estadoCierre.toString());
    if (request?.pageNumber) params.append('PageNumber', request.pageNumber.toString());
    if (request?.pageSize) params.append('PageSize', request.pageSize.toString());

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/caja-mayor?${queryString}` : `${this.baseUrl}/caja-mayor`;
    
    return this.get<CajaMayorListResponse[]>(url);
  }

  /**
   * Obtiene el detalle completo de una caja mayor incluyendo movimientos
   */
  async getCajaMayorDetalle(idCajaMayor: number): Promise<CajaApiResponse<CajaMayorDetalleResponse>> {
    return this.get<CajaMayorDetalleResponse>(`${this.baseUrl}/caja-mayor/${idCajaMayor}`);
  }

  /**
   * Cierra una caja mayor
   */
  async cerrarCajaMayor(request: CerrarCajaMayorRequest): Promise<CajaApiResponse<CerrarCajaMayorResponse>> {
    return this.patch<CerrarCajaMayorResponse>(`${this.baseUrl}/caja-mayor/cerrar`, request);
  }

  /**
   * Elimina una caja mayor (solo si está abierta)
   */
  async deleteCajaMayor(request: DeleteCajaMayorRequest): Promise<CajaApiResponse<DeleteCajaMayorResponse>> {
    return this.deleteWithBody<DeleteCajaMayorResponse>(`${this.baseUrl}/caja-mayor`, request);
  }

  /**
   * Inserta un detalle individual a una caja mayor existente (Compatible con SQL Server 2012)
   */
  async insertCajaMayorDetalle(request: InsertCajaMayorDetalleRequest): Promise<CajaApiResponse<CreateCajaMayorResponse>> {
    return this.post<CreateCajaMayorResponse>(`${this.baseUrl}/caja-mayor/detalle`, request);
  }

  // ========================================
  // MÉTODOS PARA INGRESOS MENSUALES
  // ========================================

  /**
   * Registra un nuevo ingreso mensual
   */
  async createIngresoMensual(request: CreateIngresoMensualRequest): Promise<CajaApiResponse<CreateIngresoMensualResponse>> {
    return this.post<CreateIngresoMensualResponse>(`${this.baseUrl}/ingresos-mensuales`, request);
  }

  /**
   * Obtiene lista de ingresos mensuales con filtros
   */
  async getIngresoMensualList(request?: GetIngresoMensualListRequest): Promise<CajaApiResponse<IngresoMensualListResponse[]>> {
    const params = new URLSearchParams();
    
    if (request?.idCajaMayor) params.append('IdCajaMayor', request.idCajaMayor.toString());
    if (request?.idTipoIngresoMensual) params.append('IdTipoIngresoMensual', request.idTipoIngresoMensual.toString());
    if (request?.fechaInicio) params.append('FechaInicio', request.fechaInicio);
    if (request?.fechaFin) params.append('FechaFin', request.fechaFin);
    if (request?.estado !== undefined) params.append('Estado', request.estado.toString());
    if (request?.pageNumber) params.append('PageNumber', request.pageNumber.toString());
    if (request?.pageSize) params.append('PageSize', request.pageSize.toString());

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/ingresos-mensuales?${queryString}` : `${this.baseUrl}/ingresos-mensuales`;
    
    return this.get<IngresoMensualListResponse[]>(url);
  }

  /**
   * Actualiza un ingreso mensual existente
   */
  async updateIngresoMensual(request: UpdateIngresoMensualRequest): Promise<CajaApiResponse<UpdateIngresoMensualResponse>> {
    return this.put<UpdateIngresoMensualResponse>(`${this.baseUrl}/ingresos-mensuales`, request);
  }

  /**
   * Elimina (lógicamente) un ingreso mensual
   */
  async deleteIngresoMensual(request: DeleteIngresoMensualRequest): Promise<CajaApiResponse<DeleteIngresoMensualResponse>> {
    return this.deleteWithBody<DeleteIngresoMensualResponse>(`${this.baseUrl}/ingresos-mensuales`, request);
  }

  // ========================================
  // MÉTODOS PARA EGRESOS MENSUALES
  // ========================================

  /**
   * Registra un nuevo egreso mensual
   */
  async createEgresoMensual(request: CreateEgresoMensualRequest): Promise<CajaApiResponse<CreateEgresoMensualResponse>> {
    return this.post<CreateEgresoMensualResponse>(`${this.baseUrl}/egresos-mensuales`, request);
  }

  /**
   * Obtiene lista de egresos mensuales con filtros
   */
  async getEgresoMensualList(request?: GetEgresoMensualListRequest): Promise<CajaApiResponse<EgresoMensualListResponse[]>> {
    const params = new URLSearchParams();
    
    if (request?.idCajaMayor) params.append('IdCajaMayor', request.idCajaMayor.toString());
    if (request?.idTipoEgresoMensual) params.append('IdTipoEgresoMensual', request.idTipoEgresoMensual.toString());
    if (request?.fechaInicio) params.append('FechaInicio', request.fechaInicio);
    if (request?.fechaFin) params.append('FechaFin', request.fechaFin);
    if (request?.estado !== undefined) params.append('Estado', request.estado.toString());
    if (request?.pageNumber) params.append('PageNumber', request.pageNumber.toString());
    if (request?.pageSize) params.append('PageSize', request.pageSize.toString());

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/egresos-mensuales?${queryString}` : `${this.baseUrl}/egresos-mensuales`;
    
    return this.get<EgresoMensualListResponse[]>(url);
  }

  /**
   * Actualiza un egreso mensual existente
   */
  async updateEgresoMensual(request: UpdateEgresoMensualRequest): Promise<CajaApiResponse<UpdateEgresoMensualResponse>> {
    return this.put<UpdateEgresoMensualResponse>(`${this.baseUrl}/egresos-mensuales`, request);
  }

  /**
   * Elimina (lógicamente) un egreso mensual
   */
  async deleteEgresoMensual(request: DeleteEgresoMensualRequest): Promise<CajaApiResponse<DeleteEgresoMensualResponse>> {
    return this.deleteWithBody<DeleteEgresoMensualResponse>(`${this.baseUrl}/egresos-mensuales`, request);
  }

  // ========================================
  // MÉTODOS PARA TIPOS DE CAJA
  // ========================================

  /**
   * Crea un nuevo tipo de caja
   */
  async createTipoCaja(request: CreateTipoCajaRequest): Promise<CajaApiResponse<CreateTipoCajaResponse>> {
    return this.post<CreateTipoCajaResponse>(`${this.baseUrl}/tipos-caja`, request);
  }

  /**
   * Obtiene lista de tipos de caja
   */
  async getTiposCaja(request?: GetTiposCajaRequest): Promise<CajaApiResponse<TipoCajaResponse[]>> {
    const params = new URLSearchParams();
    if (request?.includeInactive) params.append('includeInactive', request.includeInactive.toString());
    
    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/tipos-caja?${queryString}` : `${this.baseUrl}/tipos-caja`;
    
    return this.get<TipoCajaResponse[]>(url);
  }

  /**
   * Actualiza un tipo de caja existente
   */
  async updateTipoCaja(request: UpdateTipoCajaRequest): Promise<CajaApiResponse<UpdateTipoCajaResponse>> {
    return this.put<UpdateTipoCajaResponse>(`${this.baseUrl}/tipos-caja`, request);
  }

  /**
   * Elimina (lógicamente) un tipo de caja
   */
  async deleteTipoCaja(request: DeleteTipoCajaRequest): Promise<CajaApiResponse<DeleteTipoCajaResponse>> {
    return this.deleteWithBody<DeleteTipoCajaResponse>(`${this.baseUrl}/tipos-caja`, request);
  }

  // ========================================
  // MÉTODOS PARA TIPOS DE INGRESO MENSUAL
  // ========================================

  /**
   * Crea un nuevo tipo de ingreso mensual
   */
  async createTipoIngresoMensual(request: CreateTipoIngresoMensualRequest): Promise<CajaApiResponse<CreateTipoIngresoMensualResponse>> {
    return this.post<CreateTipoIngresoMensualResponse>(`${this.baseUrl}/tipos-ingreso-mensual`, request);
  }

  /**
   * Obtiene lista de tipos de ingreso mensual
   */
  async getTiposIngresoMensual(request?: GetTiposIngresoMensualRequest): Promise<CajaApiResponse<TipoIngresoMensualResponse[]>> {
    const params = new URLSearchParams();
    if (request?.includeInactive) params.append('includeInactive', request.includeInactive.toString());
    
    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/tipos-ingreso-mensual?${queryString}` : `${this.baseUrl}/tipos-ingreso-mensual`;
    
    return this.get<TipoIngresoMensualResponse[]>(url);
  }

  /**
   * Actualiza un tipo de ingreso mensual existente
   */
  async updateTipoIngresoMensual(request: UpdateTipoIngresoMensualRequest): Promise<CajaApiResponse<UpdateTipoIngresoMensualResponse>> {
    return this.put<UpdateTipoIngresoMensualResponse>(`${this.baseUrl}/tipos-ingreso-mensual`, request);
  }

  /**
   * Elimina (lógicamente) un tipo de ingreso mensual
   */
  async deleteTipoIngresoMensual(request: DeleteTipoIngresoMensualRequest): Promise<CajaApiResponse<DeleteTipoIngresoMensualResponse>> {
    return this.deleteWithBody<DeleteTipoIngresoMensualResponse>(`${this.baseUrl}/tipos-ingreso-mensual`, request);
  }

  // ========================================
  // MÉTODOS PARA TIPOS DE EGRESO MENSUAL
  // ========================================

  /**
   * Crea un nuevo tipo de egreso mensual
   */
  async createTipoEgresoMensual(request: CreateTipoEgresoMensualRequest): Promise<CajaApiResponse<CreateTipoEgresoMensualResponse>> {
    return this.post<CreateTipoEgresoMensualResponse>(`${this.baseUrl}/tipos-egreso-mensual`, request);
  }

  /**
   * Obtiene lista de tipos de egreso mensual
   */
  async getTiposEgresoMensual(request?: GetTiposEgresoMensualRequest): Promise<CajaApiResponse<TipoEgresoMensualResponse[]>> {
    const params = new URLSearchParams();
    if (request?.includeInactive) params.append('includeInactive', request.includeInactive.toString());
    
    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/tipos-egreso-mensual?${queryString}` : `${this.baseUrl}/tipos-egreso-mensual`;
    
    return this.get<TipoEgresoMensualResponse[]>(url);
  }

  /**
   * Actualiza un tipo de egreso mensual existente
   */
  async updateTipoEgresoMensual(request: UpdateTipoEgresoMensualRequest): Promise<CajaApiResponse<UpdateTipoEgresoMensualResponse>> {
    return this.put<UpdateTipoEgresoMensualResponse>(`${this.baseUrl}/tipos-egreso-mensual`, request);
  }

  /**
   * Elimina (lógicamente) un tipo de egreso mensual
   */
  async deleteTipoEgresoMensual(request: DeleteTipoEgresoMensualRequest): Promise<CajaApiResponse<DeleteTipoEgresoMensualResponse>> {
    return this.deleteWithBody<DeleteTipoEgresoMensualResponse>(`${this.baseUrl}/tipos-egreso-mensual`, request);
  }

  // ========================================
  // MÉTODOS PARA SALDO DE CAJA
  // ========================================

  /**
   * Obtiene el saldo actual de caja por tipo
   */
  async getSaldoCaja(request?: GetSaldoCajaRequest): Promise<CajaApiResponse<SaldoCajaResponse[]>> {
    const params = new URLSearchParams();
    if (request?.idTipoCaja) params.append('idTipoCaja', request.idTipoCaja.toString());
    
    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/saldo-caja?${queryString}` : `${this.baseUrl}/saldo-caja`;
    
    return this.get<SaldoCajaResponse[]>(url);
  }

  // ========================================
  // MÉTODOS PARA GENERAR CIERRE DE CAJA
  // ========================================

  /**
   * Genera las fechas de inicio y fin para un mes específico
   */
  private generateDateRangeForMonth(anio: string, mes: string): { fechaInicio: string; fechaFin: string } {
    const year = parseInt(anio);
    const month = parseInt(mes) - 1; // JavaScript months are 0-indexed
    
    // Primer día del mes a las 00:00:01
    const fechaInicio = new Date(year, month, 1, 0, 0, 1);
    
    // Último día del mes: obtener el último día y establecer 23:59:59
    const lastDay = new Date(year, month + 1, 0).getDate(); // Obtiene el último día del mes
    const fechaFin = new Date(year, month, lastDay, 23, 59, 59);
    
    // Formatear manualmente para evitar problemas de zona horaria
    const formatearFecha = (fecha: Date): string => {
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      const hora = String(fecha.getHours()).padStart(2, '0');
      const minuto = String(fecha.getMinutes()).padStart(2, '0');
      const segundo = String(fecha.getSeconds()).padStart(2, '0');
      
      return `${año}-${mes}-${dia}T${hora}:${minuto}:${segundo}.000Z`;
    };
    
    return {
      fechaInicio: formatearFecha(fechaInicio),
      fechaFin: formatearFecha(fechaFin)
    };
  }

  /**
   * Obtiene los datos para generar un cierre de caja según el tipo de caja
   */
  async getDatosCierreCaja(idTipoCaja: number, anio: string, mes: string): Promise<ApiResponse<GerenciaVentasDetalleResponse[]>> {
    const { fechaInicio, fechaFin } = this.generateDateRangeForMonth(anio, mes);
    
    // Importar CobranzaService dinámicamente para evitar dependencias circulares
    const { default: CobranzaService } = await import('./cobranzaService');
    const cobranzaService = CobranzaService.getInstance();
    
    const filtroBusqueda: FiltroBusquedaMSRequest = {
      fechaInicio,
      fechaFin,
      fechaInicioRet2Meses: fechaInicio
    };

    try {
      // Según el tipo de caja, buscar en diferentes endpoints (IDs reales del backend)
      switch (idTipoCaja) {
        case 1: // ATENCION_ASISTENCIAL -> /api/cobranza/GerenciaVentasAsistencialMS
          return await cobranzaService.getGerenciaVentasAsistencialMS(filtroBusqueda);
          
        case 2: // ATENCION_OCUPACIONAL -> /api/reportesGerencia/GerenciaVentasOcupacionalMS
          return await cobranzaService.getGerenciaVentasOcupacionalMS(filtroBusqueda);
          
        case 3: // SISOL -> /api/cobranza/GerenciaVentasAsistencialMSSISOL
          return await cobranzaService.getGerenciaVentasAsistencialMSSISOL(filtroBusqueda);
          
        case 4: // MTC -> /api/reportesGerencia/GerenciaVentasMTCMS
          return await cobranzaService.getGerenciaVentasMTCMS(filtroBusqueda);
          
        case 5: // SEGUROS -> (sin endpoint definido aún)
          throw new Error('Endpoint para SEGUROS no implementado aún');
          
        case 6: // FARMACIA -> /api/reportesGerencia/GerenciaVentasFarmaciaMS
          return await cobranzaService.getGerenciaVentasFarmaciaMS(filtroBusqueda);
          
        default:
          throw new Error(`Tipo de caja no soportado: ${idTipoCaja}`);
      }
    } catch (error) {
      console.error('Error obteniendo datos para cierre de caja:', error);
      throw error;
    }
  }

  /**
   * Prepara los datos para mostrar en la grid de cierre de caja
   */
  async prepararDatosCierreCaja(idTipoCaja: number, anio: string, mes: string): Promise<DatosCierreCajaResponse> {
    try {
      const { fechaInicio, fechaFin } = this.generateDateRangeForMonth(anio, mes);
      
      // Obtener los datos según el tipo de caja
      const response = await this.getDatosCierreCaja(idTipoCaja, anio, mes);
      const datos: GerenciaVentasDetalleResponse[] = response?.objModel || [];
      
      // Calcular resumen
      const totalRegistros = datos.length;
      const montoTotal = datos.reduce((total: number, item: GerenciaVentasDetalleResponse) => {
        // Obtener el monto total del registro
        const monto = item.total || 0;
        return total + (typeof monto === 'number' ? monto : parseFloat(monto) || 0);
      }, 0);
      
      return {
        fechaInicio,
        fechaFin,
        datos,
        resumen: {
          totalRegistros,
          montoTotal,
          fechaGeneracion: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error preparando datos para cierre de caja:', error);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS PARA REPORTES Y ESTADÍSTICAS
  // ========================================

  /**
   * Obtiene estadísticas consolidadas de caja por período
   */
  async getEstadisticasCaja(fechaInicio: string, fechaFin: string, idTipoCaja?: number): Promise<CajaEstadisticas> {
    try {
      this.validateDates(fechaInicio, fechaFin);
      
      const [cajasList, ingresosList, egresosList, saldos] = await Promise.all([
        this.getCajaMayorList({ idTipoCaja, pageSize: 1000 }),
        this.getIngresoMensualList({ fechaInicio, fechaFin, pageSize: 1000 }),
        this.getEgresoMensualList({ fechaInicio, fechaFin, pageSize: 1000 }),
        this.getSaldoCaja({ idTipoCaja })
      ]);

      const cajas = cajasList?.objModel || [];
      const ingresos = ingresosList?.objModel || [];
      const egresos = egresosList?.objModel || [];
      const saldosData = saldos?.objModel || [];

      const totalCajas = cajas.length;
      const totalIngresos = ingresos.reduce((sum, ingreso) => sum + ingreso.montoIngreso, 0);
      const totalEgresos = egresos.reduce((sum, egreso) => sum + egreso.montoEgreso, 0);
      const saldoTotal = saldosData.reduce((sum, saldo) => sum + saldo.saldoActual, 0);
      const promedioMensual = totalCajas > 0 ? (totalIngresos - totalEgresos) / totalCajas : 0;

      const cajasPorEstado = cajas.reduce((acc, caja) => {
        acc[caja.estadoCierreDescripcion] = (acc[caja.estadoCierreDescripcion] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalCajas,
        totalIngresos,
        totalEgresos,
        saldoTotal,
        promedioMensual,
        cajasPorEstado
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de caja:', error);
      throw error;
    }
  }

  /**
   * Obtiene resumen consolidado de una caja mayor específica
   */
  async getResumenCajaMayor(idCajaMayor: number): Promise<{
    caja: CajaMayorDetalleResponse;
    ingresos: IngresoMensualListResponse[];
    egresos: EgresoMensualListResponse[];
    saldoActual: SaldoCajaResponse[];
  }> {
    try {
      const [detalle, ingresos, egresos, saldo] = await Promise.all([
        this.getCajaMayorDetalle(idCajaMayor),
        this.getIngresoMensualList({ idCajaMayor, pageSize: 1000 }),
        this.getEgresoMensualList({ idCajaMayor, pageSize: 1000 }),
        this.getSaldoCaja()
      ]);

      return {
        caja: detalle?.objModel as CajaMayorDetalleResponse,
        ingresos: ingresos?.objModel || [],
        egresos: egresos?.objModel || [],
        saldoActual: saldo?.objModel || []
      };
    } catch (error) {
      console.error('Error obteniendo resumen de caja mayor:', error);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS PARA VALIDACIONES Y UTILIDADES
  // ========================================

  /**
   * Normaliza el mes para asegurar que siempre tenga un valor válido con 2 dígitos
   * Si es null, undefined o vacío, retorna "01" (enero)
   */
  private normalizeMes(mes?: string): string {
    if (!mes || mes.trim() === '') {
      return '01';
    }
    
    // Asegurar que el mes siempre tenga 2 dígitos
    const mesNumero = parseInt(mes, 10);
    return mesNumero.toString().padStart(2, '0');
  }

  /**
   * Obtiene información sobre el tipo de caja basado en su ID
   */
  getTipoCajaInfo(idTipoCaja: number): { nombre: string; descripcion: string } {
    const tiposCaja = {
      1: { nombre: 'ATENCION_ASISTENCIAL', descripcion: 'Caja para atención asistencial' },
      2: { nombre: 'ATENCION_OCUPACIONAL', descripcion: 'Caja para atención ocupacional' },
      3: { nombre: 'SISOL', descripcion: 'Caja SISOL' },
      4: { nombre: 'MTC', descripcion: 'Caja MTC' },
      5: { nombre: 'SEGUROS', descripcion: 'Caja Seguros' },
      6: { nombre: 'FARMACIA', descripcion: 'Caja Farmacia' }
    };
    
    return tiposCaja[idTipoCaja as keyof typeof tiposCaja] || { 
      nombre: 'Desconocido', 
      descripcion: 'Tipo de caja no reconocido' 
    };
  }

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

  /**
   * Genera el período en formato YYYYMM
   */
  generatePeriodo(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    return `${year}${month}`;
  }

  /**
   * Genera datos para crear una nueva caja mayor del mes actual
   */
  generateCajaMayorForCurrentMonth(idTipoCaja: number, usuarioId: number): CreateCajaMayorRequest {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      idTipoCaja,
      periodo: this.generatePeriodo(now),
      mes: (now.getMonth() + 1).toString().padStart(2, '0'),
      anio: now.getFullYear().toString(),
      fechaInicio: this.formatDateForAPI(firstDay),
      fechaFin: this.formatDateForAPI(lastDay),
      saldoInicialMes: 0,
      totalIngresos: 0,
      totalEgresos: 0,
      insertaIdUsuario: usuarioId
    };
  }

  // ========================================
  // MÉTODOS PARA MANEJO DE ERRORES
  // ========================================

  /**
   * Maneja errores específicos de la API de caja
   */
  private handleCajaError(error: unknown, operation: string): never {
    // Type guard para errores con response
    if (error && typeof error === 'object' && 'response' in error) {
      const responseError = error as { response?: { status?: number } };
      if (responseError.response?.status === 401) {
        throw new Error('No autorizado para acceder a la información de caja');
      }
      
      if (responseError.response?.status === 404) {
        throw new Error(`Recurso de caja no encontrado: ${operation}`);
      }
      
      if (responseError.response?.status === 500) {
        throw new Error('Error interno del servidor de caja');
      }
    }
    
    // Type guard para errores de red
    if (error && typeof error === 'object' && 'code' in error) {
      const networkError = error as { code?: string };
      if (networkError.code === 'NETWORK_ERROR') {
        throw new Error('Error de conexión con el servidor de caja');
      }
    }
    
    // Type guard para errores con mensaje
    if (error && typeof error === 'object' && 'message' in error) {
      const messageError = error as { message?: string };
      throw new Error(`Error en operación de caja (${operation}): ${messageError.message || 'Error desconocido'}`);
    }
    
    throw new Error(`Error en operación de caja (${operation}): Error desconocido`);
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
   * Exporta datos de caja a formato CSV
   */
  async exportToCSV(data: Record<string, unknown>[], filename: string = 'caja_export.csv'): Promise<void> {
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
  prepareDataForExport(data: Record<string, unknown>[], tipoExportacion: 'cajas' | 'ingresos' | 'egresos' | 'saldos'): Record<string, unknown>[] {
    switch (tipoExportacion) {
      case 'cajas':
        return data.map(item => ({
          'ID Caja': item.idCajaMayor || '',
          'Período': item.periodo || '',
          'Tipo Caja': item.nombreTipoCaja || '',
          'Fecha Inicio': item.fechaInicio || '',
          'Fecha Fin': item.fechaFin || '',
          'Saldo Inicial': item.saldoInicialMes || 0,
          'Total Ingresos': item.totalIngresos || 0,
          'Total Egresos': item.totalEgresos || 0,
          'Saldo Final': item.saldoFinalMes || 0,
          'Estado': item.estadoCierreDescripcion || ''
        }));
      
      case 'ingresos':
        return data.map(item => ({
          'ID Ingreso': item.idIngresoMensual || '',
          'Período Caja': item.periodoCajaMayor || '',
          'Tipo Ingreso': item.nombreTipoIngreso || '',
          'Concepto': item.conceptoIngreso || '',
          'Fecha': item.fechaIngreso || '',
          'Monto': item.montoIngreso || 0,
          'Origen': item.origen || '',
          'Estado': item.estadoDescripcion || ''
        }));
      
      case 'egresos':
        return data.map(item => ({
          'ID Egreso': item.idEgresoMensual || '',
          'Período Caja': item.periodoCajaMayor || '',
          'Tipo Egreso': item.nombreTipoEgreso || '',
          'Concepto': item.conceptoEgreso || '',
          'Fecha': item.fechaEgreso || '',
          'Monto': item.montoEgreso || 0,
          'Beneficiario': item.beneficiario || '',
          'Estado': item.estadoDescripcion || ''
        }));
      
      case 'saldos':
        return data.map(item => ({
          'ID Saldo': item.idSaldoCaja || '',
          'Tipo Caja': item.nombreTipoCaja || '',
          'Saldo Actual': item.saldoActual || 0,
          'Última Actualización': item.ultimaActualizacion || ''
        }));
      
      default:
        return data;
    }
  }
}

export default CajaService;
