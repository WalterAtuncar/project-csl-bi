namespace Data.Model.Response.caja
{
    public class RegistroComprasListItemResponse
    {
        public int IdRegistroCompra { get; set; }
        public int Periodo { get; set; }
        public DateTime FechaEmision { get; set; }
        public DateTime? FechaVencimiento { get; set; }
        public int IdTipoCaja { get; set; }
        public string TipoCajaName { get; set; }
        public string TipoComprobanteName { get; set; }
        public string Serie { get; set; }
        public string Numero { get; set; }
        public string RazonSocialProveedor { get; set; }
        public decimal BaseImponible { get; set; }
        public decimal IGV { get; set; }
        public decimal ImporteTotal { get; set; }
        public string IdFamiliaEgresoName { get; set; }
        public string Estado { get; set; }
        public string EstadoName { get; set; }
    }
}
