using System;

namespace Data.Model.Response.gerencia
{
    public class GerenciaVentasFarmaciaResponse
    {
        public string Venta { get; set; }
        public string Serie { get; set; }
        public string Correlativo { get; set; }
        public string Cliente { get; set; }
        public decimal Total { get; set; }
        public string Descripcion { get; set; }
        public int Cantidad { get; set; }
        public decimal PrecioV { get; set; }
        public decimal PrecioU { get; set; }
        public DateTime FechaEmision { get; set; }
        public string Condicion { get; set; }
        public string Tipo { get; set; }
        public string Usuario1 { get; set; }
        public string Value1 { get; set; }
        public string Servicio { get; set; }
        public string Paciente { get; set; }
        public DateTime FechaServicio { get; set; }
        public string Comprobante { get; set; }
        public string Usuario2 { get; set; }
        public string Value2 { get; set; }
    }
} 