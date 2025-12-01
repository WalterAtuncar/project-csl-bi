namespace Data.Model.Request.caja
{
    public class RegistroComprasListRequest
    {
        public int? Periodo { get; set; }
        public DateTime? FechaInicial { get; set; }
        public DateTime? FechaFinal { get; set; }
        public string? TipoComprobante { get; set; }
        public int? IdProveedor { get; set; }
        public int? IdTipoCaja { get; set; }
        public string? Estado { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }
}
