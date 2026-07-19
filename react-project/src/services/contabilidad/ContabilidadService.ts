import axios, { AxiosInstance, AxiosError } from 'axios';
import { loaderService } from '../LoaderService';
import type {
  ContaLoginResponse, CentroCosto, TipoGasto, Entidad, CuentaBancaria, ProveedorRow, ProveedorCreate,
  Egreso, EgresoListResponse, EgresoCreate, EgresoUpdate, EgresoPagar,
  EgresoCargaFila, EgresoCargaResultado, CostoPersonal, CostoPersonalUpsert,
  CajaDiaRow, FlujoConsolidado, FlujoDetallado, CerrarMesResultado, FormaPagoRow,
  EpiFichaFilters, EpiFichaResponse, EpiFichaExportResponse,
  EpiDashboardFilters, EpiDashboardResponse, EpiCanalFilters, EpiCanalRow,
  DashTipoCaja, DashFiltro, DashGerencialResponse, DashContableResponse,
} from './contaTypes';

// Base URL de la API dedicada de Contabilidad. Configurable por env; dev por defecto.
const CONTA_BASE = (import.meta.env.VITE_CONTA_API as string) || 'http://localhost:5090/api/conta';
const TOKEN_KEY = 'conta_token';

export interface EgresoFilters {
  fdocDesde?: string; fdocHasta?: string;
  fpagoDesde?: string; fpagoHasta?: string;
  estado?: string; idCentroCosto?: number; idTipoGasto?: number; idProveedor?: number;
  page?: number; pageSize?: number;
}

// Config de axios extendida: cualquier request puede desactivar el loader global con
// { skipLoader: true } (p.ej. sondeos silenciosos). Estructural para no importar tipos de axios.
type ContaRequestConfig = { skipLoader?: boolean; method?: string; url?: string };

// Mensaje del loader segun metodo/endpoint (paridad con el interceptor del legacy, BaseApiService).
const mensajeLoader = (method?: string, url?: string): string => {
  const u = (url || '').toLowerCase();
  const m = (method || 'get').toLowerCase();
  if (u.includes('/auth/login')) return 'Iniciando sesión...';
  if (u.includes('/auth/logout')) return 'Cerrando sesión...';
  if (m === 'post') return 'Guardando datos...';
  if (m === 'put' || m === 'patch') return 'Actualizando información...';
  if (m === 'delete') return 'Eliminando registro...';
  return 'Cargando información...';
};

class ContabilidadService {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({ baseURL: CONTA_BASE, timeout: 30000 });

    // Interceptor de request: dispara el loader global (el MISMO del legacy, HeartBeatLoader via
    // loaderService) e inyecta el JWT. El requestCount del loaderService balancea las llamadas
    // concurrentes (p.ej. los Promise.all de las pantallas). Se puede saltar con { skipLoader: true }.
    this.http.interceptors.request.use(
      (config) => {
        if (!(config as ContaRequestConfig).skipLoader) {
          loaderService.show(mensajeLoader(config.method, config.url));
        }
        const token = this.getToken();
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => { loaderService.hide(); return Promise.reject(error); },
    );

    // Interceptor de respuesta: oculta el loader (exito y error); 401 -> limpia sesion; normaliza mensaje.
    this.http.interceptors.response.use(
      (r) => {
        if (!(r.config as ContaRequestConfig).skipLoader) loaderService.hide();
        return r;
      },
      (error: AxiosError) => {
        if (!(error.config as ContaRequestConfig | undefined)?.skipLoader) loaderService.hide();
        if (error.response?.status === 401) {
          this.clearToken();
          window.dispatchEvent(new CustomEvent('conta:logout'));
        }
        const data = error.response?.data as { message?: string } | undefined;
        return Promise.reject(new Error(data?.message || error.message || 'Error de conexion'));
      }
    );
  }

  // ---- Sesion ----
  getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
  setToken(t: string): void { localStorage.setItem(TOKEN_KEY, t); }
  clearToken(): void { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem('conta_user'); }

  async login(username: string, password: string): Promise<ContaLoginResponse> {
    const { data } = await this.http.post<ContaLoginResponse>('/auth/login', { username, password });
    this.setToken(data.Token);
    localStorage.setItem('conta_user', JSON.stringify({ IdUsuario: data.IdUsuario, Username: data.Username, Nombre: data.Nombre, Roles: data.Roles }));
    return data;
  }

  // Login unificado del BI: valida credenciales del sistema legacy y resuelve la sesion conta.
  // Guarda la sesion conta (token + user); el LegacyUser (si viene) lo usa el front para el userData legacy.
  async loginBi(username: string, password: string): Promise<import('./contaTypes').LoginBiResponse> {
    const { data } = await this.http.post<import('./contaTypes').LoginBiResponse>('/auth/login-bi', { Username: username, Password: password });
    this.setToken(data.Token);
    localStorage.setItem('conta_user', JSON.stringify({ IdUsuario: data.IdUsuario, Username: data.Username, Nombre: data.Nombre, Roles: data.Roles }));
    return data;
  }

  async bootstrap(password: string): Promise<void> {
    await this.http.post('/auth/bootstrap', { password });
  }

  // ---- Catalogos (para dropdowns) ----
  async centrosCosto(soloActivos = true): Promise<CentroCosto[]> {
    const { data } = await this.http.get<CentroCosto[]>('/centros-costo', { params: { soloActivos } });
    return data;
  }
  async tiposGasto(soloActivos = true): Promise<TipoGasto[]> {
    const { data } = await this.http.get<TipoGasto[]>('/tipos-gasto', { params: { soloActivos } });
    return data;
  }
  async entidades(soloActivos = true): Promise<Entidad[]> {
    const { data } = await this.http.get<Entidad[]>('/entidades', { params: { soloActivos } });
    return data;
  }
  async cuentasBancarias(soloActivos = true): Promise<CuentaBancaria[]> {
    const { data } = await this.http.get<CuentaBancaria[]>('/cuentas-bancarias', { params: { soloActivos } });
    return data;
  }
  // Catalogo de proveedores (dbo.proveedores) para el toggle receptor del egreso unificado.
  async proveedores(soloActivos = true): Promise<ProveedorRow[]> {
    const { data } = await this.http.get<ProveedorRow[]>('/proveedores', { params: { soloActivos } });
    return data;
  }
  // Alta de proveedor IN-LIVE (POST /proveedores) desde el modal de egreso. Devuelve el ProveedorRow
  // creado (i_IdProveedor/Ruc/RazonSocial) para actualizar el catalogo y auto-seleccionarlo. El
  // interceptor ya inyecta el token y normaliza los 400 de negocio a Error(message).
  async proveedorCrear(r: ProveedorCreate): Promise<ProveedorRow> {
    const { data } = await this.http.post<ProveedorRow>('/proveedores', r);
    return data;
  }

  // ---- Egresos ----
  async egresosList(f: EgresoFilters): Promise<EgresoListResponse> {
    const { data } = await this.http.get<EgresoListResponse>('/egresos', { params: f });
    return data;
  }
  async egresoGet(id: number): Promise<Egreso> {
    const { data } = await this.http.get<Egreso>(`/egresos/${id}`);
    return data;
  }
  async egresoCrear(r: EgresoCreate): Promise<number> {
    // Convencion de eficiencia: el payload default queda IDENTICO al historico -> solo se envian
    // los campos de estado inicial (D3/D4) cuando NO son el default (Estado 'POR_PAGAR' se omite;
    // FechaPago/IdFormaPago/IdCuentaBancaria nulos se omiten). El SP repone sus propios defaults.
    const body: Record<string, unknown> = { ...r };
    if (!r.Estado || r.Estado === 'POR_PAGAR') delete body.Estado;
    if (r.FechaPago == null) delete body.FechaPago;
    if (r.IdFormaPago == null) delete body.IdFormaPago;
    if (r.IdCuentaBancaria == null) delete body.IdCuentaBancaria;
    const { data } = await this.http.post<{ i_IdEgreso: number }>('/egresos', body);
    return data.i_IdEgreso;
  }
  async egresoActualizar(r: EgresoUpdate): Promise<number> {
    const { data } = await this.http.put<{ i_IdEgreso: number }>('/egresos', r);
    return data.i_IdEgreso;
  }
  async egresoPagar(r: EgresoPagar): Promise<void> {
    await this.http.post('/egresos/pagar', r);
  }
  async egresoAnular(idEgreso: number, motivo: string): Promise<void> {
    await this.http.post('/egresos/anular', { IdEgreso: idEgreso, Motivo: motivo });
  }
  async egresoCargaMasiva(filas: EgresoCargaFila[]): Promise<EgresoCargaResultado> {
    const { data } = await this.http.post<EgresoCargaResultado>('/egresos/carga-masiva', filas);
    return data;
  }

  // ---- Costos de personal ----
  async costosPersonalList(anio: number, mes: number): Promise<CostoPersonal[]> {
    const { data } = await this.http.get<CostoPersonal[]>('/costos-personal', { params: { anio, mes } });
    return data;
  }
  async costoPersonalUpsert(r: CostoPersonalUpsert): Promise<void> {
    await this.http.post('/costos-personal', r);
  }
  async costoPersonalPagar(anio: number, mes: number, fechaPago: string, idCentroCosto?: number): Promise<number> {
    const { data } = await this.http.post<{ pagadas: number }>('/costos-personal/pagar', { Anio: anio, Mes: mes, IdCentroCosto: idCentroCosto ?? null, FechaPago: fechaPago });
    return data.pagadas;
  }

  // ---- Motor de caja ----
  async cajaIngresos(desde: string, hasta: string): Promise<import('./contaTypes').CajaIngresoRow[]> {
    const { data } = await this.http.get<import('./contaTypes').CajaIngresoRow[]>('/caja/ingresos', { params: { desde, hasta } });
    return data;
  }
  async cajaEgresos(desde: string, hasta: string): Promise<import('./contaTypes').CajaEgresoRow[]> {
    const { data } = await this.http.get<import('./contaTypes').CajaEgresoRow[]>('/caja/egresos', { params: { desde, hasta } });
    return data;
  }
  // Catalogo de medios de pago con uso reciente (para el filtro de liquidez).
  async cajaFormasPago(): Promise<FormaPagoRow[]> {
    const { data } = await this.http.get<FormaPagoRow[]>('/caja/formas-pago');
    return data;
  }
  // Filtro por medio de pago (D4). Convencion de eficiencia (§5.2): la URL default queda
  // IDENTICA a la actual -> solo se envia formasPago si viene (todos marcados => undefined),
  // y solo se envia incluirCredito cuando esta explicitamente en false (credito ON => undefined).
  async cajaDiaria(anio: number, mes: number, formasPago?: string, incluirCredito?: boolean): Promise<CajaDiaRow[]> {
    const params: Record<string, unknown> = { anio, mes };
    if (formasPago) params.formasPago = formasPago;
    if (incluirCredito === false) params.incluirCredito = false;
    const { data } = await this.http.get<CajaDiaRow[]>('/caja/diaria', { params });
    return data;
  }
  // Cuadre de caja diario de UN dia (estilo SAMBHS). Misma convencion de eficiencia que cajaDiaria:
  // solo se envia formasPago si hay subset seleccionado, solo se envia incluirCredito cuando es false
  // (la URL default queda minima: solo ?fecha=). El filtro aplica server-side a Ingresos; los Egresos
  // vienen SIEMPRE totales (regla D4 de la pantalla).
  async cajaCuadreDia(fecha: string, formasPago?: string, incluirCredito?: boolean): Promise<import('./contaTypes').CuadreDiaResponse> {
    const params: Record<string, unknown> = { fecha };
    if (formasPago) params.formasPago = formasPago;
    if (incluirCredito === false) params.incluirCredito = false;
    const { data } = await this.http.get<import('./contaTypes').CuadreDiaResponse>('/caja/cuadre-dia', { params });
    return data;
  }
  async cajaIndicadores(anio: number, mes: number): Promise<import('./contaTypes').CajaIndicadores> {
    const { data } = await this.http.get('/caja/indicadores', { params: { anio, mes } });
    return data;
  }
  async flujoConsolidado(anio: number, formasPago?: string, incluirCredito?: boolean): Promise<FlujoConsolidado> {
    const params: Record<string, unknown> = { anio };
    if (formasPago) params.formasPago = formasPago;
    if (incluirCredito === false) params.incluirCredito = false;
    const { data } = await this.http.get<FlujoConsolidado>('/caja/flujo-consolidado', { params });
    return data;
  }
  // Detalle del flujo (mockups 02/03): ingresos unidad×forma, personal unidad×concepto,
  // egresos seccion×hoja, + catalogo de hojas. Misma convencion de eficiencia que flujoConsolidado
  // (URL default = ?anio=YYYY; formasPago solo si hay subset; incluirCredito solo cuando es false).
  // La cola (flujo/cajas/saldos) NO viene de aqui: se reusa del Resumen del consolidado (D1).
  async flujoDetallado(anio: number, formasPago?: string, incluirCredito?: boolean): Promise<FlujoDetallado> {
    const params: Record<string, unknown> = { anio };
    if (formasPago) params.formasPago = formasPago;
    if (incluirCredito === false) params.incluirCredito = false;
    const { data } = await this.http.get<FlujoDetallado>('/caja/flujo-detallado', { params });
    return data;
  }
  async cajaCerrarMes(anio: number, mes: number): Promise<CerrarMesResultado> {
    const { data } = await this.http.post<CerrarMesResultado>('/caja/cerrar-mes', { Anio: anio, Mes: mes });
    return data;
  }
  async cajaReabrirMes(anio: number, mes: number): Promise<void> {
    await this.http.post('/caja/reabrir-mes', { Anio: anio, Mes: mes });
  }
  async cajaApertura(anio: number, mes: number, saldoInicial: number, montoInicialNeto: number): Promise<void> {
    await this.http.post('/caja/apertura', { Anio: anio, Mes: mes, SaldoInicial: saldoInicial, MontoInicialNeto: montoInicialNeto });
  }

  // ---- Rentabilidad ----
  // Toggle "incluir ventas a credito" (PLAN_TOGGLE_CREDITO_RENTABILIDAD §5.1). Convencion de
  // eficiencia (T5): la URL default queda IDENTICA a la actual -> solo se envia incluirCredito
  // cuando esta explicitamente en false (credito ON => se omite el param). rentabilidadGastos
  // NO recibe el param (los gastos no tienen dimension de condicion de venta -- T3).
  async rentabilidadGeneral(anio: number, mes: number, incluirCredito?: boolean): Promise<import('./contaTypes').RentabilidadGeneral> {
    const params: Record<string, unknown> = { anio, mes };
    if (incluirCredito === false) params.incluirCredito = false;
    const { data } = await this.http.get('/rentabilidad/general', { params });
    return data;
  }
  async rentabilidadPorUnidad(anio: number, mes: number, incluirCredito?: boolean): Promise<import('./contaTypes').RentabilidadUnidadRow[]> {
    const params: Record<string, unknown> = { anio, mes };
    if (incluirCredito === false) params.incluirCredito = false;
    const { data } = await this.http.get('/rentabilidad/por-unidad', { params });
    return data;
  }
  async rentabilidadGastos(anio: number, mes: number): Promise<import('./contaTypes').RentabilidadGastoRow[]> {
    const { data } = await this.http.get('/rentabilidad/gastos', { params: { anio, mes } });
    return data;
  }
  async rentabilidadComparativa(anio: number, incluirCredito?: boolean): Promise<import('./contaTypes').ComparativaResponse> {
    const params: Record<string, unknown> = { anio };
    if (incluirCredito === false) params.incluirCredito = false;
    const { data } = await this.http.get('/rentabilidad/comparativa', { params });
    return data;
  }
  // Distribucion de ingresos por consultorio (asistencial/ocupacional) — PLAN_RENTABILIDAD_CONSULTORIO §5.2.
  // Misma convencion del toggle: solo se envia incluirCredito cuando esta explicitamente en false.
  async rentabilidadPorConsultorio(anio: number, mes: number, incluirCredito?: boolean): Promise<import('./contaTypes').RentabilidadConsultorioResponse> {
    const params: Record<string, unknown> = { anio, mes };
    if (incluirCredito === false) params.incluirCredito = false;
    const { data } = await this.http.get('/rentabilidad/por-consultorio', { params });
    return data;
  }
  // Rentabilidad ocupacional por empresa cliente — PLAN_RENTABILIDAD_CONSULTORIO_EMPRESA §4.3.
  // Misma convencion del toggle: solo se envia incluirCredito cuando esta explicitamente en false.
  async rentabilidadOcupacionalPorEmpresa(anio: number, mes: number, incluirCredito?: boolean): Promise<import('./contaTypes').RentabilidadOcupacionalEmpresaResponse> {
    const params: Record<string, unknown> = { anio, mes };
    if (incluirCredito === false) params.incluirCredito = false;
    const { data } = await this.http.get('/rentabilidad/ocupacional-por-empresa', { params });
    return data;
  }

  // ---- SISOL ----
  async sisolList(anio: number): Promise<import('./contaTypes').SisolLiquidacion[]> {
    const { data } = await this.http.get('/sisol/liquidaciones', { params: { anio } });
    return data;
  }
  async sisolGet(anio: number, mes: number): Promise<import('./contaTypes').SisolDetalle> {
    const { data } = await this.http.get(`/sisol/liquidaciones/${anio}/${mes}`);
    return data;
  }
  async sisolCalcular(anio: number, mes: number, especialistas: import('./contaTypes').SisolEspecialistaInput[]): Promise<number> {
    const { data } = await this.http.post<{ i_IdLiquidacion: number }>('/sisol/liquidaciones/calcular', { Anio: anio, Mes: mes, Especialistas: especialistas });
    return data.i_IdLiquidacion;
  }
  async sisolPagar(idLiquidacion: number, fechaPago: string): Promise<void> {
    await this.http.post(`/sisol/liquidaciones/${idLiquidacion}/pagar`, { IdLiquidacion: idLiquidacion, FechaPago: fechaPago });
  }

  // ---- Catalogos (write) ----
  async centroCostoCrear(r: import('./contaTypes').CentroCostoCreate) { await this.http.post('/centros-costo', r); }
  async centroCostoActualizar(r: import('./contaTypes').CentroCostoUpdate) { await this.http.put('/centros-costo', r); }
  async tipoGastoCrear(r: import('./contaTypes').TipoGastoCreate) { await this.http.post('/tipos-gasto', r); }
  async tipoGastoActualizar(r: import('./contaTypes').TipoGastoUpdate) { await this.http.put('/tipos-gasto', r); }
  async entidadCrear(r: import('./contaTypes').EntidadCreate) { await this.http.post('/entidades', r); }
  async entidadActualizar(r: import('./contaTypes').EntidadUpdate) { await this.http.put('/entidades', r); }
  async sisolParticipacionList(): Promise<import('./contaTypes').SisolParticipacion[]> { return (await this.http.get('/sisol/participacion')).data; }
  async sisolParticipacionCrear(r: import('./contaTypes').SisolParticipacionCreate) { await this.http.post('/sisol/participacion', r); }
  async sisolParticipacionActualizar(r: import('./contaTypes').SisolParticipacionUpdate) { await this.http.put('/sisol/participacion', r); }
  async configList(): Promise<import('./contaTypes').ConfigRow[]> { return (await this.http.get('/config')).data; }
  async configActualizar(clave: string, valor: string) { await this.http.put('/config', { Clave: clave, Valor: valor }); }

  // ---- Usuarios ----
  async roles(): Promise<import('./contaTypes').Rol[]> { return (await this.http.get('/auth/roles')).data; }
  async usuarios(): Promise<import('./contaTypes').Usuario[]> { return (await this.http.get('/auth/usuarios')).data; }
  async usuarioCrear(r: import('./contaTypes').UsuarioCreate) { await this.http.post('/auth/usuarios', r); }
  async usuarioActualizar(r: import('./contaTypes').UsuarioUpdate) { await this.http.put('/auth/usuarios', r); }
  // Cableado de usuarios del sistema legacy (solo SA)
  async legacyBuscar(filtro: string): Promise<import('./contaTypes').LegacyUsuarioBusqueda[]> {
    return (await this.http.get('/auth/legacy-usuarios', { params: { filtro } })).data;
  }
  async vincular(r: import('./contaTypes').VincularRequest) { await this.http.post('/auth/vincular', r); }
  async vinculoActualizar(r: import('./contaTypes').VinculoUpdateRequest) { await this.http.put('/auth/vincular', r); }

  // ---- Compras ----
  async comprasList(periodo?: string, soloSinClasificar = false): Promise<import('./contaTypes').CompraRow[]> {
    return (await this.http.get('/compras', { params: { periodo, soloSinClasificar } })).data;
  }
  async compraClasificar(idCompra: number, idCentroCosto: number, idTipoGasto: number): Promise<number> {
    const { data } = await this.http.post<{ i_IdEgreso: number }>(`/compras/${idCompra}/clasificar`, { IdCentroCosto: idCentroCosto, IdTipoGasto: idTipoGasto });
    return data.i_IdEgreso;
  }

  // ---- Honorarios médicos (base /honorarios; todo con JWT conta) ----
  // Catálogo de consultorios (systemparameter 403) para el selector del modal.
  async honorariosConsultorios(): Promise<import('./contaTypes').HonorarioConsultorio[]> {
    const { data } = await this.http.get<import('./contaTypes').HonorarioConsultorio[]>('/honorarios/consultorios');
    return data;
  }
  // Médicos por consultorio (omitido = todos).
  async honorariosMedicos(consultorioId?: number): Promise<import('./contaTypes').HonorarioMedico[]> {
    const params: Record<string, unknown> = {};
    if (consultorioId != null && consultorioId > 0) params.consultorioId = consultorioId;
    const { data } = await this.http.get<import('./contaTypes').HonorarioMedico[]>('/honorarios/medicos', { params });
    return data;
  }
  // Autocomplete de profesionales (mín 3 chars — la pantalla ya lo valida; sondeo silencioso).
  async honorariosProfesionales(texto: string): Promise<import('./contaTypes').HonorarioProfesional[]> {
    const { data } = await this.http.get<import('./contaTypes').HonorarioProfesional[]>('/honorarios/profesionales', { params: { texto }, skipLoader: true } as never);
    return data;
  }
  // Análisis de atenciones por consultorio+rango. PESADA (cross-DB); tras la optimización del SP el uso
  // típico (por consultorio) baja a ~2-3s, pero consultorioId=-1 (TODOS) puede rondar ~10s -> timeout largo.
  async honorariosAnalisis(consultorioId: number, desde: string, hasta: string): Promise<import('./contaTypes').AnalisisHonorarioRow[]> {
    const { data } = await this.http.get<import('./contaTypes').AnalisisHonorarioRow[]>('/honorarios/analisis', { params: { consultorioId, desde, hasta }, timeout: 120000 } as never);
    return data;
  }
  // Grid de pagos con paginación real server-side (Total/Page/PageSize).
  async honorariosPagos(f: import('./contaTypes').HonorarioPagosFilters): Promise<import('./contaTypes').HonorarioPagosResponse> {
    const params: Record<string, unknown> = {};
    if (f.desde) params.desde = f.desde;
    if (f.hasta) params.hasta = f.hasta;
    if (f.medicoId != null) params.medicoId = f.medicoId;
    if (f.incluirAnulados) params.incluirAnulados = true;
    params.page = f.page ?? 1;
    params.pageSize = f.pageSize ?? 15;
    const { data } = await this.http.get<import('./contaTypes').HonorarioPagosResponse>('/honorarios/pagos', { params });
    return data;
  }
  async honorariosPagoGet(id: number): Promise<import('./contaTypes').HonorarioPagoDetalle> {
    const { data } = await this.http.get<import('./contaTypes').HonorarioPagoDetalle>(`/honorarios/pagos/${id}`);
    return data;
  }
  // Registro del pago (Roles SA,CONTABILIDAD; IdUsuario del JWT, NO se manda).
  async honorariosPagoCrear(body: import('./contaTypes').HonorarioPagoCreate): Promise<import('./contaTypes').HonorarioPagoCreateResult> {
    const { data } = await this.http.post<import('./contaTypes').HonorarioPagoCreateResult>('/honorarios/pagos', body);
    return data;
  }
  async honorariosPagoAnular(id: number, motivo: string): Promise<{ i_IdPago: number }> {
    const { data } = await this.http.post<{ i_IdPago: number }>(`/honorarios/pagos/${id}/anular`, { Motivo: motivo });
    return data;
  }

  // ---- Reconciliación de caja mayor legacy (poller conta; base /caja) ----
  // TUBERÍA DISTINTA de la Caja Diaria: reconcilia por día los cierres del legacy (dbo.cajamayor_*)
  // que mantiene el BackgroundService del API conta (PLAN_RECONCILIACION_CIERRE_DIARIO — FASE 2).
  // Estado (últimas corridas del log + estados de los últimos días + config del scheduler).
  async reconciliacionEstado(corridas = 25, dias = 35): Promise<import('./contaTypes').ReconEstadoResponse> {
    const { data } = await this.http.get<import('./contaTypes').ReconEstadoResponse>('/caja/reconciliacion/estado', { params: { corridas, dias } });
    return data;
  }
  // Disparo manual [Roles=SA]. El back decide el Modo: si config=Observación la corrida será
  // observación aunque se pida Escritura (nunca se puede forzar Escritura por request). Sin fecha => Tick.
  async reconciliarCaja(body: import('./contaTypes').ReconciliarBody = {}): Promise<import('./contaTypes').ReconciliacionCorridaResponse> {
    const { data } = await this.http.post<import('./contaTypes').ReconciliacionCorridaResponse>('/caja/reconciliar', body);
    return data;
  }

  // ---- Epidemiología (base /epidemiologia; JWT conta; visible a todo usuario autenticado) ----
  // TAB 1: grid paginado (50) con las 25 columnas del formato DIRESA. Muestra el LOADER GLOBAL (overlay,
  // como las demás pages). soloConDx/incluirDescartados se envían solo cuando son true (el SP repone false).
  async epiFicha(f: EpiFichaFilters): Promise<EpiFichaResponse> {
    const params: Record<string, unknown> = { desde: f.desde, hasta: f.hasta };
    if (f.ambito) params.ambito = f.ambito;
    if (f.page) params.page = f.page;
    if (f.pageSize) params.pageSize = f.pageSize;
    if (f.soloConDx) params.soloConDx = true;
    if (f.incluirDescartados) params.incluirDescartados = true;
    if (f.red) params.red = f.red;
    const { data } = await this.http.get<EpiFichaResponse>('/epidemiologia/ficha', { params } as never);
    return data;
  }
  // Export a Excel: mismos filtros sin paginación (cap ~100k en el back). timeout largo (SQL remoto).
  // El API responde 413 si totalFilas>100000; el interceptor lo normaliza a Error(message) ("acota el rango").
  async epiFichaExport(f: EpiFichaFilters): Promise<EpiFichaExportResponse> {
    const params: Record<string, unknown> = { desde: f.desde, hasta: f.hasta };
    if (f.ambito) params.ambito = f.ambito;
    if (f.soloConDx) params.soloConDx = true;
    if (f.incluirDescartados) params.incluirDescartados = true;
    if (f.red) params.red = f.red;
    const { data } = await this.http.get<EpiFichaExportResponse>('/epidemiologia/ficha/export', { params, timeout: 120000 } as never);
    return data;
  }
  // TAB 2: dashboard multi-resultset en un solo fetch. Puede tardar ~15s (SQL remoto) -> loader global
  // (overlay, como las demás pages) + timeout 60s.
  async epiDashboard(f: EpiDashboardFilters): Promise<EpiDashboardResponse> {
    const params: Record<string, unknown> = { desde: f.desde, hasta: f.hasta };
    if (f.ambito) params.ambito = f.ambito;
    if (f.incluirDescartados) params.incluirDescartados = true;
    if (f.topN) params.topN = f.topN;
    const { data } = await this.http.get<EpiDashboardResponse>('/epidemiologia/dashboard', { params, timeout: 60000 } as never);
    return data;
  }
  // TAB 2: canal endémico (lazy, al montar el chart). Banda histórica de los 2 años previos por semana ISO.
  async epiCanalEndemico(f: EpiCanalFilters): Promise<EpiCanalRow[]> {
    const params: Record<string, unknown> = { anio: f.anio };
    if (f.hastaSemana != null) params.hastaSemana = f.hastaSemana;
    if (f.ambito) params.ambito = f.ambito;
    if (f.capitulo != null) params.capitulo = f.capitulo;
    if (f.cie10) params.cie10 = f.cie10;
    const { data } = await this.http.get<EpiCanalRow[]>('/epidemiologia/canal-endemico', { params, timeout: 60000 } as never);
    return data;
  }

  // ---- Dashboard Gerencial + Contable (base /dashboard; JWT conta, cualquier rol lo lee) ----
  // Catálogo de tipos de caja para los checkboxes del filtro (catalog-driven; NO hardcodear los 6).
  async dashTiposCaja(): Promise<DashTipoCaja[]> {
    const { data } = await this.http.get<DashTipoCaja[]>('/dashboard/tipos-caja');
    return data;
  }
  // Multi-resultset del TAB Gerencial en un solo fetch. `tiposCaja` viaja como CSV string (el axios no
  // serializa arrays a .NET); si es vacío/undefined se omite y el SP asume TODOS. Puede tardar unos
  // segundos (SQL remoto, ventana 13m) -> muestra el LOADER GLOBAL (overlay, igual que /caja) + timeout 60s.
  async dashGerencial(f: DashFiltro): Promise<DashGerencialResponse> {
    const params: Record<string, unknown> = { desde: f.desde, hasta: f.hasta };
    if (f.tiposCaja) params.tiposCaja = f.tiposCaja;
    const { data } = await this.http.get<DashGerencialResponse>('/dashboard/gerencial', { params, timeout: 60000 } as never);
    return data;
  }
  // Multi-resultset del TAB Contable. Misma convención que dashGerencial (loader global + timeout 60s).
  async dashContable(f: DashFiltro): Promise<DashContableResponse> {
    const params: Record<string, unknown> = { desde: f.desde, hasta: f.hasta };
    if (f.tiposCaja) params.tiposCaja = f.tiposCaja;
    const { data } = await this.http.get<DashContableResponse>('/dashboard/contable', { params, timeout: 60000 } as never);
    return data;
  }
}

export const contabilidadService = new ContabilidadService();
export default contabilidadService;
