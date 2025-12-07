import { BaseApiService } from './BaseApiService';
import type {
  CajaApiResponse,
  // Auxiliares
  GetTiposCajaRequest,
  TipoCajaResponse,
  EstadoCierreResponse,
  // Cabecera
  GetListCabeceraRequest,
  CajaMayorCabeceraResponse,
  CierreCreateUpdateRequest,
  GetCabeceraRequest,
  CerrarRequest,
  ConfirmarRequest,
  // Resumen
  ResumenTiposRequest,
  CajaMayorResumenTipoResponse,
  CajaMayorTotalesResponse,
  CajaMayorResumenMensualTipoResponse,
  RecalcularTotalesRequest,
  UpdateSaldoInicialTipoCajaRequest,
  // Movimientos
  GetMovimientosRequest,
  InsertMovimientoManualRequest,
  CajaMayorMovimientoResponse,
  CajaMayorMovimientoDbResponse,
  GenerarEgresosDesdeVentasRequest,
  GenerarIngresosDesdeCobranzasRequest,
  // Verificación y borrado
  CheckCierreExistsRequest,
  CajaMayorCierreExistsResponse,
  DeleteCierreRequest,
  DeleteCajaMayorCierreResponse,
  CategoriaEgresoResponse
} from '../@types/caja';
import type { FlujoCajaConsolidadoRequest, FlujoCajaConsolidadoResponse, FlujoCajaDetalladoResponse } from '../@types/caja';
import { ensureInsertaIdUsuario } from '../utils/auth';

// Servicio de Caja alineado al nuevo backend (solo endpoints auxiliares)
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

  // GET: /api/Caja/caja-mayor/tipos-caja?includeInactive=true|false
  async getTiposCaja(request?: GetTiposCajaRequest): Promise<CajaApiResponse<TipoCajaResponse[]>> {
    const params: Record<string, string> = {};
    if (request?.includeInactive) params.includeInactive = String(request.includeInactive);
    return this.get<TipoCajaResponse[]>(`${this.baseUrl}/caja-mayor/tipos-caja`, params);
  }

  // GET: /api/Caja/caja-mayor-cierre/estados
  async getEstadosCierre(): Promise<CajaApiResponse<EstadoCierreResponse[]>> {
    return this.get<EstadoCierreResponse[]>(`${this.baseUrl}/caja-mayor-cierre/estados`);
  }

  // GET: /api/Caja/caja-mayor/categorias-egreso?groupId=XXX
  async getCategoriasEgreso(groupId: number): Promise<CajaApiResponse<CategoriaEgresoResponse[]>> {
    const params: Record<string, string> = { groupId: String(groupId) };
    return this.get<CategoriaEgresoResponse[]>(`${this.baseUrl}/caja-mayor/categorias-egreso`, params);
  }

  // POST: /api/Caja/caja-mayor/flujos-consolidado
  async flujoCajaConsolidado(body: FlujoCajaConsolidadoRequest): Promise<CajaApiResponse<FlujoCajaConsolidadoResponse[]>> {
    const payload = {
      anio: body.anio,
      idsTipoCaja: body.idsTipoCaja,
      tipoMovimiento: body.tipoMovimiento ?? null,
    };
    return this.post<FlujoCajaConsolidadoResponse[], typeof payload>(`${this.baseUrl}/caja-mayor/flujos-consolidado`, payload);
  }

  // POST: /api/Caja/caja-mayor/flujos-detallado
  async flujoCajaDetallado(body: FlujoCajaConsolidadoRequest): Promise<CajaApiResponse<FlujoCajaDetalladoResponse[]>> {
    const payload = {
      anio: body.anio,
      idsTipoCaja: body.idsTipoCaja,
      tipoMovimiento: body.tipoMovimiento ?? null,
    };
    return this.post<FlujoCajaDetalladoResponse[], typeof payload>(`${this.baseUrl}/caja-mayor/flujos-detallado`, payload);
  }

  // =============================
  // Cabeceras de Cierre Mensual
  // =============================
  // GET: /api/Caja/caja-mayor-cierre?anio=YYYY&mes=MM&estadoCierre?&page?&pageSize?
  async getListCabecera(request: GetListCabeceraRequest): Promise<CajaApiResponse<CajaMayorCabeceraResponse[]>> {
    const params: Record<string, string> = {
      anio: request.anio,
      mes: request.mes,
    };
    if (request.estadoCierre !== undefined) params.estadoCierre = String(request.estadoCierre);
    if (request.page !== undefined) params.page = String(request.page);
    if (request.pageSize !== undefined) params.pageSize = String(request.pageSize);
    return this.get<CajaMayorCabeceraResponse[]>(`${this.baseUrl}/caja-mayor-cierre`, params);
  }

  // GET: /api/Caja/caja-mayor-cierre/rango?periodoDesde=YYYYMM&periodoHasta=YYYYMM&estadoCierre?&page?&pageSize?
  async getListCabeceraPorRango(request: {
    periodoDesde: number;
    periodoHasta: number;
    estadoCierre?: number;
    page?: number;
    pageSize?: number;
  }): Promise<CajaApiResponse<CajaMayorCabeceraResponse[]>> {
    const params: Record<string, string> = {
      periodoDesde: String(request.periodoDesde),
      periodoHasta: String(request.periodoHasta),
    };
    if (request.estadoCierre !== undefined) params.estadoCierre = String(request.estadoCierre);
    if (request.page !== undefined) params.page = String(request.page);
    if (request.pageSize !== undefined) params.pageSize = String(request.pageSize);
    return this.get<CajaMayorCabeceraResponse[]>(`${this.baseUrl}/caja-mayor-cierre/rango`, params);
  }

  // GET: /api/Caja/caja-mayor-cierre/{id}
  async getCabecera(id: number): Promise<CajaApiResponse<CajaMayorCabeceraResponse>> {
    return this.get<CajaMayorCabeceraResponse>(`${this.baseUrl}/caja-mayor-cierre/${id}`);
  }

  // POST: /api/Caja/caja-mayor-cierre
  async cierreCreateUpdate(request: CierreCreateUpdateRequest): Promise<CajaApiResponse<CajaMayorCabeceraResponse>> {
    // Asegurar insertaIdUsuario de forma transversal
    const payload: CierreCreateUpdateRequest = {
      ...request,
      insertaIdUsuario: request.insertaIdUsuario ?? ensureInsertaIdUsuario(),
    };
    return this.post<CajaMayorCabeceraResponse, CierreCreateUpdateRequest>(`${this.baseUrl}/caja-mayor-cierre`, payload);
  }

  // POST: /api/Caja/caja-mayor-cierre/{id}/cerrar
  async cerrar(id: number, body: CerrarRequest): Promise<CajaApiResponse<CajaMayorCabeceraResponse>> {
    const payload: CerrarRequest = {
      idCajaMayorCierre: id,
      actualizaIdUsuario: body.actualizaIdUsuario ?? ensureInsertaIdUsuario(),
    };
    return this.post<CajaMayorCabeceraResponse, CerrarRequest>(`${this.baseUrl}/caja-mayor-cierre/${id}/cerrar`, payload);
  }

  // POST: /api/Caja/caja-mayor-cierre/{id}/confirmar
  async confirmar(id: number, body: ConfirmarRequest): Promise<CajaApiResponse<CajaMayorCabeceraResponse>> {
    const payload: ConfirmarRequest = {
      idCajaMayorCierre: id,
      actualizaIdUsuario: body.actualizaIdUsuario ?? ensureInsertaIdUsuario(),
    };
    return this.post<CajaMayorCabeceraResponse, ConfirmarRequest>(`${this.baseUrl}/caja-mayor-cierre/${id}/confirmar`, payload);
  }

  // =============================
  // Resumen y Totales
  // =============================
  // POST: /api/Caja/caja-mayor-cierre/{id}/resumen-tipos
  async resumenTipos(id: number, body: ResumenTiposRequest): Promise<CajaApiResponse<CajaMayorResumenTipoResponse[]>> {
    const payload: ResumenTiposRequest = {
      idCajaMayorCierre: id,
      actualizaIdUsuario: body.actualizaIdUsuario ?? ensureInsertaIdUsuario(),
    };
    return this.post<CajaMayorResumenTipoResponse[], ResumenTiposRequest>(`${this.baseUrl}/caja-mayor-cierre/${id}/resumen-tipos`, payload);
  }

  // GET: /api/Caja/caja-mayor-cierre/rango/resumen-mensual-por-tipo
  async getResumenMensualPorTipoRango(request: {
    periodoDesde: number;
    periodoHasta: number;
    idTipoCaja?: number;
    estadoCierre?: number;
    page?: number;
    pageSize?: number;
  }): Promise<CajaApiResponse<CajaMayorResumenMensualTipoResponse[]>> {
    const params: Record<string, string> = {
      periodoDesde: String(request.periodoDesde),
      periodoHasta: String(request.periodoHasta),
    };
    if (request.idTipoCaja !== undefined) params.idTipoCaja = String(request.idTipoCaja);
    if (request.estadoCierre !== undefined) params.estadoCierre = String(request.estadoCierre);
    if (request.page !== undefined) params.page = String(request.page);
    if (request.pageSize !== undefined) params.pageSize = String(request.pageSize);
    return this.get<CajaMayorResumenMensualTipoResponse[]>(`${this.baseUrl}/caja-mayor-cierre/rango/resumen-mensual-por-tipo`, params);
  }

  // POST: /api/Caja/caja-mayor-cierre/{id}/recalcular-totales
  async recalcularTotales(id: number, body: RecalcularTotalesRequest): Promise<CajaApiResponse<CajaMayorTotalesResponse>> {
    const payload: RecalcularTotalesRequest = {
      idCajaMayorCierre: id,
      actualizaIdUsuario: body.actualizaIdUsuario ?? ensureInsertaIdUsuario(),
    };
    return this.post<CajaMayorTotalesResponse, RecalcularTotalesRequest>(`${this.baseUrl}/caja-mayor-cierre/${id}/recalcular-totales`, payload);
  }

  // POST: /api/Caja/caja-mayor-cierre/{id}/saldo-inicial
  async updateSaldoInicialTipoCaja(id: number, body: UpdateSaldoInicialTipoCajaRequest): Promise<CajaApiResponse<CajaMayorResumenTipoResponse>> {
    const payload: UpdateSaldoInicialTipoCajaRequest = {
      ...body,
      idCajaMayorCierre: id,
      actualizaIdUsuario: body.actualizaIdUsuario ?? ensureInsertaIdUsuario(),
    };
    return this.post<CajaMayorResumenTipoResponse, UpdateSaldoInicialTipoCajaRequest>(`${this.baseUrl}/caja-mayor-cierre/${id}/saldo-inicial`, payload);
  }

  // =============================
  // Movimientos
  // =============================
  // GET: /api/Caja/caja-mayor-cierre/{id}/movimientos
  async getMovimientos(id: number, request?: Omit<GetMovimientosRequest, 'idCajaMayorCierre'>): Promise<CajaApiResponse<CajaMayorMovimientoResponse[]>> {
    const params: Record<string, string> = {};
    // Siempre enviar también idCajaMayorCierre como query para facilitar diagnóstico en el backend
    params.idCajaMayorCierre = String(id);
    if (request?.idTipoCaja !== undefined) params.idTipoCaja = String(request.idTipoCaja);
    if (request?.tipoMovimiento) params.tipoMovimiento = request.tipoMovimiento;
    if (request?.origen) params.origen = request.origen;
    if (request?.fechaDesde) params.fechaDesde = request.fechaDesde;
    if (request?.fechaHasta) params.fechaHasta = request.fechaHasta;
    if (request?.page !== undefined) params.page = String(request.page);
    if (request?.pageSize !== undefined) params.pageSize = String(request.pageSize);
    if (request?.sinPaginacion !== undefined) params.sinPaginacion = String(request.sinPaginacion);
    return this.get<CajaMayorMovimientoResponse[]>(`${this.baseUrl}/caja-mayor-cierre/${id}/movimientos`, params);
  }

  // POST: /api/Caja/caja-mayor-cierre/{id}/movimientos/manual
  async insertMovimientoManual(id: number, body: Omit<InsertMovimientoManualRequest, 'idCajaMayorCierre'>): Promise<CajaApiResponse<CajaMayorMovimientoDbResponse>> {
    const payload: Omit<InsertMovimientoManualRequest, 'idCajaMayorCierre'> = {
      ...body,
      insertaIdUsuario: body.insertaIdUsuario ?? ensureInsertaIdUsuario(),
    };
    return this.post<CajaMayorMovimientoDbResponse, Omit<InsertMovimientoManualRequest, 'idCajaMayorCierre'>>(
      `${this.baseUrl}/caja-mayor-cierre/${id}/movimientos/manual`,
      payload
    );
  }

  // POST: /api/Caja/caja-mayor-cierre/{id}/generar-egresos-desde-ventas
  async generarEgresosDesdeVentas(id: number, body: Omit<GenerarEgresosDesdeVentasRequest, 'idCajaMayorCierre'>): Promise<CajaApiResponse<CajaMayorMovimientoDbResponse[]>> {
    const payload: Omit<GenerarEgresosDesdeVentasRequest, 'idCajaMayorCierre'> = {
      ...body,
      insertaIdUsuario: body.insertaIdUsuario ?? ensureInsertaIdUsuario(),
    };
    return this.post<CajaMayorMovimientoDbResponse[], Omit<GenerarEgresosDesdeVentasRequest, 'idCajaMayorCierre'>>(
      `${this.baseUrl}/caja-mayor-cierre/${id}/generar-egresos-desde-ventas`,
      payload
    );
  }

  // POST: /api/Caja/caja-mayor-cierre/{id}/generar-ingresos-desde-cobranzas
  async generarIngresosDesdeCobranzas(id: number, body: Omit<GenerarIngresosDesdeCobranzasRequest, 'idCajaMayorCierre'>): Promise<CajaApiResponse<CajaMayorMovimientoDbResponse[]>> {
    const payload: Omit<GenerarIngresosDesdeCobranzasRequest, 'idCajaMayorCierre'> = {
      ...body,
      insertaIdUsuario: body.insertaIdUsuario ?? ensureInsertaIdUsuario(),
    };
    return this.post<CajaMayorMovimientoDbResponse[], Omit<GenerarIngresosDesdeCobranzasRequest, 'idCajaMayorCierre'>>(
      `${this.baseUrl}/caja-mayor-cierre/${id}/generar-ingresos-desde-cobranzas`,
      payload
    );
  }

  // =============================
  // Existencia y Borrado Físico de Cierre
  // =============================
  // GET: /api/Caja/caja-mayor-cierre/exists?anio=YYYY&mes=MM
  async checkCierreExists(request: CheckCierreExistsRequest): Promise<CajaApiResponse<CajaMayorCierreExistsResponse>> {
    const params: Record<string, string> = {
      anio: request.anio,
      mes: request.mes.padStart(2, '0'),
    };
    return this.get<CajaMayorCierreExistsResponse>(`${this.baseUrl}/caja-mayor-cierre/exists`, params);
  }

  // DELETE: /api/Caja/caja-mayor-cierre/{id}
  async deleteCajaMayorCierre(id: number, request?: DeleteCierreRequest): Promise<CajaApiResponse<DeleteCajaMayorCierreResponse>> {
    const payload: DeleteCierreRequest = {
      eliminaIdUsuario: request?.eliminaIdUsuario ?? ensureInsertaIdUsuario(),
    };
    return this.deleteWithBody<DeleteCajaMayorCierreResponse, DeleteCierreRequest>(`${this.baseUrl}/caja-mayor-cierre/${id}`, payload);
  }

  // =============================
  // Proveedores
  // =============================
  // GET: /api/Caja/proveedores/buscar?termino=XXX
  async buscarProveedores(termino: string): Promise<CajaApiResponse<any[]>> {
    const params: Record<string, string> = { termino };
    return this.get<any[]>(`${this.baseUrl}/proveedores/buscar`, params);
  }

  // POST: /api/Caja/proveedores
  async crearProveedor(data: { ruc: string; razonSocial: string; direccion: string; email?: string }): Promise<CajaApiResponse<any>> {
    const payload = {
      ...data,
      insertaIdUsuario: ensureInsertaIdUsuario(),
    };
    return this.post<any, typeof payload>(`${this.baseUrl}/proveedores`, payload);
  }

  // =============================
  // Registro de Compras
  // =============================
  // GET: /api/Caja/caja-mayor/registro-compras
  async listRegistroCompras(paramsIn: {
    periodo?: number;
    fechaInicial?: string;
    fechaFinal?: string;
    tipoComprobante?: string;
    idProveedor?: number;
    idTipoCaja?: number;
    estado?: string | null;
    page?: number;
    pageSize?: number;
  }): Promise<CajaApiResponse<any[]>> {
    const params: Record<string, string> = {};
    if (paramsIn.periodo !== undefined) params.periodo = String(paramsIn.periodo);
    if (paramsIn.fechaInicial) params.fechaInicial = paramsIn.fechaInicial;
    if (paramsIn.fechaFinal) params.fechaFinal = paramsIn.fechaFinal;
    if (paramsIn.tipoComprobante) params.tipoComprobante = paramsIn.tipoComprobante;
    if (paramsIn.idProveedor !== undefined && paramsIn.idProveedor !== null) params.idProveedor = String(paramsIn.idProveedor);
    if (paramsIn.idTipoCaja !== undefined && paramsIn.idTipoCaja !== null) params.idTipoCaja = String(paramsIn.idTipoCaja);
    if (paramsIn.estado !== undefined && paramsIn.estado !== null) params.estado = String(paramsIn.estado);
    params.page = String(paramsIn.page ?? 1);
    params.pageSize = String(paramsIn.pageSize ?? 5);
    return this.get<any[]>(`${this.baseUrl}/caja-mayor/registro-compras`, params);
  }
  // GET: /api/Caja/caja-mayor/registro-compras/{id}
  async getRegistroComprasById(id: number): Promise<CajaApiResponse<any>> {
    return this.get<any>(`${this.baseUrl}/caja-mayor/registro-compras/${id}`);
  }
  // POST: /api/Caja/caja-mayor/registro-compras/{id}/pagar
  async pagarRegistroCompras(id: number, payload: { fechaPago?: string; estado?: string; serie?: string; numero?: string; actualizaIdUsuario?: number }): Promise<CajaApiResponse<any>> {
    const body: { fechaPago?: string; estado?: string; serie?: string; numero?: string; actualizaIdUsuario?: number } = { ...payload };
    return this.post<any, typeof body>(`${this.baseUrl}/caja-mayor/registro-compras/${id}/pagar`, body);
  }
  // POST: /api/Caja/caja-mayor-cierre/{id}/registro-compras
  async insertRegistroCompras(idCajaMayorCierre: number, body: any): Promise<CajaApiResponse<any>> {
    const payload = {
      ...body,
      insertaIdUsuario: ensureInsertaIdUsuario(),
    };
    return this.post<any, typeof payload>(`${this.baseUrl}/caja-mayor-cierre/${idCajaMayorCierre}/registro-compras`, payload);
  }

  async deleteRegistroCompras(id: number, body: { idCajaMayorCierre: number; eliminaIdUsuario?: number }): Promise<CajaApiResponse<any>> {
    const payload = {
      idCajaMayorCierre: body.idCajaMayorCierre,
      eliminaIdUsuario: body.eliminaIdUsuario ?? ensureInsertaIdUsuario(),
    };
    return this.deleteWithBody<any, typeof payload>(`${this.baseUrl}/caja-mayor/registro-compras/${id}`, payload);
  }

  async recalcularIncremental(idCajaMayorCierre: number, body: { defaultIdTipoCaja?: number; preview?: boolean }): Promise<CajaApiResponse<any>> {
    const payload = { defaultIdTipoCaja: body.defaultIdTipoCaja ?? 1, preview: body.preview ?? false };
    return this.post<any, typeof payload>(`${this.baseUrl}/caja-mayor-cierre/${idCajaMayorCierre}/recalcular-incremental`, payload);
  }
}

export default CajaService;
