namespace Data.Model.Response.caja
{
    public class CajaMayorResumenMensualTipoResponse
    {
        public int Periodo { get; set; }     // YYYYMM
        public int Anio { get; set; }        // YYYY
        public int Mes { get; set; }         // MM
        public int IdTipoCaja { get; set; }
        public string NombreTipoCaja { get; set; }
        public decimal SaldoInicial { get; set; }
        public decimal TotalIngresos { get; set; }
        public decimal TotalEgresos { get; set; }
        public decimal SaldoFinal { get; set; }
    }
}