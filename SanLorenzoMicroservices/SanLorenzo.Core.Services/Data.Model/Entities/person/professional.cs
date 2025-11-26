using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.person
{
    public class professional
    {
        [ExplicitKey]
        public string v_PersonId { get; set; }
        public int? i_ProfessionId { get; set; }
        public string v_ProfessionalCode { get; set; }
        public string v_ProfessionalInformation { get; set; }
        public byte[] b_SignatureImage { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public int? i_UpdateNodeId { get; set; }
        public string v_ComentaryUpdate { get; set; }
        public string v_ComponentId { get; set; }
        public decimal? r_MonthlyPayment { get; set; }
        public DateTime? t_MonthlyHours { get; set; }
        public DateTime? d_StartDateOfWork { get; set; }
        public DateTime? d_ContractFrom { get; set; }
        public DateTime? d_ContractUntil { get; set; }
        public DateTime? d_CessationDate { get; set; }
        public int? i_Profesion { get; set; }
        public int? i_Profesion2 { get; set; }
        public int? i_GrupoHorario { get; set; }
        public int? i_CodigoProfesion { get; set; }
    }
}
