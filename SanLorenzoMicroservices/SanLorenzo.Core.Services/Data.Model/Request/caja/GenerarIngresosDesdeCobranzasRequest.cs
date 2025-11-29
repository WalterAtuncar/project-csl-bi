using System;

namespace Data.Model.Request.caja
{
    public class GenerarIngresosDesdeCobranzasRequest
    {
        public int IdCajaMayorCierre { get; set; }
        public int InsertaIdUsuario { get; set; }
        public int? DefaultIdTipoCaja { get; set; }
    }
}