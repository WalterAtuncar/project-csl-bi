namespace Data.Model.Request.caja
{
    public class ResumenMensualPorTipoRequest
    {
        // Formato esperado: YYYYMM (ej. 202501)
        public int PeriodoDesde { get; set; }
        public int PeriodoHasta { get; set; }
        public int? IdTipoCaja { get; set; }
        public byte? EstadoCierre { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }
}