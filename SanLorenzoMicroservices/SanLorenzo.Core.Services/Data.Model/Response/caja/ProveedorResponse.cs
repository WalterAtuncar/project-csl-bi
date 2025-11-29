using System;

namespace Data.Model.Response.caja
{
    public class ProveedorResponse
    {
        public int IdProveedor { get; set; }
        public string Ruc { get; set; }
        public string RazonSocial { get; set; }
        public string Direccion { get; set; }
        public string Email { get; set; }
        public bool Activo { get; set; }
        public DateTime? FechaRegistro { get; set; }
    }
}
