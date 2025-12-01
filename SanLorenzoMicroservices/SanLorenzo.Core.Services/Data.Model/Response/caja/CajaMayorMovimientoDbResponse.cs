using System;

namespace Data.Model.Response.caja
{
    public class CajaMayorMovimientoDbResponse
    {
        public int i_IdMovimiento { get; set; }
        public int i_IdCajaMayorCierre { get; set; }
        public int i_IdTipoCaja { get; set; }
        public string v_TipoMovimiento { get; set; }
        public int? i_IdFormaPago { get; set; }
        public decimal d_Total { get; set; }
        public System.DateTime t_FechaMovimiento { get; set; }
        public string v_Observaciones { get; set; }
        public string v_Origen { get; set; }
        public string v_CodigoDocumento { get; set; }
        public string v_SerieDocumento { get; set; }
        public string v_NumeroDocumento { get; set; }
        public string v_IdVenta { get; set; }
        public int i_InsertaIdUsuario { get; set; }
        public System.DateTime t_InsertaFecha { get; set; }
        public int? i_ActualizaIdUsuario { get; set; }
        public System.DateTime? t_ActualizaFecha { get; set; }
    }
}