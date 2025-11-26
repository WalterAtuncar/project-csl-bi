using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.service
{
    public class diagnosticrepository
    {
        [ExplicitKey]
        public string v_DiagnosticRepositoryId { get; set; }
        public string v_ServiceId { get; set; }
        public string v_DiseasesId { get; set; }
        public string v_ComponentId { get; set; }
        public string v_ComponentFieldId { get; set; }
        public int? i_AutoManualId { get; set; }
        public int? i_PreQualificationId { get; set; }
        public int? i_FinalQualificationId { get; set; }
        public int? i_DiagnosticTypeId { get; set; }
        public int? i_IsSentToAntecedent { get; set; }
        public DateTime? d_ExpirationDateDiagnostic { get; set; }
        public int? i_GenerateMedicalBreak { get; set; }
        public string v_Recomendations { get; set; }
        public int? i_DiagnosticSourceId { get; set; }
        public int? i_ShapeAccidentId { get; set; }
        public int? i_BodyPartId { get; set; }
        public int? i_ClassificationOfWorkAccidentId { get; set; }
        public int? i_RiskFactorId { get; set; }
        public int? i_ClassificationOfWorkdiseaseId { get; set; }
        public int? i_SendToInterconsultationId { get; set; }
        public int? i_InterconsultationDestinationId { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public string v_InterconsultationDestinationId { get; set; }
        public string v_ComentaryUpdate { get; set; }
    }
}
