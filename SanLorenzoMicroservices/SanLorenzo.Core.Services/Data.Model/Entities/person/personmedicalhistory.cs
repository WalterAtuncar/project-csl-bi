using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.person
{
    public class personmedicalhistory
    {
        [ExplicitKey]
        public string v_PersonMedicalHistoryId { get; set; }
        public string v_PersonId { get; set; }
        public string v_DiseasesId { get; set; }
        public int? i_TypeDiagnosticId { get; set; }
        public DateTime? d_StartDate { get; set; }
        public string v_DiagnosticDetail { get; set; }
        public string v_TreatmentSite { get; set; }
        public int? i_AnswerId { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public int? i_SoloAnio { get; set; }
        public string NombreHospital { get; set; }
        public string v_Complicaciones { get; set; }
        public string v_ComentaryUpdate { get; set; }
        public string v_Tratamiento { get; set; }
        public string v_Comentarios { get; set; }
    }
}
