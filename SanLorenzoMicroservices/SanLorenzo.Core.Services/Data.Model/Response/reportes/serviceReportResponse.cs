using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class serviceReportResponse
    {
        public string v_PersonId { get; set; }
        public string v_ServiceId { get; set; }
        public DateTime? d_ServiceDate { get; set; }
        public int i_DiaV { get; set; }
        public int i_MesV { get; set; }
        public int i_AnioV { get; set; }
        public int i_EsoTypeId { get; set; }
        public string RUC { get; set; }
        public string AreaTrabajo { get; set; }
        public string EmpresaTrabajo { get; set; }
        public string EmpresaEmpleadora { get; set; }
        public string RubroEmpresaTrabajo { get; set; }
        public string DireccionEmpresaTrabajo { get; set; }
        public string DepartamentoEmpresaTrabajo { get; set; }
        public string ProvinciaEmpresaTrabajo { get; set; }
        public string DistritoEmpresaTrabajo { get; set; }
        public string v_CurrentOccupation { get; set; }
        public byte[] b_Logo { get; set; }
        public string EmpresaClienteId { get; set; }
        public string v_CustomerOrganizationId { get; set; }
        public string i_DocTypeId { get; set; }
        public string v_Pacient { get; set; }
        public string d_BirthDate { get; set; }
        public int i_DiaN { get; set; }
        public int i_MesN { get; set; }
        public int i_AnioN { get; set; }
        public string v_DocNumber { get; set; }
        public string v_AdressLocation { get; set; }
        public string v_EmergencyPhone { get; set; }
        public string v_ContactName { get; set; }
        public string DepartamentoPaciente { get; set; }
        public string ProvinciaPaciente { get; set; }
        public string DistritoPaciente { get; set; }
        public int i_ResidenceInWorkplaceId { get; set; }
        public string v_ResidenceTimeInWorkplace { get; set; }
        public int i_TypeOfInsuranceId { get; set; }
        public string Email { get; set; }
        public string Telefono { get; set; }
        public string EstadoCivil { get; set; }
        public string GradoInstruccion { get; set; }
        public string v_Story { get; set; }
        public int i_AptitudeStatusId { get; set; }
        public string v_GenderName { get; set; }
        public int HijosVivos { get; set; }
        public int HijosMuertos { get; set; }
        public int HijosDependientes { get; set; }
        public string v_BirthPlace { get; set; }
        public int i_PlaceWorkId { get; set; }
        public string v_ExploitedMineral { get; set; }
        public int i_AltitudeWorkId { get; set; }
        public int i_SexTypeId { get; set; }
        public int i_MaritalStatusId { get; set; }
        public int i_LevelOfId { get; set; }
        public byte[] FirmaTrabajador { get; set; }
        public byte[] HuellaTrabajador { get; set; }
        public string d_GlobalExpirationDate { get; set; }
        public byte[] FirmaDoctor { get; set; }
        public string NombreDoctor { get; set; }
        public string CMP { get; set; }
        public string d_Fur { get; set; }
        public string v_CatemenialRegime { get; set; }
        public string i_MacId { get; set; }
        public string v_Mac { get; set; }
        public string d_PAP { get; set; }
        public string d_Mamografia { get; set; }
        public string v_CiruGine { get; set; }
        public string v_Gestapara { get; set; }
        public string v_Menarquia { get; set; }
        public string v_Findings { get; set; }
        public string v_CustomerOrganizationName { get; set; }
        public int i_NroHermanos { get; set; }
        public byte[] Value5 { get; set; }
        public string Value2 { get; set; }
        public string Value3 { get; set; }
        public string v_OwnerOrganizationName { get; set; }
        public int i_HasSymptomId { get; set; }
    }
}
