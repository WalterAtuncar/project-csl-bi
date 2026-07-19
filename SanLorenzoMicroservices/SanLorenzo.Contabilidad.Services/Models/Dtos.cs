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
        public string UsuarioCajero { get; set; }
    }
    public class CuadreDiaEgresoDto
    {
        public string Origen { get; set; }
        public string Documento { get; set; }
        public string CentroCosto { get; set; }
        public string Concepto { get; set; }
        public decimal Monto { get; set; }
        public int? i_IdTipoCaja { get; set; }
        public string Unidad { get; set; }
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
    public class RentabilidadConsultorioCuadre   // v3: RS3, cuadre con Rentabilidad General (UNA fila)
    {
        public decimal AsistencialNeto { get; set; }
        public decimal SisolNetoPleno { get; set; }
        public decimal SisolPorcClinica { get; set; }
        public decimal SisolParticipacionClinica { get; set; }
        public decimal OcupacionalNeto { get; set; }
        public decimal OtrasUnidadesNeto { get; set; }
        public decimal TotalGeneral { get; set; }
    }
    public class RentabilidadConsultorioResponse
    {
        public List<RentabilidadConsultorioRow> Filas { get; set; } = new();
        public List<RentabilidadConsultorioDiagRow> SinClasificar { get; set; } = new();
        public RentabilidadConsultorioCuadre Cuadre { get; set; }   // v3
    }
    public class RentabilidadOcupacionalEmpresaRow
    {
        public string Ruc { get; set; }             // NULL en PARTICULARES y TOTAL
        public string Empresa { get; set; }
        public int NumFacturas { get; set; }
        public int NumServicios { get; set; }
        public decimal IngresosNeto { get; set; }   // neto sin IGV
        public decimal CobradoBruto { get; set; }   // a hoy, con IGV
        public decimal SaldoBruto { get; set; }     // con IGV
        public decimal? PorcCobrado { get; set; }   // NULL si Cobrado+Saldo = 0
        public bool EsOtrosServicios { get; set; }
        public bool EsSinEmpresa { get; set; }
        public bool EsTotal { get; set; }
    }
    public class RentabilidadOcupacionalEmpresaDiagRow
    {
        public string Motivo { get; set; }
        public string Ruc { get; set; }
        public string Empresa { get; set; }
        public string Referencia { get; set; }
        public decimal MontoNeto { get; set; }
    }
    public class RentabilidadOcupacionalEmpresaResponse
    {
        public List<RentabilidadOcupacionalEmpresaRow> Empresas { get; set; } = new();
        public List<RentabilidadOcupacionalEmpresaDiagRow> Diagnostico { get; set; } = new();
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
        public string UsuarioCajero { get; set; }       // sentinel 'SIN CAJERO' o username real (ej. y.lopez); SP la devuelve siempre no-nula
        public string TipoProduccion { get; set; }       // 'CLINICA' | 'SISOL' (masterServiceType 9|42); NULL en filas sin service emparejado (no pagables)
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
        public string v_TipoProduccion { get; set; }     // 'CLINICA' | 'SISOL' (ultima columna del RS2)
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
        public string v_TipoProduccion { get; set; }     // 'CLINICA' | 'SISOL' (ultima columna de la cabecera)
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
    // Comprobante tributario del pago (sp_PagoHonorario_Get, RS4 -> 0 o 1 fila; null si el pago no tiene).
    // Los datos v_Ruc/v_RazonSocial son los CONGELADOS al emitir; ProveedorRuc/ProveedorRazonSocial son
    // los VIGENTES del LEFT JOIN a dbo.proveedores (pueden diferir).
    public class PagoHonorarioComprobanteRow
    {
        public int i_Id { get; set; }
        public int i_IdPago { get; set; }
        public string v_TipoComprobante { get; set; }   // "01" Factura | "02" Recibo por Honorarios
        public int? i_IdProveedor { get; set; }
        public string v_RucEmisor { get; set; }
        public string v_RazonSocialEmisor { get; set; }
        public string v_Serie { get; set; }
        public string v_Numero { get; set; }
        public DateTime? t_FechaEmision { get; set; }
        public DateTime? t_FechaVencimiento { get; set; }
        public string v_Moneda { get; set; }
        public decimal d_TipoCambio { get; set; }
        public decimal d_ImporteTotal { get; set; }
        public decimal d_BaseImponible { get; set; }
        public decimal d_IGV { get; set; }
        public bool b_AplicaRetencion { get; set; }
        public decimal d_MontoRetencion { get; set; }
        public bool b_AplicaDetraccion { get; set; }
        public decimal? d_PorcDetraccion { get; set; }
        public decimal? d_MontoDetraccion { get; set; }
        public string v_ConstanciaDetraccion { get; set; }
        public decimal d_NetoPagar { get; set; }
        public string v_Observaciones { get; set; }
        public int i_InsertaIdUsuario { get; set; }
        public DateTime t_InsertaFecha { get; set; }
        public string ProveedorRuc { get; set; }          // RUC vigente (LEFT JOIN dbo.proveedores)
        public string ProveedorRazonSocial { get; set; }  // Razon social vigente (LEFT JOIN dbo.proveedores)
    }
    // Detalle completo del pago (respuesta de GET pagos/{id}).
    public class PagoHonorarioDetalle
    {
        public PagoHonorarioCabecera Cabecera { get; set; }
        public List<PagoHonorarioConsultorioRow> Consultorios { get; set; } = new();
        public List<PagoHonorarioServicioRow> Servicios { get; set; } = new();
        public PagoHonorarioComprobanteRow Comprobante { get; set; }   // null si el pago no tiene comprobante
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
    // Comprobante tributario del medico (objeto anidado del request de POST pagos). OBLIGATORIO.
    // Mapea 1:1 a los 16 parametros nuevos de conta.sp_PagoHonorario_Insert.
    public class ComprobanteInput
    {
        public string TipoComprobante { get; set; }        // "01" Factura | "02" Recibo por Honorarios
        public int? IdProveedor { get; set; }              // null si el emisor se captura como texto libre
        public string RucEmisor { get; set; }
        public string RazonSocialEmisor { get; set; }
        public string Serie { get; set; }
        public string Numero { get; set; }
        public DateTime? FechaEmision { get; set; }        // requerida (validada en el controller)
        public DateTime? FechaVencimiento { get; set; }
        public string Moneda { get; set; } = "PEN";
        public decimal TipoCambio { get; set; } = 1m;
        public bool AplicaRetencion { get; set; }
        public bool AplicaDetraccion { get; set; }
        public decimal? PorcDetraccion { get; set; }
        public decimal? MontoDetraccion { get; set; }
        public string ConstanciaDetraccion { get; set; }
        public string Observaciones { get; set; }          // -> @ObservacionesComprobante
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
        public string TipoProduccion { get; set; }          // 'CLINICA' | 'SISOL'; se normaliza a 'CLINICA' si viene null/vacio (controller + repo)
        public List<PagoHonorarioServicioInput> Servicios { get; set; } = new();
        public ComprobanteInput Comprobante { get; set; }   // OBLIGATORIO (flujo completo)
    }
    // Request de POST pagos/{id}/anular.
    public class AnularRequest { public string Motivo { get; set; } }

    // ---------- Reconciliacion de caja legacy (poller conta) ----------
    // Body de POST /api/conta/caja/reconciliar (todos opcionales).
    //  - Fecha null       => Tick completo (conta.sp_CajaRecon_Tick).
    //  - Fecha con valor  => reconciliar UNA fecha (conta.sp_CajaRecon_ReconciliarDia).
    //  - Modo             => override SOLO hacia Observacion; jamas fuerza Escritura si config=Observacion.
    //  - BarridoProfundo  => solo aplica al Tick.
    public class ReconciliarRequest
    {
        public DateTime? Fecha { get; set; }
        public bool BarridoProfundo { get; set; }
        public string Modo { get; set; }
    }

    // Fila de conta.caja_reconciliacion_log (nombres = columnas del SP; PascalCase legacy, no camelCase).
    public class ReconLogRow
    {
        public int i_IdLog { get; set; }
        public DateTime t_Inicio { get; set; }
        public DateTime? t_Fin { get; set; }
        public string v_Origen { get; set; }
        public string v_Modo { get; set; }
        public string v_Accion { get; set; }
        public DateTime? d_Fecha { get; set; }
        public string v_Resultado { get; set; }
        public string v_Detalle { get; set; }
        public int? i_IdUsuario { get; set; }
    }

    // Fila de conta.caja_reconciliacion_dia (nombres = columnas de la tabla).
    public class ReconDiaRow
    {
        public DateTime d_Fecha { get; set; }
        public string v_Estado { get; set; }
        public int n_Version { get; set; }
        public int? i_IdCajaMayorCierre { get; set; }
        public decimal d_TotalIngresos { get; set; }
        public decimal d_TotalEgresos { get; set; }
        public int i_CntIngresos { get; set; }
        public int i_CntEgresos { get; set; }
        public int? hf_Cnt { get; set; }
        public decimal? hf_Sum { get; set; }
        public int? hf_Chk { get; set; }
        public DateTime? t_UltimaReconciliacion { get; set; }
        public DateTime? t_UltimoCierre { get; set; }
        public DateTime? t_UltimaVerificacion { get; set; }
    }

    // Estado efectivo del poller (para el indicador del front).
    public class ReconConfigDto
    {
        public bool Enabled { get; set; }
        public string Modo { get; set; }              // OBSERVACION | ESCRITURA (efectivo, normalizado)
        public string PisoFecha { get; set; }
        public string[] Horarios { get; set; }
        public string TimeZone { get; set; }
        public DateTimeOffset? ProximoHorarioUtc { get; set; }  // null si Enabled=false
    }

    // Respuesta de POST /api/conta/caja/reconciliar.
    public class ReconciliacionCorridaResponse
    {
        public string Modo { get; set; }              // modo efectivo aplicado
        public string Origen { get; set; }            // MANUAL
        public DateTime? Fecha { get; set; }          // no null si fue ReconciliarDia
        public bool BarridoProfundo { get; set; }
        public List<ReconLogRow> Corrida { get; set; } = new();  // filas de log producidas por esta corrida
    }

    // Respuesta de GET /api/conta/caja/reconciliacion/estado.
    public class ReconEstadoResponse
    {
        public ReconConfigDto Config { get; set; }
        public List<ReconLogRow> Corridas { get; set; } = new();  // ultimas N del log
        public List<ReconDiaRow> Dias { get; set; } = new();      // ultimos ~35 dias
    }

    // ==================== EPIDEMIOLOGIA ====================
    // Modulo Epidemiologia (cross-DB SELECT a SigesoftDesarrollo_2). Todas las propiedades = columnas
    // EXACTAS de los SP conta.sp_Epidemiologia_* (PascalCase, mismo orden). JSON sin camelCase.

    // ---- TAB 1: Ficha Individual EPI (conta.sp_Epidemiologia_FichaIndividual) ----
    // 25 columnas del formato DIRESA + TotalFilas (COUNT(*) OVER()).
    public class EpiFichaRow
    {
        public string CodigoUnico { get; set; }            // 1
        public DateTime FechaAtencion { get; set; }        // 2  (date)
        public string ApellidoPaterno { get; set; }        // 3
        public string ApellidoMaterno { get; set; }        // 4
        public string Nombres { get; set; }                // 5
        public string Red { get; set; }                    // 6
        public string TipoDocumento { get; set; }          // 7
        public string NumeroDocumento { get; set; }        // 8
        public DateTime FechaNacimiento { get; set; }      // 9  (date)
        public string Sexo { get; set; }                   // 10
        public string Nacionalidad { get; set; }           // 11
        public string Etnia { get; set; }                  // 12
        public string HistoriaClinica { get; set; }        // 13
        public DateTime? FechaHospitalizacion { get; set; }// 14 (datetime?, NULL si no hospitalizada)
        public int? Edad { get; set; }                     // 15
        public string Pais { get; set; }                   // 16
        public string Departamento { get; set; }           // 17
        public string Provincia { get; set; }              // 18
        public string Distrito { get; set; }               // 19
        public string Procedencia { get; set; }            // 20
        public string DireccionExacta { get; set; }        // 21
        public string Referencia { get; set; }             // 22
        public string Diagnostico { get; set; }            // 23 (dx concatenado ' | ', puede ser NULL)
        public string InicioSintomas { get; set; }         // 24 (texto tiempo de enfermedad, puede ser NULL)
        public string InicioSintomasDup { get; set; }      // 25 (vacio)
        public int TotalFilas { get; set; }                // COUNT(*) OVER() del universo filtrado
    }

    // ---- TAB 2: Dashboard Epidemiologico (conta.sp_Epidemiologia_Dashboard, multi-RS RS0..RS10) ----

    // RS0 - KPIs (1 fila)
    public class EpiKpisRow
    {
        public int TotalAtenciones { get; set; }
        public int AtencionesConDx { get; set; }
        public int PacientesUnicos { get; set; }
        public int TotalDx { get; set; }
        public int CasosNuevos { get; set; }
        public int CasosRecurrentes { get; set; }
        public decimal PctConDx { get; set; }
        public int ConsultoriosActivos { get; set; }
    }

    // RS1 - Incidencia por consultorio
    public class EpiPorConsultorioRow
    {
        public string ConsultorioNombre { get; set; }
        public int NumDx { get; set; }
        public int NumAtenciones { get; set; }
        public int NumPacientes { get; set; }
    }

    // RS2 - Top-N morbilidad
    public class EpiMorbilidadRow
    {
        public string CIE10 { get; set; }
        public string DiseaseName { get; set; }
        public int NumDx { get; set; }
        public int NumPacientes { get; set; }
        public decimal PctDelTotal { get; set; }
    }

    // RS3 - Capitulos CIE-10
    public class EpiCapituloRow
    {
        public int? CapNum { get; set; }
        public string CapNombre { get; set; }
        public int NumDx { get; set; }
        public int NumPacientes { get; set; }
    }

    // RS4 - Piramide sexo x etapa de vida
    public class EpiPiramideRow
    {
        public string GrupoEtario { get; set; }
        public string SexoNombre { get; set; }
        public int NumPacientes { get; set; }
    }

    // RS5 - Morbilidad por sexo
    public class EpiMorbilidadSexoRow
    {
        public string CIE10 { get; set; }
        public string DiseaseName { get; set; }
        public int NumMasculino { get; set; }
        public int NumFemenino { get; set; }
        public int Total { get; set; }
    }

    // RS6 - Heatmap consultorio x capitulo
    public class EpiHeatmapRow
    {
        public string ConsultorioNombre { get; set; }
        public int? CapNum { get; set; }
        public string CapNombre { get; set; }
        public int NumDx { get; set; }
    }

    // RS7 - Tendencia semanal
    public class EpiTendenciaRow
    {
        public int AnioISO { get; set; }
        public int SemanaISO { get; set; }
        public DateTime FechaInicioSemana { get; set; }   // (date)
        public int NumDx { get; set; }
        public int NumAtenciones { get; set; }
        public int NumCasosNuevos { get; set; }
    }

    // RS8 - Top medicos
    public class EpiMedicoRow
    {
        public string MedicoNombre { get; set; }
        public int NumDx { get; set; }
        public int NumPacientes { get; set; }
    }

    // RS9 - Comorbilidad (pares de dx)
    public class EpiComorbilidadRow
    {
        public string Cie10A { get; set; }
        public string NombreA { get; set; }
        public string Cie10B { get; set; }
        public string NombreB { get; set; }
        public int NumAtenciones { get; set; }
    }

    // RS10 - Geografia
    public class EpiGeografiaRow
    {
        public string DistritoNombre { get; set; }
        public string ProvinciaNombre { get; set; }
        public int NumPacientes { get; set; }
        public int NumDx { get; set; }
    }

    // Contenedor tipado que arma el repositorio (el controller lo proyecta a JSON con las claves
    // exactas kpis/porConsultorio/... que espera el front).
    public class EpiDashboardData
    {
        public EpiKpisRow Kpis { get; set; }
        public List<EpiPorConsultorioRow> PorConsultorio { get; set; } = new();
        public List<EpiMorbilidadRow> TopMorbilidad { get; set; } = new();
        public List<EpiCapituloRow> PorCapitulo { get; set; } = new();
        public List<EpiPiramideRow> Piramide { get; set; } = new();
        public List<EpiMorbilidadSexoRow> MorbilidadSexo { get; set; } = new();
        public List<EpiHeatmapRow> Heatmap { get; set; } = new();
        public List<EpiTendenciaRow> Tendencia { get; set; } = new();
        public List<EpiMedicoRow> Medicos { get; set; } = new();
        public List<EpiComorbilidadRow> Comorbilidad { get; set; } = new();
        public List<EpiGeografiaRow> Geografia { get; set; } = new();
    }

    // ---- TAB 2: Canal endemico (conta.sp_Epidemiologia_CanalEndemico) ----
    public class EpiCanalEndemicoRow
    {
        public int SemanaISO { get; set; }
        public decimal Q1 { get; set; }
        public decimal Mediana { get; set; }
        public decimal Q3 { get; set; }
        public int CasosActual { get; set; }
        public string Zona { get; set; }
    }

    // ==================== DASHBOARD GERENCIAL / CONTABLE ====================
    // Pagina Dashboard (2 tabs: Gerencial y Contable). Todas las propiedades = columnas EXACTAS de
    // los SP conta.sp_Dashboard_* (PascalCase, mismo orden, leidos por posicion). JSON sin camelCase.
    // Los SP son solo lectura; toda la logica vive en la BD. Ver PLAN_DASHBOARD_GERENCIAL_CONTABLE.md.

    // ---- Catalogo checkboxes (conta.sp_Dashboard_TiposCaja) ----
    public class DashTipoCajaRow
    {
        public int i_IdTipoCaja { get; set; }
        public string v_NombreTipoCaja { get; set; }
    }

    // -------- TAB 1: GERENCIAL (conta.sp_Dashboard_Gerencial, multi-RS RS0..RS9) --------

    // RS0 - KPIs (1 fila)
    public class DashGerencialKpisRow
    {
        public decimal VentaNeta { get; set; }
        public decimal VentaNetaPrev { get; set; }
        public int NumVentas { get; set; }
        public decimal TicketPromedio { get; set; }
        public decimal TicketPromedioPrev { get; set; }
        public decimal Cobrado { get; set; }
        public decimal CobradoPrev { get; set; }
        public decimal Egresos { get; set; }
        public decimal EgresosPrev { get; set; }
        public decimal FlujoNeto { get; set; }
        public decimal IngresosDevAjust { get; set; }
        public decimal MargenOperativoPct { get; set; }
        public decimal MargenOperativoPctPrev { get; set; }
        public decimal PorCobrar { get; set; }
        public decimal RatioCobranzaPct { get; set; }
    }

    // RS1 - Tendencia mensual (13m)
    public class DashTendenciaMensualRow
    {
        public int Anio { get; set; }
        public int Mes { get; set; }
        public decimal VentaNeta { get; set; }
        public decimal Cobrado { get; set; }
        public decimal Egresos { get; set; }
        public decimal ResultadoDev { get; set; }
        public decimal MargenPct { get; set; }
    }

    // RS2 - Serie diaria del rango
    public class DashSerieDiariaRow
    {
        public DateTime Fecha { get; set; }   // (date)
        public decimal VentaNeta { get; set; }
        public decimal Cobrado { get; set; }
        public decimal Egresos { get; set; }
    }

    // RS3 - Mix por unidad (rango)
    public class DashMixUnidadRow
    {
        public int IdTipoCaja { get; set; }
        public string Unidad { get; set; }
        public decimal VentaNeta { get; set; }
        public decimal Cobrado { get; set; }
        public decimal Egresos { get; set; }
        public decimal Resultado { get; set; }
        public decimal PctVenta { get; set; }
    }

    // RS4 - Mix mensual x unidad (13m)
    public class DashMixMensualRow
    {
        public int Anio { get; set; }
        public int Mes { get; set; }
        public int IdTipoCaja { get; set; }
        public string Unidad { get; set; }
        public decimal VentaNeta { get; set; }
    }

    // RS5 - Medios de pago (rango)
    public class DashMediosPagoRow
    {
        public int IdFormaPago { get; set; }
        public string FormaPago { get; set; }
        public decimal Monto { get; set; }
        public decimal Pct { get; set; }
    }

    // RS6 - Waterfall del flujo del rango
    public class DashWaterfallRow
    {
        public int Orden { get; set; }
        public string Concepto { get; set; }
        public decimal Monto { get; set; }
        public string Tipo { get; set; }
    }

    // RS7 - Top categorias de egreso (rango)
    public class DashTopEgresosRow
    {
        public string Categoria { get; set; }
        public string Fuente { get; set; }
        public decimal Monto { get; set; }
        public decimal Pct { get; set; }
    }

    // RS8 gerencial / RS5 contable - CxC por unidad (mismo contrato, DTO compartido)
    public class DashCxcUnidadRow
    {
        public int IdTipoCaja { get; set; }
        public string Unidad { get; set; }
        public decimal CreditoFacturado { get; set; }
        public decimal CreditoCobrado { get; set; }
        public decimal PorCobrar { get; set; }
    }

    // RS9 - Heatmap de cobranza (dia x semana)
    public class DashHeatmapCobranzaRow
    {
        public int DiaSemana { get; set; }               // 1=lun..7=dom
        public string Etiqueta { get; set; }
        public int NumSemana { get; set; }
        public DateTime FechaInicioSemana { get; set; }  // (date)
        public decimal Cobrado { get; set; }
    }

    // Contenedor TAB 1 (el controller lo devuelve tal cual: JSON keys = PascalCase de estas propiedades)
    public class DashGerencialData
    {
        public DashGerencialKpisRow Kpis { get; set; }
        public List<DashTendenciaMensualRow> TendenciaMensual { get; set; } = new();
        public List<DashSerieDiariaRow> SerieDiaria { get; set; } = new();
        public List<DashMixUnidadRow> MixUnidad { get; set; } = new();
        public List<DashMixMensualRow> MixMensual { get; set; } = new();
        public List<DashMediosPagoRow> MediosPago { get; set; } = new();
        public List<DashWaterfallRow> Waterfall { get; set; } = new();
        public List<DashTopEgresosRow> TopEgresos { get; set; } = new();
        public List<DashCxcUnidadRow> CxcUnidad { get; set; } = new();
        public List<DashHeatmapCobranzaRow> HeatmapCobranza { get; set; } = new();
    }

    // -------- TAB 2: CONTABLE (conta.sp_Dashboard_Contable, multi-RS RS0..RS11) --------

    // RS0 - KPIs (1 fila) - todas decimal
    public class DashContableKpisRow
    {
        public decimal Cobrado { get; set; }
        public decimal CobradoPrev { get; set; }
        public decimal Egresos { get; set; }
        public decimal EgresosPrev { get; set; }
        public decimal EgresosLegacy { get; set; }
        public decimal EgresosConta { get; set; }
        public decimal Planilla { get; set; }
        public decimal FlujoNeto { get; set; }
        public decimal FlujoNetoPrev { get; set; }
        public decimal EgresoPromedioDiario { get; set; }
        public decimal PorCobrar { get; set; }
        public decimal PorPagar { get; set; }
        public decimal IGVDebitoEstimado { get; set; }
        public decimal IGVCreditoFiscal { get; set; }
        public decimal IGVResultanteEstimado { get; set; }
    }

    // RS1 - Ingresos vs egresos mensual (13m)
    public class DashIngresosVsEgresosRow
    {
        public int Anio { get; set; }
        public int Mes { get; set; }
        public decimal Cobrado { get; set; }
        public decimal Egresos { get; set; }
        public decimal FlujoNeto { get; set; }
    }

    // RS2 - Cobranzas x medio x mes (13m)
    public class DashCobranzasMedioMesRow
    {
        public int Anio { get; set; }
        public int Mes { get; set; }
        public int IdFormaPago { get; set; }
        public string FormaPago { get; set; }
        public decimal Monto { get; set; }
    }

    // RS3 - Composicion de gastos (rango)
    public class DashComposicionGastosRow
    {
        public string Fuente { get; set; }
        public string Categoria { get; set; }
        public decimal Monto { get; set; }
        public decimal Pct { get; set; }
    }

    // RS4 - Evolucion CxC mensual (13m)
    public class DashEvolucionCxcRow
    {
        public int Anio { get; set; }
        public int Mes { get; set; }
        public decimal CreditoFacturadoMes { get; set; }
        public decimal CreditoCobradoMes { get; set; }
        public decimal SaldoAcumulado { get; set; }
    }

    // RS6 - CxP aging (al corte @Hasta)
    public class DashCxpAgingRow
    {
        public string Categoria { get; set; }
        public string Bucket { get; set; }
        public decimal Monto { get; set; }
        public int NumDocs { get; set; }
    }

    // RS7 - IGV mensual (13m)
    public class DashIgvMensualRow
    {
        public int Anio { get; set; }
        public int Mes { get; set; }
        public decimal IGVDebitoEstimado { get; set; }
        public decimal IGVCreditoFiscal { get; set; }
        public decimal IGVResultante { get; set; }
    }

    // RS8 - Planilla x concepto x mes (13m)
    public class DashPlanillaMesRow
    {
        public int Anio { get; set; }
        public int Mes { get; set; }
        public string Concepto { get; set; }
        public decimal Monto { get; set; }
    }

    // RS9 - Saldos bancarios (6 cuentas; Saldo/AnioMesRef NULL hoy)
    public class DashSaldoBancarioRow
    {
        public int IdCuenta { get; set; }
        public string Banco { get; set; }
        public string Cuenta { get; set; }
        public string Moneda { get; set; }
        public bool EsDetraccion { get; set; }
        public decimal? Saldo { get; set; }        // NULLABLE (sin saldo cargado)
        public int? AnioMesRef { get; set; }       // NULLABLE
    }

    // RS10 - Honorarios x consultorio (rango)
    public class DashHonorarioConsultorioRow
    {
        public string Consultorio { get; set; }
        public decimal Monto { get; set; }
        public int NumPagos { get; set; }
    }

    // RS11 - SISOL liquidaciones (meses del rango)
    public class DashSisolLiquidacionRow
    {
        public int Anio { get; set; }
        public int Mes { get; set; }
        public decimal VentaNeta { get; set; }
        public decimal PctClinica { get; set; }
        public decimal MontoClinica { get; set; }
        public decimal MontoHospital { get; set; }
        public string Estado { get; set; }
    }

    // Contenedor TAB 2 (el controller lo devuelve tal cual: JSON keys = PascalCase de estas propiedades)
    public class DashContableData
    {
        public DashContableKpisRow Kpis { get; set; }
        public List<DashIngresosVsEgresosRow> IngresosVsEgresos { get; set; } = new();
        public List<DashCobranzasMedioMesRow> CobranzasMedioMes { get; set; } = new();
        public List<DashComposicionGastosRow> ComposicionGastos { get; set; } = new();
        public List<DashEvolucionCxcRow> EvolucionCxc { get; set; } = new();
        public List<DashCxcUnidadRow> CxcUnidad { get; set; } = new();
        public List<DashCxpAgingRow> CxpAging { get; set; } = new();
        public List<DashIgvMensualRow> IgvMensual { get; set; } = new();
        public List<DashPlanillaMesRow> PlanillaMes { get; set; } = new();
        public List<DashSaldoBancarioRow> SaldosBancarios { get; set; } = new();
        public List<DashHonorarioConsultorioRow> HonorariosConsultorio { get; set; } = new();
        public List<DashSisolLiquidacionRow> SisolLiquidaciones { get; set; } = new();
    }
}
