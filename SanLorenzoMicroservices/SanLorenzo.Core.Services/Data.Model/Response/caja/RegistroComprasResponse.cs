using System;

namespace Data.Model.Response.caja
{
    public class RegistroComprasResponse
    {
        public int IdRegistroCompra { get; set; }
        public int IdMovimientoEgreso { get; set; }
        public int IdProveedor { get; set; }
        public string RucProveedor { get; set; }
        public string RazonSocialProveedor { get; set; }
        public DateTime FechaEmision { get; set; }
        public DateTime? FechaVencimiento { get; set; }
        public string TipoComprobante { get; set; }
        public string Serie { get; set; }
        public string Numero { get; set; }
        public decimal BaseImponible { get; set; }
        public decimal IGV { get; set; }
        public decimal ISC { get; set; }
        public decimal OtrosTributos { get; set; }
        public decimal ValorNoGravado { get; set; }
        public decimal ImporteTotal { get; set; }
        public string CodigoMoneda { get; set; }
        public decimal TipoCambio { get; set; }
        public bool AplicaDetraccion { get; set; }
        public decimal? PorcentajeDetraccion { get; set; }
        public decimal? MontoDetraccion { get; set; }
        public string NumeroConstanciaDetraccion { get; set; }
        public bool AplicaRetencion { get; set; }
        public decimal? MontoRetencion { get; set; }
        public string Observaciones { get; set; }
        public string Estado { get; set; }
        public int InsertaIdUsuario { get; set; }
        public DateTime? InsertaFecha { get; set; }
    }
}
