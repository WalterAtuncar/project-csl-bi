using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class pacientreportepsResponse
    {
        public string empresa_ { get; set; }
        public string contrata { get; set; }
        public string subcontrata { get; set; }
        public int TimeOfDisease { get; set; }
        public string v_ObsStatusService { get; set; }
        public string TiempoEnfermedad { get; set; }
        public string InicioEnfermedad { get; set; }
        public string CursoEnfermedad { get; set; }
        public string v_CurrentOccupation { get; set; }
        public string v_PersonId { get; set; }
        public string v_FirstName { get; set; }
        public string v_FirstLastName { get; set; }
        public string v_SecondLastName { get; set; }
        public byte[] b_Photo { get; set; }
        public string v_TypeOfInsuranceName { get; set; }
        public string v_FullWorkingOrganizationName { get; set; }
        public string v_OrganitationName { get; set; }
        public string v_RelationshipName { get; set; }
        public string v_OwnerName { get; set; }
        public DateTime? d_ServiceDate { get; set; }
        public DateTime? d_Birthdate { get; set; }
        public int i_SexTypeId { get; set; }
        public int i_DocTypeId { get; set; }
        public int i_NumberDependentChildren { get; set; }
        public int i_NumberLivingChildren { get; set; }
        public byte[] FirmaTrabajador { get; set; }
        public byte[] HuellaTrabajador { get; set; }
        public string v_BloodGroupName { get; set; }
        public string v_BloodFactorName { get; set; }
        public string v_SexTypeName { get; set; }
        public string v_TipoExamen { get; set; }
        public string v_NombreProtocolo { get; set; }
        public string i_EsoTypeId { get; set; }
        public string v_DocNumber { get; set; }
        public string v_IdService { get; set; }
        public string v_ExploitedMineral { get; set; }
        public string v_Story { get; set; }
        public string v_MainSymptom { get; set; }
        public byte[] FirmaDoctor { get; set; }
        public string v_ExaAuxResult { get; set; }
        public byte[] FirmaDoctorAuditor { get; set; }
        public string GESO { get; set; }
        public int i_AptitudeStatusId { get; set; }
        public string v_MaritalStatus { get; set; }
        public string EmpresaClienteId { get; set; }
        public byte[] logoCliente { get; set; }
        public string v_OwnerOrganizationName { get; set; }
        public string v_DoctorPhysicalExamName { get; set; }
        public int i_Age { get; set; }
        public string RUCEmpresa { get; set; }
        public string SedeEmpresa { get; set; }
        public string RUCcontrata { get; set; }
        public string SedeContrara { get; set; }
        public string RUCsubcontrata { get; set; }
        public string SedeSubContrara { get; set; }
        public int TiposervicioServicio { get; set; }
        public int Servicio { get; set; }
        public string Licencia { get; set; }
        public int ModalidadTrabajo { get; set; }
        public string Value1 { get; set; }
    }
}
