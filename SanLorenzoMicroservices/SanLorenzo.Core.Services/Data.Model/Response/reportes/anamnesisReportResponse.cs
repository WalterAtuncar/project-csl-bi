using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class anamnesisReportResponse
    {
        public string v_ServiceId { get; set; }
        public int i_HasSymptomId { get; set; }
        public string v_MainSymptom { get; set; }
        public int i_TimeOfDisease { get; set; }
        public int i_TimeOfDiseaseTypeId { get; set; }
        public string v_Story { get; set; }
        public string v_PersonId { get; set; }
        public int i_DreamId { get; set; }
        public string v_Dream { get; set; }
        public int i_UrineId { get; set; }
        public string v_Urine { get; set; }
        public int i_DepositionId { get; set; }
        public string v_Deposition { get; set; }
        public int i_AppetiteId { get; set; }
        public string v_Appetite { get; set; }
        public int i_ThirstId { get; set; }
        public string v_Thirst { get; set; }
        public DateTime? d_Fur { get; set; }
        public string v_CatemenialRegime { get; set; }
        public int i_MacId { get; set; }
        public string v_Mac { get; set; }
        public DateTime? d_PAP { get; set; }
        public DateTime? d_Mamografia { get; set; }
        public string v_CiruGine { get; set; }
        public string v_Gestapara { get; set; }
        public string v_Menarquia { get; set; }
        public string v_Findings { get; set; }
        public string FirmaDoctor { get; set; }
        public string FirmaMedicoMedicina { get; set; }
    }
}
