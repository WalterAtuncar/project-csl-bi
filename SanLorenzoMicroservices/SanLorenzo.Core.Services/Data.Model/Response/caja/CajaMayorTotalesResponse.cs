namespace Data.Model.Response.caja
{
    public class CajaMayorTotalesResponse
    {
        public int IdCajaMayorCierre { get; set; }
        public decimal SaldoInicialTotal { get; set; }
        public decimal TotalIngresosTotal { get; set; }
        public decimal TotalEgresosTotal { get; set; }
        public decimal SaldoFinalTotal { get; set; }
    }
}