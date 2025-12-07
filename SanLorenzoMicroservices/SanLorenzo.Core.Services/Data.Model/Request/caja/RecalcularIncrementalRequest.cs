using System;

namespace Data.Model.Request.caja
{
    public class RecalcularIncrementalRequest
    {
        public int IdCajaMayorCierre { get; set; }
        public int? DefaultIdTipoCaja { get; set; }
        public bool Preview { get; set; }
    }
}
