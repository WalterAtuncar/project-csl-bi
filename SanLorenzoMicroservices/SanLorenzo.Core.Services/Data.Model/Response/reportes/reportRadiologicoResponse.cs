using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class reportRadiologicoResponse
    {
        public string v_ServiceId { get; set; }
        public string Paciente { get; set; }
        public string ExamenSolicitado { get; set; }
        public string Empresa { get; set; }
        public DateTime? Fecha { get; set; }
        public byte[] FirmaTecnologo { get; set; }
        public byte[] FirmaMedicoEva { get; set; }
        public DateTime? d_BirthDate { get; set; }
        public string NombreUsuarioGraba { get; set; }
    }
}
