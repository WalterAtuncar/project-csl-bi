using System;

namespace Data.Model.Request.caja
{
    public class CierreCreateUpdateRequest
    {
        public string Anio { get; set; }
        public string Mes { get; set; }
        public System.DateTime FechaInicio { get; set; }
        public System.DateTime FechaFin { get; set; }
        public string Observaciones { get; set; }
        public int InsertaIdUsuario { get; set; }
    }
}