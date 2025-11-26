using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.atencionmedica
{
    public class ServiceFilter
    {
        public DateTime? BeginDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string SortExpression { get; set; }
        public string FilterExpression { get; set; }
        public bool? IsReducedSearch { get; set; }
        public int? ServiceTypeId { get; set; }
        public int? MasterServiceId { get; set; }
        public string PacientText { get; set; }
        public string ServiceIdText { get; set; }
        public int? ServiceStatusId { get; set; }
        public int? EsoTypeId { get; set; }
        //public string DiagnosticText { get; set; }
        //public bool? IsBilling { get; set; }
        public string CustomerOrganization { get; set; }
        public int? AptitudeStatusId { get; set; }
        public int? HistoryGenerated { get; set; }
        public string Consultorio { get; set; }
        public string ConsultorioStatus { get; set; }
        public int? UserMed { get; set; }
        public string CustomerOrganizationFact { get; set; }

       

    }
}
