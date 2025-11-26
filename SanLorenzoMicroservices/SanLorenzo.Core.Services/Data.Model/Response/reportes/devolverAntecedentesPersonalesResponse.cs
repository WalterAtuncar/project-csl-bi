using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class devolverAntecedentesPersonalesResponse
    {
        public string v_DiseasesName { get; set; }
        public string v_DiagnosticDetail { get; set; }
        public string v_DiseasesId { get; set; }
        public DateTime? d_StartDate { get; set; }
    }
}
