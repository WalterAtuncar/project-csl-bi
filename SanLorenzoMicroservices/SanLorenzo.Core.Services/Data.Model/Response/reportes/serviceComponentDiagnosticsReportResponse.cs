using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class serviceComponentDiagnosticsReportResponse
    {
        public string v_DiagnosticRepositoryId { get; set; }
        public string v_ServiceId { get; set; }

        public string v_ComponentId { get; set; }

        public string v_DiseasesId { get; set; }

        public string v_DiseasesName { get; set; }

    }
}
