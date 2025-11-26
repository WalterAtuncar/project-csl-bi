using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.service
{
    public class servicecomponentfieldvalues
    {
        [ExplicitKey]
        public string v_ServiceComponentFieldValuesId { get; set; }
        public string v_ComponentFieldValuesId { get; set; }
        public string v_ServiceComponentFieldsId { get; set; }
        public string v_Value1 { get; set; }
        public string v_Value2 { get; set; }
        public int? i_Index { get; set; }
        public int? i_Value1 { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public string v_ComentaryUpdate { get; set; }
    }
}
