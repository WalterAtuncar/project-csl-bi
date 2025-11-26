using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class noxiousHabitsReportResponse
    {
        public int i_Item { get; set; }
        public string v_NoxiousHabitsId { get; set; }
        public string v_NoxiousHabitsName { get; set; }
        public string v_PersonId { get; set; }
        public string v_Frequency { get; set; }
        public string v_Comment { get; set; }
        public int i_TypeHabitsId { get; set; }
        public string v_TypeHabitsName { get; set; }
        public int i_RecordStatus { get; set; }
        public int i_RecordType { get; set; }
        public string v_DescriptionQuantity { get; set; }
        public string v_DescriptionHabit { get; set; }
        public string v_FrecuenciaHabito { get; set; }
    }
}
