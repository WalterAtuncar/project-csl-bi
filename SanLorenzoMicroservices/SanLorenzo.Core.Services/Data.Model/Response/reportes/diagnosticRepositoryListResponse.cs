using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class diagnosticRepositoryListResponse
    {
        public string v_DiagnosticRepositoryId { get; set; }
        public string v_ServiceId { get; set; }
        public string v_DiseasesId { get; set; }
        public int i_AutoManualId { get; set; }
        public int i_PreQualificationId { get; set; }
        public int i_FinalQualificationId { get; set; }
        public int i_DiagnosticTypeId { get; set; }
        public DateTime? d_ExpirationDateDiagnostic { get; set; }
        public string v_DiseasesName { get; set; }
        public string v_CreationUser { get; set; }
        public string v_UpdateUser { get; set; }
        public DateTime d_CreationDate { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public int i_IsDeleted { get; set; }
        public string v_ProtocolId { get; set; }
        public string v_ProtocolName { get; set; }
        public string v_PersonId { get; set; }
        public DateTime d_BirthDate { get; set; }
        public string v_EsoTypeName { get; set; }
        public string v_LocationName { get; set; }      
        public string v_FirstName { get; set; }
        public string v_FirstLastName { get; set; }
        public string v_SecondLastName { get; set; }
        public string v_DocNumber { get; set; }
        public string v_GenderName { get; set; }
        public string v_AptitudeStatusName { get; set; }
        public string v_OccupationName { get; set; }
        public byte[] g_Image { get; set; }
        public DateTime d_ServiceDate { get; set; }
        public int i_AptitudeStatusId { get; set; }
        public int i_EsoTypeId_Old { get; set; }
        public string v_ObsStatusService { get; set; }
        public byte[] b_Photo { get; set; }
        public string GrupoFactorSanguineo { get; set; }
        public DateTime d_FechaExpiracionServicio { get; set; }
        public string v_Cie10 { get; set; }
        public string v_OrganizationPartialName { get; set; }
        public string EmpresaPropietaria { get; set; }
        public string EmpresaPropietariaDireccion { get; set; }
        public string EmpresaPropietariaEmail { get; set; }
    }
}
