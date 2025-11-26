using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class alturaEstructuralResponse
    {
        public string EmpresaCliente { get; set; }
        public string EmpresaTrabajadora { get; set; }
        public string EmpresaPropietariaDireccion { get; set; }
        public string EmpresaPropietariaEmail { get; set; }
        public string v_ComponentId { get; set; }
        public string v_ServiceId { get; set; }
        public string NombrePaciente { get; set; }
        public string Fecha { get; set; }
        public DateTime? FechaNacimiento { get; set; }
        public string PuestoTrabajo { get; set; }
        public string ServicioId { get; set; }
        public byte[] RubricaMedico { get; set; }
        public byte[] RubricaTrabajador { get; set; }
        public byte[] HuellaTrabajador { get; set; }
        public string NombreUsuarioGraba { get; set; }
        public string TipoExamen { get; set; }
        public string DNI { get; set; }
    }
}
