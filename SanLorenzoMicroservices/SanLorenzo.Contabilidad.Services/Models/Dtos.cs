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
}
