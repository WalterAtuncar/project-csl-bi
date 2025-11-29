using System;

namespace Data.Model.Response.caja
{
    public class CajaMayorMovimientoResponse
    {
        public int IdCajaMayorMovimiento { get; set; }
        public int IdCajaMayorCierre { get; set; }
        public int IdTipoCaja { get; set; }
        public string NombreTipoCaja { get; set; }
        public string TipoMovimiento { get; set; }
        public decimal Total { get; set; }
        public System.DateTime FechaRegistro { get; set; }
        public string ConceptoMovimiento { get; set; }
        public string Observaciones { get; set; }
        public string Origen { get; set; }
        public string CodigoDocumento { get; set; }
        public string SerieDocumento { get; set; }
        public string NumeroDocumento { get; set; }
        public string IdReferencia { get; set; }
        public string Referencia { get; set; }
    }
}