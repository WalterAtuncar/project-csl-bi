using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class reportCuestionarioEspirometriaResponse
    {
        public string IdServicio { get; set; }
        public string ServiceComponentId { get; set; }
        public DateTime? Fecha { get; set; }
        public string NombreTrabajador { get; set; }
        public DateTime? FechaNacimineto { get; set; }
        public int Genero { get; set; }
        public byte[] FirmaTrabajador { get; set; }
        public byte[] HuellaTrabajador { get; set; }
        public byte[] b_File { get; set; }
        public string NombreUsuarioGraba { get; set; }
        public string Dni { get; set; }
        public string TipoExamen { get; set; }
        public int TipoEso { get; set; }
        public string RazonSocial { get; set; }
        public string ActividadEconomica { get; set; }
        public string PuestoTrabajo { get; set; }
        public byte[] LogoCliente { get; set; }
        public string EmpresaCliente { get; set; }
        public string EmpresaContratista { get; set; }
        public string EmpresaPropietaria { get; set; }
        public string EmpresaPropietariaDireccion { get; set; }
    }
}
