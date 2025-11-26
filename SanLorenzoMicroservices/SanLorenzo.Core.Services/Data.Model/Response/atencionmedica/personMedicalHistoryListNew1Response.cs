using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.atencionmedica
{
    public class personMedicalHistoryListNew1Response
    {
        public string v_AntecedentTypeName { get; set; }
        public string v_DiseasesName { get; set; }
        public string v_HistoryId { get; set; }
        public Nullable<DateTime> d_StartDate { get; set; }
        public Nullable<DateTime> d_EndDate { get; set; }
        public String v_Occupation { get; set; }
        public string v_GroupName { get; set; }

        public string v_DateOrGroup { get; set; }
        public String v_CIE10Id { get; set; }
        public String v_DiseasesId { get; set; }
    }
}
