import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ContaLoginResponse, CentroCosto, TipoGasto, Entidad, CuentaBancaria,
  Egreso, EgresoListResponse, EgresoCreate, EgresoUpdate, EgresoPagar,
  EgresoCargaFila, EgresoCargaResultado, CostoPersonal, CostoPersonalUpsert,
  CajaDiaRow, FlujoConsolidado, CerrarMesResultado,
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
  async cajaDiaria(anio: number, mes: number): Promise<CajaDiaRow[]> {
    const { data } = await this.http.get<CajaDiaRow[]>('/caja/diaria', { params: { anio, mes } });
    return data;
  }
  async flujoConsolidado(anio: number): Promise<FlujoConsolidado> {
    const { data } = await this.http.get<FlujoConsolidado>('/caja/flujo-consolidado', { params: { anio } });
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
  async rentabilidadGeneral(anio: number, mes: number): Promise<import('./contaTypes').RentabilidadGeneral> {
    const { data } = await this.http.get('/rentabilidad/general', { params: { anio, mes } });
    return data;
  }
  async rentabilidadPorUnidad(anio: number, mes: number): Promise<import('./contaTypes').RentabilidadUnidadRow[]> {
    const { data } = await this.http.get('/rentabilidad/por-unidad', { params: { anio, mes } });
    return data;
  }
  async rentabilidadGastos(anio: number, mes: number): Promise<import('./contaTypes').RentabilidadGastoRow[]> {
    const { data } = await this.http.get('/rentabilidad/gastos', { params: { anio, mes } });
    return data;
  }
  async rentabilidadComparativa(anio: number): Promise<import('./contaTypes').ComparativaResponse> {
    const { data } = await this.http.get('/rentabilidad/comparativa', { params: { anio } });
    return data;
  }
}

export const contabilidadService = new ContabilidadService();
export default contabilidadService;
