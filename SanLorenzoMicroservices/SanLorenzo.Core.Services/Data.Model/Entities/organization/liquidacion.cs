using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.organization
{
    public class liquidacion
    {
        [ExplicitKey]
        public string v_LiquidacionId { get; set; }
        public string v_NroLiquidacion { get; set; }
        public string v_OrganizationId { get; set; }
        public decimal? d_Monto { get; set; }
        public DateTime? d_FechaVencimiento { get; set; }
        public string v_NroFactura { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public string v_ServiceId { get; set; }
        public string v_ComentaryUpdate { get; set; }
    }
}
