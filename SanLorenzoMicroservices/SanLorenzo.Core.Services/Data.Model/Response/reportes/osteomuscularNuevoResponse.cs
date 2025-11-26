using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class osteomuscularNuevoResponse
    {
        public string IdServicio { get; set; }
        public string NOMBRE_PACIENTE { get; set; }
        public string PUESTO_TRABAJO { get; set; }
        public string EMPRESA_CLIENTE { get; set; }
        public DateTime? FechaNacimiento { get; set; }
        public int i_SEXO { get; set; }
        public string NroDNI { get; set; }
        public int TIPOESO { get; set; }
        public byte[] FirmaGraba { get; set; }
        public byte[] FirmaTrabajador { get; set; }
        public byte[] HuellaTrabajadr { get; set; }
        public DateTime? FECHA_SERVICIO { get; set; }
    }
}
