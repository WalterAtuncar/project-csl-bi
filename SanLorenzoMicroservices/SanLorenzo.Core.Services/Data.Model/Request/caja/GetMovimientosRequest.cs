using System;

namespace Data.Model.Request.caja
{
    public class GetMovimientosRequest
    {
        public int IdCajaMayorCierre { get; set; }
        public int? IdTipoCaja { get; set; }
        public string? TipoMovimiento { get; set; }
        public string? Origen { get; set; }
        public System.DateTime? FechaDesde { get; set; }
        public System.DateTime? FechaHasta { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
        public bool? SinPaginacion { get; set; } = null;
    }
}