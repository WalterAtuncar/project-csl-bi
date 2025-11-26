using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class reportCuestionarioNordicoResponse
    {
        public string Nombre_Trabajador { get; set; }
        public DateTime? FechaNacimiento { get; set; }
        public int Genero { get; set; }
        public byte[] FirmaTrabajador { get; set; }
        public byte[] HuellaTrabajador { get; set; }
        public string NombreUsuarioGraba { get; set; }
        public byte[] LOGOCLIENTE { get; set; }
    }
}
