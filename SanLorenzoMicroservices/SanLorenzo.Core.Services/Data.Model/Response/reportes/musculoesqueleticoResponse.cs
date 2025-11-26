using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class musculoesqueleticoResponse
    {
        public string v_PersonId { get; set; }
        public string v_Pacient { get; set; }
        public DateTime d_ServiceDate { get; set; }
        public string EmpresaTrabajo { get; set; }
        public string v_ServiceId { get; set; }
        public string v_ComponentId { get; set; }
        public string NombreUsuarioGraba { get; set; }
    }
}

