using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class pacientReportEpsFirmamedicoOcupacionalResponse
    {
        public int TimeOfDisease { get; set; }
        public string v_CurrentOccupation { get; set; }
        public string TiempoEnfermedad { get; set; }
        public string InicioEnfermedad { get; set; }
        public string CursoEnfermedad { get; set; }
        public string v_PersonId { get; set; }
        public string v_FirstName { get; set; }
        public string v_FirstLastName { get; set; }
        public string v_SecondLastName { get; set; }
        public byte[] b_Photo { get; set; }
        public string v_TypeOfInsuranceName { get; set; }
        public string v_FullWorkingOrganizationName { get; set; }
        public string v_RelationshipName { get; set; }
        public string v_OwnerName { get; set; }
        public DateTime? d_ServiceDate { get; set; }
        public DateTime? d_Birthdate { get; set; }
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
        public string v_DocNumber { get; set; }
        public string v_IdService { get; set; }
        public string v_Story { get; set; }
        public string v_MainSymptom { get; set; }
        public byte[] FirmaDoctor { get; set; }
        public string v_ExaAuxResult { get; set; }
        public string NombreDoctor { get; set; }
        public string CMP { get; set; }
    }
}
