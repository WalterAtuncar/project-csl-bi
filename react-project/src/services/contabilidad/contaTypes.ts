// Tipos del modulo de Contabilidad (API dedicada SanLorenzo.Contabilidad.Services).
// Los nombres coinciden con las columnas/DTOs del backend (JSON sin camelCase).

export interface ContaLoginResponse {
  Token: string;
  IdUsuario: number;
  Username: string;
  Nombre: string;
  Roles: string[];
}

export interface CentroCosto {
  i_IdCentroCosto: number;
  i_IdPadre: number | null;
  v_Codigo: string;
  v_Nombre: string;
  v_Descripcion: string | null;
  i_IdTipoCaja: number | null;
  v_NombreTipoCaja: string | null;
  b_Activo: boolean;
}

export interface TipoGasto {
  i_IdTipoGasto: number;
  i_IdPadre: number | null;
  v_Codigo: string;
  v_Nombre: string;
  v_SeccionFlujo: string | null;
  SeccionPadre: string | null;
  b_Activo: boolean;
}

export interface Entidad {
  i_IdEntidad: number;
  v_Nombre: string;
  v_Tipo: string;
  b_Activo: boolean;
}

export interface CuentaBancaria {
  i_IdCuentaBancaria: number;
  v_Banco: string;
  v_NroCuenta: string;
  v_Moneda: string;
  b_Activo: boolean;
}

export type EstadoEgreso = 'POR_PAGAR' | 'PAGADO' | 'ANULADO';

export interface Egreso {
  i_IdEgreso: number;
  t_FechaDocumento: string;
  v_TipoDocumento: string;
  v_SerieNumero: string | null;
  Receptor: string;
  CentroCosto: string;
  i_IdTipoCaja: number | null;
  TipoGasto: string;
  Seccion: string | null;
  v_Condicion: string;
  v_Moneda: string;
  d_TipoCambio: number;
  d_MontoBruto: number;
  d_IGV: number;
  d_MontoNeto: number;
  v_Estado: EstadoEgreso;
  t_FechaPago: string | null;
  i_IdFormaPago: number | null;
  v_Glosa: string | null;
}

export interface EgresoListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: Egreso[];
}

export interface EgresoCreate {
  IdProveedor?: number | null;
  IdEntidad?: number | null;
  FechaDocumento: string;
  TipoDocumento: string;
  SerieNumero?: string | null;
  IdCentroCosto: number;
  IdTipoGasto: number;
  Condicion: string;
  Moneda: string;
  TipoCambio: number;
  MontoBruto: number;
  IGV: number;
  Glosa?: string | null;
  IdCompra?: number | null;
}

export interface EgresoUpdate extends EgresoCreate {
  IdEgreso: number;
}

export interface EgresoPagar {
  IdEgreso: number;
  FechaPago: string;
  IdFormaPago?: number | null;
  IdCuentaBancaria?: number | null;
}

export interface EgresoCargaFila {
  RucOEntidad: string;
  FechaDocumento: string | null;
  TipoDocumento?: string | null;
  SerieNumero?: string | null;
  CodCentroCosto: string;
  CodTipoGasto: string;
  Condicion?: string | null;
  Moneda?: string | null;
  TipoCambio?: number | null;
  MontoBruto: number | null;
  IGV?: number | null;
  Glosa?: string | null;
}

export interface EgresoCargaError {
  fila: number;
  v_RucOEntidad: string;
  v_CodCentroCosto: string;
  v_CodTipoGasto: string;
  d_MontoBruto: number | null;
  v_Error: string;
}

export interface EgresoCargaResultado {
  Insertadas: number;
  ConError: number;
  Errores: EgresoCargaError[];
}

export interface CostoPersonal {
  i_Id: number;
  n_Anio: number;
  n_Mes: number;
  i_IdCentroCosto: number;
  CentroCosto: string;
  v_Concepto: string;
  d_Monto: number;
  v_Estado: string;
  t_FechaPago: string | null;
}

export interface CostoPersonalUpsert {
  Anio: number;
  Mes: number;
  IdCentroCosto: number;
  Concepto: string;
  Monto: number;
}

export const CONCEPTOS_PERSONAL = [
  'REMUNERACION',
  'GRATIFICACION',
  'CTS',
  'UTILIDADES',
  'BENEFICIOS_SOCIALES',
  'PERSONAL_ADICIONAL',
] as const;

// ---- Motor de caja ----
export interface CajaIngresoRow {
  i_IdTipoCaja: number | null;
  Unidad: string | null;
  i_IdFormaPago: number | null;
  FormaPago: string | null;
  EsCobranzaCredito: boolean;
  Dia: string;
  Monto: number;
}

export interface CajaEgresoRow {
  Seccion: string;
  i_IdCentroCosto: number | null;
  CentroCosto: string | null;
  Dia: string;
  EsIngreso: boolean;
  Monto: number;
}

export interface CajaDiaRow {
  Dia: string;
  Ingresos: number;
  Egresos: number;
  OtrosIngresos: number;
  FlujoDia: number;
  SaldoAcumulado: number;
}

export interface FlujoMesRow {
  Mes: number;
  IngresosOp: number;
  EgrPersonal: number;
  EgrAdmin: number;
  EgrMedico: number;
  EgrTributos: number;
  EgrRenta: number;
  TotalEgresosOp: number;
  FlujoOperativo: number;
  Inversion: number;
  CajaOpInversion: number;
  Financiamiento: number;
  CajaOpFinanciamiento: number;
  OtrosEgresos: number;
  OtrosIngresos: number;
  SaldoDeCaja: number;
  SaldoInicial: number;
  SaldoFinal: number;
}

export interface FlujoIngresoUnidadRow {
  Mes: number;
  i_IdTipoCaja: number | null;
  Unidad: string;
  EsCredito: boolean;
  Monto: number;
}

export interface FlujoEgresoSeccionRow {
  Mes: number;
  Seccion: string;
  Monto: number;
}

export interface FlujoConsolidado {
  Resumen: FlujoMesRow[];
  IngresosPorUnidad: FlujoIngresoUnidadRow[];
  EgresosPorSeccion: FlujoEgresoSeccionRow[];
}

export interface CerrarMesResultado {
  ingresos: number;
  egresos: number;
  otrosIngresos: number;
  saldoFinal: number;
}
