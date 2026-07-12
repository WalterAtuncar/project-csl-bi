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
        public string Roles { get; set; }
    }
    public class UsuarioAuthRow
    {
        public int i_IdUsuario { get; set; }
        public string v_Username { get; set; }
        public string v_PasswordHash { get; set; }
        public string v_NombreCompleto { get; set; }
        public bool b_Activo { get; set; }
        public string Roles { get; set; }
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
}
