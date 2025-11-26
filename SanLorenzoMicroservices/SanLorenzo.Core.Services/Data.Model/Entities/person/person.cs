using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.person
{
    public class person
    {
        [ExplicitKey]
        public string v_PersonId { get; set; }
        public string v_FirstName { get; set; }
        public string v_FirstLastName { get; set; }
        public string v_SecondLastName { get; set; }
        public int? i_DocTypeId { get; set; }
        public string v_DocNumber { get; set; }
        public DateTime? d_Birthdate { get; set; }
        public string v_BirthPlace { get; set; }
        public int? i_SexTypeId { get; set; }
        public int? i_MaritalStatusId { get; set; }
        public int? i_LevelOfId { get; set; }
        public string v_TelephoneNumber { get; set; }
        public string v_AdressLocation { get; set; }
        public string v_GeografyLocationId { get; set; }
        public string v_ContactName { get; set; }
        public string v_EmergencyPhone { get; set; }
        public byte[] b_PersonImage { get; set; }
        public string v_Mail { get; set; }
        public int? i_BloodGroupId { get; set; }
        public int? i_BloodFactorId { get; set; }
        public byte[] b_FingerPrintTemplate { get; set; }
        public byte[] b_RubricImage { get; set; }
        public byte[] b_FingerPrintImage { get; set; }
        public string t_RubricImageText { get; set; }
        public string v_CurrentOccupation { get; set; }
        public int? i_DepartmentId { get; set; }
        public int? i_ProvinceId { get; set; }
        public int? i_DistrictId { get; set; }
        public int? i_ResidenceInWorkplaceId { get; set; }
        public string v_ResidenceTimeInWorkplace { get; set; }
        public int? i_TypeOfInsuranceId { get; set; }
        public int? i_NumberLivingChildren { get; set; }
        public int? i_NumberDependentChildren { get; set; }
        public int? i_OccupationTypeId { get; set; }
        public string v_OwnerName { get; set; }
        public int? i_NumberLiveChildren { get; set; }
        public int? i_NumberDeadChildren { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public int? i_InsertNodeId { get; set; }
        public int? i_UpdateNodeId { get; set; }
        public int? i_Relationship { get; set; }
        public string v_ExploitedMineral { get; set; }
        public int? i_AltitudeWorkId { get; set; }
        public int? i_PlaceWorkId { get; set; }
        public string v_NroPoliza { get; set; }
        public decimal? v_Deducible { get; set; }
        public int? i_NroHermanos { get; set; }
        public string v_Password { get; set; }
        public string v_Procedencia { get; set; }
        public string v_CentroEducativo { get; set; }
        public string v_Religion { get; set; }
        public string v_Nacionalidad { get; set; }
        public string v_ResidenciaAnterior { get; set; }
        public string v_Subs { get; set; }
        public string v_ComentaryUpdate { get; set; }
        public string v_PhoneContac { get; set; }
        public int? i_Marketing { get; set; }
        public string v_ProtocolId { get; set; }
        public DateTime? d_ExpirationDate { get; set; }
        public int? i_TotalAtenciones { get; set; }
        public int? i_CountAtenciones { get; set; }
        public int? i_EtniaRaza { get; set; }
        public int? i_Migrante { get; set; }
        public string v_Migrante { get; set; }
    }
}
