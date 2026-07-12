namespace Contabilidad.Models
{
    // ---------- Auth ----------
    public class LoginRequest { public string Username { get; set; } public string Password { get; set; } }
    public class BootstrapRequest { public string Password { get; set; } }
    public class LoginResponse
    {
        public string Token { get; set; }
        public int IdUsuario { get; set; }
        public string Username { get; set; }
        public string Nombre { get; set; }
        public List<string> Roles { get; set; } = new();
    }
    public class UsuarioRow
    {
        public int i_IdUsuario { get; set; }
        public string v_Username { get; set; }
        public string v_NombreCompleto { get; set; }
        public bool b_Activo { get; set; }
        public DateTime? t_UltimoLogin { get; set; }
        public string v_AuthOrigen { get; set; }
        public string v_UsernameLegacy { get; set; }
        public int? i_SystemUserIdLegacy { get; set; }
        public string Roles { get; set; }
    }
    public class UsuarioAuthRow
    {
        public int i_IdUsuario { get; set; }
        public string v_Username { get; set; }
        public string v_PasswordHash { get; set; }
        public string v_NombreCompleto { get; set; }
        public bool b_Activo { get; set; }
        public string v_AuthOrigen { get; set; }
        public string Roles { get; set; }
    }

    // ---------- Login unificado BI (identidad legacy + autorizacion conta) ----------
    /// <summary>Usuario del sistema legacy (objModel de /Auth/Login). Se devuelve intacto al front
    /// para poblar el userData que las pantallas legacy ya usan.</summary>
    public class LegacyUser
    {
        public int i_SystemUserId { get; set; }
        public string v_UserName { get; set; }
        public int i_RoleId { get; set; }
        public string v_PersonId { get; set; }
        public int i_RolVentaId { get; set; }
        public int i_ProfesionId { get; set; }
    }
    public class LoginBiResponse : LoginResponse
    {
        public LegacyUser LegacyUser { get; set; }   // null si el login fue LOCAL (breakglass)
    }
    /// <summary>Fila que resuelve el vinculo activo tras validar credenciales en el legacy.</summary>
    public class LoginBiLookupRow
    {
        public int i_IdUsuario { get; set; }
        public string v_Username { get; set; }
        public string v_NombreCompleto { get; set; }
        public bool b_Activo { get; set; }
        public string v_AuthOrigen { get; set; }
        public string Roles { get; set; }
    }
    public class LegacyUsuarioBusqueda
    {
        public int i_SystemUserId { get; set; }
        public string v_UserName { get; set; }
        public string Nombre { get; set; }
        public bool YaVinculado { get; set; }
    }
    public class VincularRequest
    {
        public int SystemUserId { get; set; }
        public string Username { get; set; }
        public string Nombre { get; set; }
        public string Roles { get; set; }   // CSV
    }
    public class VinculoUpdateRequest
    {
        public int IdUsuario { get; set; }
        public string Roles { get; set; }
        public bool Activo { get; set; }
    }
    public class UsuarioCreateRequest
    {
        public string Username { get; set; }
        public string Password { get; set; }
        public string NombreCompleto { get; set; }
        public string Roles { get; set; }   // CSV: "GERENTE,CONTABILIDAD"
    }
    public class UsuarioUpdateRequest
    {
        public int IdUsuario { get; set; }
        public string NombreCompleto { get; set; }
        public bool Activo { get; set; }
        public string Roles { get; set; }
    }

    // ---------- Catalogos ----------
    public class CentroCostoRow
    {
        public int i_IdCentroCosto { get; set; }
        public int? i_IdPadre { get; set; }
        public string v_Codigo { get; set; }
        public string v_Nombre { get; set; }
        public string v_Descripcion { get; set; }
        public int? i_IdTipoCaja { get; set; }
        public string v_NombreTipoCaja { get; set; }
        public bool b_Activo { get; set; }
    }
    public class CentroCostoCreateRequest
    {
        public int? IdPadre { get; set; }
        public string Codigo { get; set; }
        public string Nombre { get; set; }
        public string Descripcion { get; set; }
        public int? IdTipoCaja { get; set; }
    }
    public class CentroCostoUpdateRequest
    {
        public int IdCentroCosto { get; set; }
        public string Nombre { get; set; }
        public string Descripcion { get; set; }
        public int? IdTipoCaja { get; set; }
        public bool Activo { get; set; }
    }

    public class TipoGastoRow
    {
        public int i_IdTipoGasto { get; set; }
        public int? i_IdPadre { get; set; }
        public string v_Codigo { get; set; }
        public string v_Nombre { get; set; }
        public string v_SeccionFlujo { get; set; }
        public string SeccionPadre { get; set; }
        public bool b_Activo { get; set; }
    }
    public class TipoGastoCreateRequest
    {
        public int? IdPadre { get; set; }
        public string Codigo { get; set; }
        public string Nombre { get; set; }
        public string SeccionFlujo { get; set; }
    }
    public class TipoGastoUpdateRequest
    {
        public int IdTipoGasto { get; set; }
        public string Nombre { get; set; }
        public string SeccionFlujo { get; set; }
        public bool Activo { get; set; }
    }

    public class EntidadRow
    {
        public int i_IdEntidad { get; set; }
        public string v_Nombre { get; set; }
        public string v_Tipo { get; set; }
        public bool b_Activo { get; set; }
    }
    public class EntidadCreateRequest { public string Nombre { get; set; } public string Tipo { get; set; } }
    public class EntidadUpdateRequest { public int IdEntidad { get; set; } public string Nombre { get; set; } public string Tipo { get; set; } public bool Activo { get; set; } }

    public class CuentaBancariaRow
    {
        public int i_IdCuentaBancaria { get; set; }
        public string v_Banco { get; set; }
        public string v_NroCuenta { get; set; }
        public string v_Moneda { get; set; }
        public bool b_Activo { get; set; }
    }
    public class CuentaBancariaCreateRequest { public string Banco { get; set; } public string NroCuenta { get; set; } public string Moneda { get; set; } = "PEN"; }
    public class CuentaBancariaUpdateRequest { public int IdCuentaBancaria { get; set; } public string Banco { get; set; } public string NroCuenta { get; set; } public string Moneda { get; set; } public bool Activo { get; set; } }

    public class SisolParticipacionRow
    {
        public int i_IdParticipacion { get; set; }
        public decimal d_PorcClinica { get; set; }
        public decimal d_PorcHospital { get; set; }
        public DateTime t_VigenciaDesde { get; set; }
        public DateTime? t_VigenciaHasta { get; set; }
    }
    public class SisolParticipacionCreateRequest
    {
        public decimal PorcClinica { get; set; }
        public decimal PorcHospital { get; set; }
        public DateTime VigenciaDesde { get; set; }
    }

    public class ConfigRow { public string v_Clave { get; set; } public string v_Valor { get; set; } public string v_Descripcion { get; set; } }
    public class ConfigUpdateRequest { public string Clave { get; set; } public string Valor { get; set; } }

    // ---------- Egresos ----------
    public class EgresoRow
    {
        public int i_IdEgreso { get; set; }
        public DateTime t_FechaDocumento { get; set; }
        public string v_TipoDocumento { get; set; }
        public string v_SerieNumero { get; set; }
        public string Receptor { get; set; }
        public string CentroCosto { get; set; }
        public int? i_IdTipoCaja { get; set; }
        public string TipoGasto { get; set; }
        public string Seccion { get; set; }
        public string v_Condicion { get; set; }
        public string v_Moneda { get; set; }
        public decimal d_TipoCambio { get; set; }
        public decimal d_MontoBruto { get; set; }
        public decimal d_IGV { get; set; }
        public decimal d_MontoNeto { get; set; }
        public string v_Estado { get; set; }
        public DateTime? t_FechaPago { get; set; }
        public int? i_IdFormaPago { get; set; }
        public string v_Glosa { get; set; }
        public int TotalRows { get; set; }
    }
    public class EgresoCreateRequest
    {
        public int? IdProveedor { get; set; }
        public int? IdEntidad { get; set; }
        public DateTime FechaDocumento { get; set; }
        public string TipoDocumento { get; set; } = "FACTURA";
        public string SerieNumero { get; set; }
        public int IdCentroCosto { get; set; }
        public int IdTipoGasto { get; set; }
        public string Condicion { get; set; } = "CONTADO";
        public string Moneda { get; set; } = "PEN";
        public decimal TipoCambio { get; set; } = 1;
        public decimal MontoBruto { get; set; }
        public decimal IGV { get; set; }
        public string Glosa { get; set; }
        public int? IdCompra { get; set; }
    }
    public class EgresoUpdateRequest : EgresoCreateRequest { public int IdEgreso { get; set; } }
    public class EgresoPagarRequest
    {
        public int IdEgreso { get; set; }
        public DateTime FechaPago { get; set; }
        public int? IdFormaPago { get; set; }
        public int? IdCuentaBancaria { get; set; }
    }
    public class EgresoAnularRequest { public int IdEgreso { get; set; } public string Motivo { get; set; } }

    public class EgresoCargaFila
    {
        public string RucOEntidad { get; set; }
        public DateTime? FechaDocumento { get; set; }
        public string TipoDocumento { get; set; }
        public string SerieNumero { get; set; }
        public string CodCentroCosto { get; set; }
        public string CodTipoGasto { get; set; }
        public string Condicion { get; set; }
        public string Moneda { get; set; }
        public decimal? TipoCambio { get; set; }
        public decimal? MontoBruto { get; set; }
        public decimal? IGV { get; set; }
        public string Glosa { get; set; }
    }
    public class EgresoCargaResultado
    {
        public int Insertadas { get; set; }
        public int ConError { get; set; }
        public List<EgresoCargaError> Errores { get; set; } = new();
    }
    public class EgresoCargaError
    {
        public int fila { get; set; }
        public string v_RucOEntidad { get; set; }
        public string v_CodCentroCosto { get; set; }
        public string v_CodTipoGasto { get; set; }
        public decimal? d_MontoBruto { get; set; }
        public string v_Error { get; set; }
    }

    // ---------- Costos de personal ----------
    public class CostoPersonalRow
    {
        public int i_Id { get; set; }
        public short n_Anio { get; set; }
        public byte n_Mes { get; set; }
        public int i_IdCentroCosto { get; set; }
        public string CentroCosto { get; set; }
        public string v_Concepto { get; set; }
        public decimal d_Monto { get; set; }
        public string v_Estado { get; set; }
        public DateTime? t_FechaPago { get; set; }
    }
    public class CostoPersonalUpsertRequest
    {
        public short Anio { get; set; }
        public byte Mes { get; set; }
        public int IdCentroCosto { get; set; }
        public string Concepto { get; set; }
        public decimal Monto { get; set; }
    }
    public class CostoPersonalPagarRequest
    {
        public short Anio { get; set; }
        public byte Mes { get; set; }
        public int? IdCentroCosto { get; set; }
        public DateTime FechaPago { get; set; }
    }

    // ---------- Motor de caja ----------
    public class CajaIngresoRow
    {
        public int? i_IdTipoCaja { get; set; }
        public string Unidad { get; set; }
        public int? i_IdFormaPago { get; set; }
        public string FormaPago { get; set; }
        public bool EsCobranzaCredito { get; set; }
        public DateTime Dia { get; set; }
        public decimal Monto { get; set; }
    }
    public class CajaEgresoRow
    {
        public string Seccion { get; set; }
        public int? i_IdCentroCosto { get; set; }
        public string CentroCosto { get; set; }
        public DateTime Dia { get; set; }
        public bool EsIngreso { get; set; }
        public decimal Monto { get; set; }
    }
    public class CajaDiaRow
    {
        public DateTime Dia { get; set; }
        public decimal Ingresos { get; set; }
        public decimal Egresos { get; set; }
        public decimal OtrosIngresos { get; set; }
        public decimal FlujoDia { get; set; }
        public decimal SaldoAcumulado { get; set; }
    }
    public class CajaIndicadores
    {
        public decimal PorPagar { get; set; }
        public decimal PorCobrar { get; set; }
        public decimal CreditoFacturado { get; set; }
        public decimal CreditoCobrado { get; set; }
    }
    public class FlujoMesRow
    {
        public byte Mes { get; set; }
        public decimal IngresosOp { get; set; }
        public decimal EgrPersonal { get; set; }
        public decimal EgrAdmin { get; set; }
        public decimal EgrMedico { get; set; }
        public decimal EgrTributos { get; set; }
        public decimal EgrRenta { get; set; }
        public decimal TotalEgresosOp { get; set; }
        public decimal FlujoOperativo { get; set; }
        public decimal Inversion { get; set; }
        public decimal CajaOpInversion { get; set; }
        public decimal Financiamiento { get; set; }
        public decimal CajaOpFinanciamiento { get; set; }
        public decimal OtrosEgresos { get; set; }
        public decimal OtrosIngresos { get; set; }
        public decimal SaldoDeCaja { get; set; }
        public decimal SaldoInicial { get; set; }
        public decimal SaldoFinal { get; set; }
    }
    public class FlujoIngresoUnidadRow
    {
        public byte Mes { get; set; }
        public int? i_IdTipoCaja { get; set; }
        public string Unidad { get; set; }
        public bool EsCredito { get; set; }
        public decimal Monto { get; set; }
    }
    public class FlujoEgresoSeccionRow
    {
        public byte Mes { get; set; }
        public string Seccion { get; set; }
        public decimal Monto { get; set; }
    }
    public class FlujoConsolidadoResponse
    {
        public List<FlujoMesRow> Resumen { get; set; } = new();
        public List<FlujoIngresoUnidadRow> IngresosPorUnidad { get; set; } = new();
        public List<FlujoEgresoSeccionRow> EgresosPorSeccion { get; set; } = new();
    }
    public class CerrarMesRequest { public short Anio { get; set; } public byte Mes { get; set; } }
    public class AperturaRequest
    {
        public short Anio { get; set; }
        public byte Mes { get; set; }
        public decimal SaldoInicial { get; set; }
        public decimal MontoInicialNeto { get; set; }
    }
    public class SaldoBancoRow
    {
        public int? i_Id { get; set; }
        public short n_Anio { get; set; }
        public byte n_Mes { get; set; }
        public int i_IdCuentaBancaria { get; set; }
        public string v_Banco { get; set; }
        public string v_NroCuenta { get; set; }
        public string v_Moneda { get; set; }
        public decimal d_SaldoSoles { get; set; }
        public decimal d_SaldoDolares { get; set; }
    }
    public class SaldoBancoUpsertRequest
    {
        public short Anio { get; set; }
        public byte Mes { get; set; }
        public int IdCuentaBancaria { get; set; }
        public decimal SaldoSoles { get; set; }
        public decimal SaldoDolares { get; set; }
    }

    // ---------- Rentabilidad ----------
    public class RentabilidadIngresoRow
    {
        public int? i_IdTipoCaja { get; set; }
        public string Unidad { get; set; }
        public decimal BrutoConIGV { get; set; }
        public decimal IGV { get; set; }
        public decimal NetoSinIGV { get; set; }
        public decimal PorcClinica { get; set; }
        public decimal NetoRentabilidad { get; set; }
        public decimal ParticipacionHospital { get; set; }
    }
    public class RentabilidadGastoRow
    {
        public int? i_IdTipoCaja { get; set; }
        public string Unidad { get; set; }
        public int? i_IdCentroCosto { get; set; }
        public string CentroCosto { get; set; }
        public decimal Gasto { get; set; }
    }
    public class RentabilidadGeneralRow
    {
        public decimal Ingresos { get; set; }
        public decimal Gastos { get; set; }
        public decimal Resultado { get; set; }
        public decimal MargenPorc { get; set; }
        public string Semaforo { get; set; }
        public decimal RentableMin { get; set; }
        public decimal BajoMin { get; set; }
    }
    public class RentabilidadUnidadRow
    {
        public int? i_IdTipoCaja { get; set; }
        public string Unidad { get; set; }
        public decimal Ingresos { get; set; }
        public decimal Gastos { get; set; }
        public decimal Resultado { get; set; }
        public decimal MargenPorc { get; set; }
        public string Semaforo { get; set; }
        public bool EsTotal { get; set; }
        public bool EsAdministracion { get; set; }
    }
    public class ComparativaMesRow
    {
        public byte Mes { get; set; }
        public decimal Ingresos { get; set; }
        public decimal Gastos { get; set; }
        public decimal Resultado { get; set; }
        public decimal MargenPorc { get; set; }
        public bool TrimestralActiva { get; set; }
        public bool SemestralActiva { get; set; }
    }
    public class ComparativaPeriodoRow
    {
        public byte Trimestre { get; set; }
        public byte Semestre { get; set; }
        public decimal Ingresos { get; set; }
        public decimal Gastos { get; set; }
        public decimal Resultado { get; set; }
    }
    public class ComparativaResponse
    {
        public List<ComparativaMesRow> Mensual { get; set; } = new();
        public List<ComparativaPeriodoRow> Trimestral { get; set; } = new();
        public List<ComparativaPeriodoRow> Semestral { get; set; } = new();
    }

    // ---------- SISOL ----------
    public class SisolLiquidacionRow
    {
        public int i_IdLiquidacion { get; set; }
        public short n_Anio { get; set; }
        public byte n_Mes { get; set; }
        public decimal d_VentaNeta { get; set; }
        public decimal d_PorcClinica { get; set; }
        public decimal d_ParticipacionClinica { get; set; }
        public decimal d_ParticipacionHospital { get; set; }
        public string v_Estado { get; set; }
        public DateTime? t_FechaPago { get; set; }
        public int? i_IdEgresoHospital { get; set; }
    }
    public class SisolEspecialistaRow
    {
        public int i_Id { get; set; }
        public string v_IdMedico { get; set; }
        public string v_NombreMedico { get; set; }
        public decimal d_BaseCalculo { get; set; }
        public decimal d_Porcentaje { get; set; }
        public decimal d_Monto { get; set; }
        public string v_Estado { get; set; }
    }
    public class SisolEspecialistaInput
    {
        public string IdMedico { get; set; }
        public string NombreMedico { get; set; }
        public decimal Porcentaje { get; set; }
    }
    public class SisolCalcularRequest
    {
        public short Anio { get; set; }
        public byte Mes { get; set; }
        public List<SisolEspecialistaInput> Especialistas { get; set; } = new();
    }
    public class SisolPagarRequest
    {
        public int IdLiquidacion { get; set; }
        public DateTime FechaPago { get; set; }
    }
    public class SisolDetalle
    {
        public SisolLiquidacionRow Liquidacion { get; set; }
        public List<SisolEspecialistaRow> Especialistas { get; set; } = new();
    }

    // ---------- Compras (clasificacion contable) ----------
    public class CompraClasificarRequest
    {
        public int IdCentroCosto { get; set; }
        public int IdTipoGasto { get; set; }
    }
    public class CompraClasificacionRow
    {
        public int i_IdCompra { get; set; }
        public int i_IdCentroCosto { get; set; }
        public string CentroCosto { get; set; }
        public int i_IdTipoGasto { get; set; }
        public string TipoGasto { get; set; }
        public int? i_IdEgreso { get; set; }
    }
    public class CompraRow
    {
        public int i_IdCompra { get; set; }
        public string periodo { get; set; }
        public DateTime? fecha_emision { get; set; }
        public string tipo_comprobante { get; set; }
        public string Documento { get; set; }
        public string Proveedor { get; set; }
        public string Ruc { get; set; }
        public decimal base_imponible { get; set; }
        public decimal igv { get; set; }
        public decimal importe_total { get; set; }
        public string codigo_moneda { get; set; }
        public string estado { get; set; }
        public int? i_IdCentroCosto { get; set; }
        public string CentroCosto { get; set; }
        public int? i_IdTipoGasto { get; set; }
        public string TipoGasto { get; set; }
        public int? i_IdEgreso { get; set; }
        public bool Clasificada { get; set; }
    }
}
