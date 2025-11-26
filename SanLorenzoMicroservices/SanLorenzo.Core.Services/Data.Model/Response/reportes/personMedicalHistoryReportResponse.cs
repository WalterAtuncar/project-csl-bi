using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class personMedicalHistoryReportResponse
    {
        public int i_Item { get; set; }
        public string v_PersonMedicalHistoryId { get; set; }
        public string v_PersonId { get; set; }
        public string v_DiseasesId { get; set; }
        public string v_DiseasesName { get; set; }
        public int i_TypeDiagnosticId { get; set; }
        public DateTime? d_StartDate { get; set; }
        public string v_TreatmentSite { get; set; }
        public string v_GroupName { get; set; }
        public string v_TypeDiagnosticName { get; set; }
        public string v_DiagnosticDetail { get; set; }
        public int i_Answer { get; set; }
        public string NombreHospital { get; set; }
        public string v_Complicaciones { get; set; }
    }
}
