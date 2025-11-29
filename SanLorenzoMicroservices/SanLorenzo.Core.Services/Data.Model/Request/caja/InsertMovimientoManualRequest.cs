using System;

namespace Data.Model.Request.caja
{
    public class InsertMovimientoManualRequest
    {
        public int IdCajaMayorCierre { get; set; }
        public int IdTipoCaja { get; set; }
        public string TipoMovimiento { get; set; }
        public decimal Total { get; set; }
        public System.DateTime FechaRegistro { get; set; }
        public string Observaciones { get; set; }
        // Nuevos campos para movimiento manual (compatibles con cajamayor_movimiento)
        public string ConceptoMovimiento { get; set; }
        public decimal? Subtotal { get; set; }
        public decimal? IGV { get; set; }
        public string Origen { get; set; }
        public string CodigoDocumento { get; set; }
        public string SerieDocumento { get; set; }
        public string NumeroDocumento { get; set; }
        public string IdVenta { get; set; }
        public int InsertaIdUsuario { get; set; }
    }
}