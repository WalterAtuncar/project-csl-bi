using System;

namespace Data.Model.Response.caja
{
    public class CajaMayorCierreExistsResponse
    {
        public bool Exists { get; set; }
        public int? IdCajaMayorCierre { get; set; }
        public int Anio { get; set; }
        public int Mes { get; set; }
    }
}