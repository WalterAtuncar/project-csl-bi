using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class serviceShortResponse
    {
        public string Empresa { get; set; }
        public string Contract { get; set; }
        public string Paciente { get; set; }
        public DateTime? FechaServicio { get; set; }
        public string DNI { get; set; }
        public string Servicio { get; set; }
    }
}
