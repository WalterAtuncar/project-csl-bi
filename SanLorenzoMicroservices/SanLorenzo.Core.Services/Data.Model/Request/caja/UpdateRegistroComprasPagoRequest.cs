using System;

namespace Data.Model.Request.caja
{
    public class UpdateRegistroComprasPagoRequest
    {
        public int IdRegistroCompra { get; set; }
        public DateTime? FechaPago { get; set; }
        public string? Estado { get; set; } // "1" Pagado, "0" Por Pagar
        public string? Serie { get; set; }
        public string? Numero { get; set; }
        public int? ActualizaIdUsuario { get; set; }
    }
}
