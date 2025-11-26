using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class reportInformeRadiograficoResponse
    {
        public string Nombre { get; set; }
        public DateTime? FechaNacimiento { get; set; }
        public DateTime? d_ServiceDate { get; set; }
        public string v_ServiceId { get; set; }
        public byte[] FirmaMedico { get; set; }
        public string v_ServiceComponentId { get; set; }
        public string Lector { get; set; }
        public string Hcl { get; set; }
        public byte[] FirmaTecnologo { get; set; }
        public string DNI { get; set; }
        public string NombreUsuarioGraba { get; set; }
    }
}
