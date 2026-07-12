import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ContaLoginResponse, CentroCosto, TipoGasto, Entidad, CuentaBancaria,
  Egreso, EgresoListResponse, EgresoCreate, EgresoUpdate, EgresoPagar,
  EgresoCargaFila, EgresoCargaResultado, CostoPersonal, CostoPersonalUpsert,
  CajaDiaRow, FlujoConsolidado, CerrarMesResultado, FormaPagoRow,
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

class ContabilidadService {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({ baseURL: CONTA_BASE, timeout: 30000 });

    // Interceptor: inyecta el JWT del modulo de contabilidad.
    this.http.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Interceptor de respuesta: 401 -> limpia sesion; normaliza mensaje de error.
    this.http.interceptors.response.use(
      (r) => r,
      (error: AxiosError) => {
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
    const { data } = await this.http.post<{ i_IdEgreso: number }>('/egresos', r);
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
  async cuentaCrear(r: import('./contaTypes').CuentaBancariaCreate) { await this.http.post('/cuentas-bancarias', r); }
  async cuentaActualizar(r: import('./contaTypes').CuentaBancariaUpdate) { await this.http.put('/cuentas-bancarias', r); }
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
}

export const contabilidadService = new ContabilidadService();
export default contabilidadService;
