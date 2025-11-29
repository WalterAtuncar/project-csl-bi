namespace Data.Model.Response.caja
{
    public class CajaMayorResumenTipoResponse
    {
        public int IdCajaMayorCierre { get; set; }
        public int IdTipoCaja { get; set; }
        public decimal SaldoInicial { get; set; }
        public decimal TotalIngresos { get; set; }
        public decimal TotalEgresos { get; set; }
        public decimal SaldoFinal { get; set; }
    }
}