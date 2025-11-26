using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.dxfrecuente
{
    public class dxfrecuentedetalle
    {
        public string v_DxFrecuenteDetalleId { get; set; }
        public string v_DxFrecuenteId { get; set; }
        public string v_MasterRecommendationRestricctionId { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public string v_ComentaryUpdate { get; set; }
    }
}
