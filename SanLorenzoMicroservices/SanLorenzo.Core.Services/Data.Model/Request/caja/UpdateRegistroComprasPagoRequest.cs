using System;

namespace Data.Model.Request.caja
{
    public class UpdateRegistroComprasPagoRequest
    {
        public int IdRegistroCompra { get; set; }
        public DateTime FechaPago { get; set; }
        public int? ActualizaIdUsuario { get; set; }
    }
}

