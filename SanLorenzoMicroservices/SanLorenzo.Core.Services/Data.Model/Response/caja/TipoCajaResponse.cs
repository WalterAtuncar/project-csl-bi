using System;

namespace Data.Model.Response.caja
{
    public class TipoCajaResponse
    {
        public int IdTipoCaja { get; set; }
        public string NombreTipoCaja { get; set; }
        public string Descripcion { get; set; }
        public int Estado { get; set; }
        public string EstadoDescripcion { get; set; }
        public DateTime? FechaCreacion { get; set; }
    }
}