using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class antecedentesMedicosResponse
    {
        public DateTime? Fecha { get; set; }
        public string Diagnostico { get; set; }
        public string Tratamiento { get; set; }
        public string Comentarios { get; set; }
        public string CIE10 { get; set; }
        public string LugarTto { get; set; }
    }
}
