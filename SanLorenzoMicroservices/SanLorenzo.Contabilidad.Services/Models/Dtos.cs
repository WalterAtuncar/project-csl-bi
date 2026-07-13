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

    public class ProveedorDto
    {
        public int i_IdProveedor { get; set; }
        public string Ruc { get; set; }
        public string RazonSocial { get; set; }
    }
    public class ProveedorCreateRequest
    {
        public string Ruc { get; set; }
        public string RazonSocial { get; set; }
        public string Direccion { get; set; }
        public string Email { get; set; }
    }

    // Cuenta bancaria: solo lectura (espejo del catalogo de tesoreria legacy dbo.documento).
    public class CuentaBancariaRow
    {
        public int i_IdCuentaBancaria { get; set; }
        public string v_Banco { get; set; }
        public string v_NroCuenta { get; set; }
        public string v_Moneda { get; set; }
        public bool b_Activo { get; set; }
    }

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
    public class SisolParticipacionUpdateRequest
    {
        public int IdParticipacion { get; set; }
        public decimal PorcClinica { get; set; }
        public decimal PorcHospital { get; set; }
        public DateTime? VigenciaDesde { get; set; }
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
        public string TipoReceptor { get; set; }
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
        public int? i_IdConsultorio { get; set; }   // v3: consultorio logico (403); null en egresos normales
        public string Consultorio { get; set; }      // v3: nombre 403 (join NULL-safe)
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
        public string Estado { get; set; } = "POR_PAGAR";
        public DateTime? FechaPago { get; set; }
        public int? IdFormaPago { get; set; }
        public int? IdCuentaBancaria { get; set; }
        public int? IdConsultorio { get; set; }   // v3: consultorio logico (403); el front de egresos aun no lo usa
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
    public class FormaPagoRow
    {
        public int i_IdFormaPago { get; set; }
        public string FormaPago { get; set; }
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
    // ---------- Flujo de caja DETALLADO (mockups 02/03) ----------
    public class FlujoDetalleIngresoDto
    {
        public int Mes { get; set; }
        public int? i_IdTipoCaja { get; set; }
        public string Unidad { get; set; }
        public int? i_IdFormaPago { get; set; }
        public string FormaPago { get; set; }
        public bool EsCredito { get; set; }
        public decimal Monto { get; set; }
    }
    public class FlujoDetallePersonalDto
    {
        public int Mes { get; set; }
        public string Unidad { get; set; }
        public string Concepto { get; set; }
        public decimal Monto { get; set; }
    }
    public class FlujoDetalleEgresoDto
    {
        public int Mes { get; set; }
        public string Seccion { get; set; }
        public string CodigoHoja { get; set; }
        public string Hoja { get; set; }
        public int? i_IdEntidad { get; set; }
        public string Entidad { get; set; }
        public decimal Monto { get; set; }
    }
    public class FlujoDetalleCatalogoDto
    {
        public string Seccion { get; set; }
        public string CodigoHoja { get; set; }
        public string Hoja { get; set; }
        public int Orden { get; set; }
    }
    public class FlujoDetalladoDto
    {
        public List<FlujoDetalleIngresoDto> Ingresos { get; set; } = new();
        public List<FlujoDetallePersonalDto> Personal { get; set; } = new();
        public List<FlujoDetalleEgresoDto> Egresos { get; set; } = new();
        public List<FlujoDetalleCatalogoDto> Catalogo { get; set; } = new();
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

    // ---------- Cuadre de caja diario (estilo SAMBHS) ----------
    public class CuadreDiaIngresoDto
    {
        public string Documento { get; set; }
        public string Unidad { get; set; }
        public int? i_IdFormaPago { get; set; }
        public string FormaPago { get; set; }
        public bool EsCobranzaCredito { get; set; }
        public decimal Monto { get; set; }
    }
    public class CuadreDiaEgresoDto
    {
        public string Origen { get; set; }
        public string Documento { get; set; }
        public string CentroCosto { get; set; }
        public string Concepto { get; set; }
        public decimal Monto { get; set; }
    }
    public class CuadreDiaDto
    {
        public List<CuadreDiaIngresoDto> Ingresos { get; set; } = new();
        public List<CuadreDiaEgresoDto> Egresos { get; set; } = new();
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
    public class RentabilidadConsultorioRow
    {
        public string Grupo { get; set; }
        public string Consultorio { get; set; }
        public decimal Ingresos { get; set; }
        public decimal PorcDelGrupo { get; set; }
        public bool EsNoClasificado { get; set; }
        public bool EsTotal { get; set; }
        public decimal Egresos { get; set; }     // v2: egresos por consultorio (solo ASISTENCIAL)
        public decimal Resultado { get; set; }    // v2: Ingresos - Egresos
    }
    public class RentabilidadConsultorioDiagRow
    {
        public string Grupo { get; set; }
        public string Motivo { get; set; }
        public string Referencia { get; set; }
        public decimal Monto { get; set; }
    }
    public class RentabilidadConsultorioResponse
    {
        public List<RentabilidadConsultorioRow> Filas { get; set; } = new();
        public List<RentabilidadConsultorioDiagRow> SinClasificar { get; set; } = new();
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

    // ---------- Honorarios medicos ----------
    // Catalogo de consultorios (sp_Honorarios_Consultorios -> systemparameter grupo 403).
    public class ConsultorioHonorarioDto
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public decimal? PorcMedico { get; set; }
    }
    // Medicos por consultorio (sp_Honorarios_Medicos).
    public class MedicoHonorarioDto
    {
        public int MedicoTratanteId { get; set; }
        public string userName { get; set; }
        public string name { get; set; }
        public int? consultorioId { get; set; }
        public string consultorio { get; set; }
        public int i_RoleId { get; set; }
    }
    // Autocomplete de profesionales (sp_Honorarios_BuscarProfesional).
    public class ProfesionalDto
    {
        public int systemUserId { get; set; }
        public string personId { get; set; }
        public string userName { get; set; }
        public string Name { get; set; }
    }
    // Fila del analisis cross-DB (sp_Honorarios_Analisis, RS unico espejo del legacy).
    // El SP devuelve ~70 columnas; aqui solo se mapean las que consume el front (Dapper ignora el resto).
    public class AnalisisHonorarioRow
    {
        public string idVenta { get; set; }
        public string formaPagoName { get; set; }
        public string serie { get; set; }
        public string numero { get; set; }
        public string fechaPago { get; set; }          // string formateado (emision de la venta)
        public decimal? monto { get; set; }
        public decimal? precioServicio { get; set; }
        public decimal? cantidad { get; set; }
        public decimal? montoPagadoReal { get; set; }
        public decimal? total { get; set; }
        public string nombreServicio { get; set; }
        public string v_ComprobantePago { get; set; }
        public string v_ServiceId { get; set; }
        public string docNumberPaciente { get; set; }
        public string apPaternoPaciente { get; set; }
        public string apMaternoPaciente { get; set; }
        public string nombresPaciente { get; set; }
        public int? medicoId { get; set; }
        public string nombreMedico { get; set; }
        public string especialidadMedico { get; set; }
        public string consultorio { get; set; }
        public int? consultorioId { get; set; }
        public string tipoServicio { get; set; }
        public int? edadPaciente { get; set; }
        public decimal? PorcRef { get; set; }
        public int esPagado { get; set; }               // 0/1
    }
    // Fila del grid de pagos (sp_PagoHonorario_List, RS2).
    public class PagoHonorarioListRow
    {
        public int i_IdPago { get; set; }
        public DateTime t_FechaPago { get; set; }
        public string v_MedicoNombre { get; set; }
        public int i_MedicoId { get; set; }
        public DateTime t_PeriodoDesde { get; set; }
        public DateTime t_PeriodoHasta { get; set; }
        public decimal d_TotalPago { get; set; }
        public decimal d_TotalServicios { get; set; }
        public int NroConsultorios { get; set; }
        public int NroServicios { get; set; }
        public string v_Estado { get; set; }
    }
    // Cabecera del pago (sp_PagoHonorario_Get, RS1).
    public class PagoHonorarioCabecera
    {
        public int i_IdPago { get; set; }
        public int i_MedicoId { get; set; }
        public string v_MedicoNombre { get; set; }
        public int? i_IdEntidad { get; set; }
        public string EntidadNombre { get; set; }
        public DateTime t_PeriodoDesde { get; set; }
        public DateTime t_PeriodoHasta { get; set; }
        public decimal? d_PorcMedico { get; set; }
        public decimal d_TotalServicios { get; set; }
        public decimal d_TotalPago { get; set; }
        public string v_Estado { get; set; }
        public DateTime t_FechaPago { get; set; }
        public int? i_IdFormaPago { get; set; }
        public int? i_IdCuentaBancaria { get; set; }
        public string v_Glosa { get; set; }
        public string v_MotivoAnulacion { get; set; }
        public int i_InsertaIdUsuario { get; set; }
        public DateTime t_InsertaFecha { get; set; }
        public int? i_ActualizaIdUsuario { get; set; }
        public DateTime? t_ActualizaFecha { get; set; }
    }
    // Detalle por consultorio (Get RS2 + Insert RS2 -> mismos nombres; en Insert i_Id=0 y EgresoEstado=null).
    public class PagoHonorarioConsultorioRow
    {
        public int i_Id { get; set; }
        public int i_IdPago { get; set; }
        public int i_IdConsultorio { get; set; }
        public string v_ConsultorioNombre { get; set; }
        public decimal d_MontoServicios { get; set; }
        public decimal d_MontoPago { get; set; }
        public int? i_IdEgreso { get; set; }
        public string EgresoEstado { get; set; }
    }
    // Servicio pagado (sp_PagoHonorario_Get, RS3).
    public class PagoHonorarioServicioRow
    {
        public int i_Id { get; set; }
        public int i_IdPago { get; set; }
        public string v_ServiceId { get; set; }
        public int i_IdConsultorio { get; set; }
        public decimal? d_Precio { get; set; }
        public decimal? d_Porc { get; set; }
        public decimal? d_Pagado { get; set; }
        public bool b_Anulado { get; set; }
    }
    // Detalle completo del pago (respuesta de GET pagos/{id}).
    public class PagoHonorarioDetalle
    {
        public PagoHonorarioCabecera Cabecera { get; set; }
        public List<PagoHonorarioConsultorioRow> Consultorios { get; set; } = new();
        public List<PagoHonorarioServicioRow> Servicios { get; set; } = new();
    }
    // Resultado de POST pagos (sp_PagoHonorario_Insert: RS1 id + RS2 consultorios/egresos).
    public class PagoHonorarioCreateResult
    {
        public int i_IdPago { get; set; }
        public List<PagoHonorarioConsultorioRow> Consultorios { get; set; } = new();
    }
    // Servicio de entrada del request de pago (fila de la TVP).
    public class PagoHonorarioServicioInput
    {
        public string ServiceId { get; set; }
        public int IdConsultorio { get; set; }
        public decimal? Precio { get; set; }
        public decimal? Porc { get; set; }
        public decimal? Pagado { get; set; }
    }
    // Request de POST pagos.
    public class PagoHonorarioCreateRequest
    {
        public int MedicoId { get; set; }
        public string MedicoNombre { get; set; }
        public DateTime Desde { get; set; }
        public DateTime Hasta { get; set; }
        public decimal? PorcMedico { get; set; }
        public DateTime FechaPago { get; set; }
        public int? IdFormaPago { get; set; }
        public int? IdCuentaBancaria { get; set; }
        public string Glosa { get; set; }
        public decimal TotalServicios { get; set; }
        public decimal TotalPago { get; set; }
        public List<PagoHonorarioServicioInput> Servicios { get; set; } = new();
    }
    // Request de POST pagos/{id}/anular.
    public class AnularRequest { public string Motivo { get; set; } }
}
