namespace Data.Model.Request.caja
{
    public class UpdateSaldoInicialTipoCajaRequest
    {
        public int IdCajaMayorCierre { get; set; }
        public int IdTipoCaja { get; set; }
        public decimal SaldoInicial { get; set; }
        public int ActualizaIdUsuario { get; set; }
    }
}