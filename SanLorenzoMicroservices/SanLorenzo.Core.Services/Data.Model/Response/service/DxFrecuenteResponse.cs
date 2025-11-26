using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.service
{
    public class DxFrecuenteResponse
    {
        public string v_DxFrecuenteId { get; set; }
        public string v_DiseasesId { get; set; }
        public string v_DiseasesName { get; set; }
        public string v_CIE10Id { get; set; }
        public string v_DxFrecuenteDetalleId { get; set; }
        public string v_MasterRecommendationRestricctionId { get; set; }
        public string v_MasterRecommendationRestricctionName { get; set; }
        public int? i_Tipo { get; set; }
        public string v_RecomendacionName { get; set; }
        public string v_RestriccionName { get; set; }

    }

    public class ListVentasFarmacia
    {
        public string IdVenta { get; set; }
        public string Comprobante { get; set; }
        public string Cliente { get; set; }
        public string Descripcion { get; set; }
        public decimal? Cantidad { get; set; }
        public decimal? PrecioU { get; set; }
        public decimal? PrecioTotal { get; set; }
        public DateTime Fecha { get; set; }
        public string Tipo { get; set; }
        public string Consultorio { get; set; }

        public string TipoVenta { get; set; }
        public string Condicion { get; set; }
    }
}
