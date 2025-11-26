using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class reportConsentimientoResponse
    {
        public string NombreTrabajador { get; set; }
        public string NroDocumento { get; set; }
        public string Ocupacion { get; set; }
        public string Contratista { get; set; }
        public byte[] FirmaTrabajador { get; set; }
        public byte[] HuellaTrabajador { get; set; }
        public string LugarProcedencia { get; set; }
        public string v_AdressLocation { get; set; }
        public DateTime? d_ServiceDate { get; set; }
        public string EmpresaPropietaria { get; set; }
        public string Empresa { get; set; }
        public string EmpresaPropietariaDireccion { get; set; }
        public string EmpresaPropietariaEmail { get; set; }
    }
}
