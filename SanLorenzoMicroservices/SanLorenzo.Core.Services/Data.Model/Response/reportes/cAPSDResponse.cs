using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class cAPSDResponse
    {
        public string v_ServiceId { get; set; }
        public string v_FirstName { get; set; }
        public string v_FirstLastName { get; set; }
        public string v_SecondLastName { get; set; }
        public byte[] b_Logo { get; set; }
        public string v_DocNumber { get; set; }
        public string v_DocTypeName { get; set; }
        public DateTime? d_BirthDate { get; set; }
        public string v_GenderName { get; set; }
        public int i_EsoTypeId_Old { get; set; }
        public string v_OccupationName { get; set; }
        public string v_OrganizationPartialName { get; set; }
        public string v_ProtocolName { get; set; }
        public int i_AptitudeStatusId { get; set; }
        public DateTime? d_ServiceDate { get; set; }
        public string v_DiseasesName { get; set; }
        public string v_DiagnosticRepositoryId { get; set; }
        public string Grupo { get; set; }
        public string Factor { get; set; }
        public byte[] g_Image { get; set; }
        public byte[] b_Photo { get; set; }
        public string v_EsoTypeName { get; set; }
        public string v_ObsStatusService { get; set; }
    }
}
