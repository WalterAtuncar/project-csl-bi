using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.atencionmedica
{
    public class serviceComponentDisgnosticsByServiceIdResponse
    {
        public string v_DiagnosticRepositoryId { get; set; }
        public string v_ServiceId { get; set; }
        public string v_ComponentId { get; set; }
        public string v_DiseasesId { get; set; }
        public int? i_AutoManualId { get; set; }
        public int? i_PreQualificationId { get; set; }
        public int? i_FinalQualificationId { get; set; }
        public int? i_DiagnosticTypeId { get; set; }
        public DateTime? d_ExpirationDateDiagnostic { get; set; }
        public int? i_GenerateMedicalBreak { get; set; }
        public string Examen { get; set; }
        public string v_RestrictionsName { get; set; }
        public string v_RecomendationsName { get; set; }
        public string v_DiseasesName { get; set; }
        public string v_AutoManualName { get; set; }
        public string v_ComponentName { get; set; }
        public string v_PreQualificationName { get; set; }
        public string v_FinalQualificationName { get; set; }
        public string v_DiagnosticTypeName { get; set; }
        public string v_IsSentToAntecedentName { get; set; }
        public string v_UpdateUser { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public int? i_RecordStatus { get; set; }
        public int? i_RecordType { get; set; }
        public int? i_IsDeleted { get; set; }
        public string APTITUD_MTC { get; set; }
    }
}