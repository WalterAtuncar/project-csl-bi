using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class familyMedicalAntecedentsReportResponse
    {
        public int i_Item { get; set; }
        public string v_FamilyMedicalAntecedentsId { get; set; }
        public string v_PersonId { get; set; }
        public string v_DiseasesId { get; set; }
        public string v_DiseaseName { get; set; }
        public int i_TypeFamilyId { get; set; }
        public string v_TypeFamilyName { get; set; }
        public string v_Comment { get; set; }
        public string v_FullAntecedentName { get; set; }
        public string DxAndComment { get; set; }
    }
}
