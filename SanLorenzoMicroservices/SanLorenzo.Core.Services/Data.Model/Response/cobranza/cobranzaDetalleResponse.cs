using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.cobranza
{
    public class cobranzaDetalleResponse
    {
        public string v_IdCobranzaDetalle { get; set; }
        public string v_IdCobranza { get; set; }
        public string v_IdVenta { get; set; }
        public int i_IdFormaPago { get; set; }
        public int i_IdTipoDocumentoRef { get; set; }
        public string v_DocumentoRef { get; set; }
        public int i_IdMoneda { get; set; }
        public decimal d_NetoXCobrar { get; set; }
        public decimal d_ImporteSoles { get; set; }
        public decimal d_ImporteDolares { get; set; }
        public string v_Observacion { get; set; }
        public int i_EsLetra { get; set; }
        public int i_Eliminado { get; set; }
        public int i_InsertaIdUsuario { get; set; }
        public DateTime t_InsertaFecha { get; set; }
        public int i_ActualizaIdUsuario { get; set; }
        public DateTime t_ActualizaFecha { get; set; }
        public decimal d_GastosFinancieros { get; set; }
        public decimal d_IngresosFinancieros { get; set; }
        public int i_EsAbonoLetraDescuento { get; set; }
        public int i_AplicaRetencion { get; set; }
        public decimal d_MontoRetencion { get; set; }
        public string v_NroRetencion { get; set; }
        public decimal d_Redondeo { get; set; }
    }
}
