using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class reportToxicologicoResponse
    {
        public string ServiceId { get; set; }
        public string Fecha { get; set; }
        public DateTime FechaNacimiento { get; set; }
        public string Trabajador { get; set; }
        public string Dni { get; set; }
        public string EmpresaTrabajador { get; set; }
        public byte[] FirmaMedico { get; set; }
        public byte[] FirmaTrabajador { get; set; }
        public byte[] HuellaTrabajador { get; set; }
        public string Puesto { get; set; }
        public string NOMBRE_EMPRESA_CLIENTE { get; set; }
    }
}
