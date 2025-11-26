using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.service
{
    public class servicecomponent
    {
        [ExplicitKey]
        public string v_ServiceComponentId { get; set; }
        public string v_ServiceId { get; set; }
        public string v_ComponentId { get; set; }
        public int? i_ServiceComponentStatusId { get; set; }
        public int? i_ExternalInternalId { get; set; }
        public int? i_ServiceComponentTypeId { get; set; }
        public int? i_IsVisibleId { get; set; }
        public int? i_IsInheritedId { get; set; }
        public DateTime? d_CalledDate { get; set; }
        public DateTime? d_StartDate { get; set; }
        public DateTime? d_EndDate { get; set; }
        public int? i_index { get; set; }
        public float? r_Price { get; set; }
        public int? i_IsInvoicedId { get; set; }
        public int? i_IsRequiredId { get; set; }
        public int? i_IsManuallyAddedId { get; set; }
        public int? i_QueueStatusId { get; set; }
        public string v_NameOfice { get; set; }
        public string v_Comment { get; set; }
        public int? i_Iscalling { get; set; }
        public int? i_IsApprovedId { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public int? i_ApprovedInsertUserId { get; set; }
        public int? i_ApprovedUpdateUserId { get; set; }
        public DateTime? d_ApprovedInsertDate { get; set; }
        public DateTime? d_ApprovedUpdateDate { get; set; }
        public int? i_InsertUserMedicalAnalystId { get; set; }
        public int? i_UpdateUserMedicalAnalystId { get; set; }
        public DateTime? d_InsertDateMedicalAnalyst { get; set; }
        public DateTime? d_UpdateDateMedicalAnalyst { get; set; }
        public int? i_InsertUserTechnicalDataRegisterId { get; set; }
        public int? i_UpdateUserTechnicalDataRegisterId { get; set; }
        public DateTime? d_InsertDateTechnicalDataRegister { get; set; }
        public DateTime? d_UpdateDateTechnicalDataRegister { get; set; }
        public int? i_Iscalling_1 { get; set; }
        public int? i_AuditorInsertUserId { get; set; }
        public DateTime? d_AuditorInsertUser { get; set; }
        public int? i_AuditorUpdateUserId { get; set; }
        public DateTime? d_AuditorUpdateUser { get; set; }
        public string v_IdUnidadProductiva { get; set; }
        public decimal? d_SaldoPaciente { get; set; }
        public decimal? d_SaldoAseguradora { get; set; }
        public int? i_MedicoTratanteId { get; set; }
        public int? i_SystemUserEspecialistaId { get; set; }
        public int? i_ConCargoA { get; set; }
        public int? i_TipoDesc { get; set; }
        public string v_ComentaryUpdate { get; set; }
        public int? i_UserTypeId { get; set; }
        public int? i_IsFact { get; set; }
        public string v_Area { get; set; }
        public string v_Cargo { get; set; }
        public int? i_PayMedic { get; set; }
        public int? i_ApplicantMedic { get; set; }
        public decimal? i_Cantidad { get; set; }
        public decimal? d_Descuento { get; set; }
    }
}
