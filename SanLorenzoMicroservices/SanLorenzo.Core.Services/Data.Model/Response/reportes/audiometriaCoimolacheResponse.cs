using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class audiometriaCoimolacheResponse
    {
        public DateTime? FECHA { get; set; }
        public string EMP_CLIENTE { get; set; }
        public string EMP_CONTRATISTA { get; set; }
        public string NOMBRE_PACIENTE { get; set; }
        public string GENERO { get; set; }
        public string PUESTO { get; set; }
        public DateTime? FECHA_NACIMIENTO { get; set; }
        public byte[] FIRMA_TECNICO { get; set; }
        public byte[] FIRMA_MEDICO { get; set; }
        public byte[] FIRMA_PACIENTE { get; set; }
        public byte[] Huella_PACIENTE { get; set; }
    }
}
