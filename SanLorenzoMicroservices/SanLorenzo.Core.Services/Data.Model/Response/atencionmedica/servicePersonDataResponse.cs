using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.atencionmedica
{
    public class servicePersonDataResponse
    {
        public string v_ServiceId { get; set; }
        public string v_ProtocolId { get; set; }
        public string v_ProtocolName { get; set; }
        public string v_PersonId { get; set; }
        public string v_FirstName { get; set; }
        public string v_FirstLastName { get; set; }
        public string v_SecondLastName { get; set; }
        public DateTime? d_BirthDate { get; set; }
        public int i_SexTypeId { get; set; }
        public int i_DocTypeId { get; set; }
        public string v_Mail { get; set; }
        public string v_ServiceStatusName { get; set; }
        public int i_AptitudeStatusId { get; set; }
        public DateTime? d_GlobalExpirationDate { get; set; }
        public DateTime? d_ObsExpirationDate { get; set; }
        public DateTime? d_ServiceDate { get; set; }
        public string v_MasterServiceName { get; set; }
        public string v_ServiceTypeName { get; set; }
        public int i_MasterServiceId { get; set; }
        public string v_GroupOcupationName { get; set; }
        public string v_EsoTypeName { get; set; }
        public int i_ServiceTypeId { get; set; }
        public string v_GenderName { get; set; }
        public string v_AdressLocation { get; set; }
        public string v_BirthPlace { get; set; }
        public string v_TelephoneNumber { get; set; }
        public int i_HasSymptomId { get; set; }
        public string v_MainSymptom { get; set; }
        public int i_TimeOfDisease { get; set; }
        public int i_TimeOfDiseaseTypeId { get; set; }
        public string v_Story { get; set; }
        public int i_DreamId { get; set; }
        public int i_UrineId { get; set; }
        public int i_DepositionId { get; set; }
        public int i_AppetiteId { get; set; }
        public int i_ThirstId { get; set; }
        public DateTime? d_Fur { get; set; }
        public string v_CatemenialRegime { get; set; }
        public int i_MacId { get; set; }
        public int i_DestinationMedicationId { get; set; }
        public int i_TransportMedicationId { get; set; }
        public int i_HasMedicalBreakId { get; set; }
        public int i_HasRestrictionId { get; set; }
        public DateTime? d_MedicalBreakStartDate { get; set; }
        public DateTime? d_MedicalBreakEndDate { get; set; }
        public DateTime? d_StartDateRestriction { get; set; }
        public DateTime? d_EndDateRestriction { get; set; }
        public string v_GeneralRecomendations { get; set; }
        public int i_IsNewControl { get; set; }
        public byte[] b_PersonImage { get; set; }
        public int i_HazInterconsultationId { get; set; }
        public DateTime? d_NextAppointment { get; set; }
        public int i_SendToTracking { get; set; }
        public string v_CurrentOccupation { get; set; }
        public DateTime? d_PAP { get; set; }
        public DateTime? d_Mamografia { get; set; }
        public string v_CiruGine { get; set; }
        public string v_Gestapara { get; set; }
        public string v_Menarquia { get; set; }
        public string v_Findings { get; set; }
        public int i_InicioEnf { get; set; }
        public int i_CursoEnf { get; set; }
        public int i_Evolucion { get; set; }
        public string v_ExaAuxResult { get; set; }
        public string v_ObsStatusService { get; set; }
        public string v_FechaUltimoPAP { get; set; }
        public string v_ResultadosPAP { get; set; }
        public string v_FechaUltimaMamo { get; set; }
        public string v_ResultadoMamo { get; set; }
        public string v_DocNumber { get; set; }
        public string v_InicioVidaSexaul { get; set; }
        public string v_NroParejasActuales { get; set; }
        public string v_NroAbortos { get; set; }
        public string v_PrecisarCausas { get; set; }
        public int i_BloodFactorId { get; set; }
        public int i_BloodGroupId { get; set; }
        public string v_Procedencia { get; set; }
        public string v_CentroEducativo { get; set; }
        public int i_LevelOfId { get; set; }
        public int i_MaritalStatusId { get; set; }
        public string v_CustomerOrganizationId { get; set; }
        public string v_EmployerOrganizationId { get; set; }
        public string v_WorkingOrganizationId { get; set; }
        public string v_EmployerOrganizationName { get; set; }
    }
}
