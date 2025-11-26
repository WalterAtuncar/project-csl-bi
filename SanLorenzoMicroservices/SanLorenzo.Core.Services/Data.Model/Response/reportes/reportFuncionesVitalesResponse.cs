using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class reportFuncionesVitalesResponse
    {
        public string v_PersonId { get; set; }
        public string v_NamePacient { get; set; }
        public string v_Surnames { get; set; }
        public string DireccionPaciente { get; set; }
        public DateTime? d_BirthDate { get; set; }
        public DateTime? d_ServiceDate { get; set; }
        public string v_ServiceId { get; set; }
        public string v_DocNumber { get; set; }
    }
}
