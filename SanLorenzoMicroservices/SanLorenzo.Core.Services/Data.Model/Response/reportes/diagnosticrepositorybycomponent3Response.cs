using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class diagnosticrepositorybycomponent3Response
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
        public string v_ComponentFieldsId { get; set; }
    }
}
