namespace Data.Model.Response.caja
{
    public class FlujoCajaDetalladoResponse
    {
        public int IdTipoCaja { get; set; }
        public string NombreTipoCaja { get; set; }
        public string TipoMovimiento { get; set; } // 'I' o 'E'

        // Clasificador del detalle (p.ej. FORMA_PAGO o FAMILIA_EGRESO)
        public string DetalleTipo { get; set; }
        public int IdDetalle { get; set; }
        public string NombreDetalle { get; set; }

        // Siempre devolver los 12 meses del año
        public decimal Ene { get; set; }
        public decimal Feb { get; set; }
        public decimal Mar { get; set; }
        public decimal Abr { get; set; }
        public decimal May { get; set; }
        public decimal Jun { get; set; }
        public decimal Jul { get; set; }
        public decimal Ago { get; set; }
        public decimal Set { get; set; }
        public decimal Oct { get; set; }
        public decimal Nov { get; set; }
        public decimal Dic { get; set; }

        public decimal Total { get; set; }
    }
}