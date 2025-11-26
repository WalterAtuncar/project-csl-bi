using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class servicerecommendationbydiagnosticrepositoryidreportResponse
    {
        public int i_Item { get; set; }
        public string v_RecommendationId { get; set; }
        public string v_DiagnosticRepositoryId { get; set; }
        public string v_ServiceId { get; set; }
        public string v_ComponentId { get; set; }
        public string v_MasterRecommendationId { get; set; }
        public string v_RecommendationName { get; set; }


    }
}
