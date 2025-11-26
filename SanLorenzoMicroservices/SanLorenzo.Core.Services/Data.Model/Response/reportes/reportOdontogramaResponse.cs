using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class reportOdontogramaResponse
    {
        public string IdServicio { get; set; }
        public string Trabajador { get; set; }
        public DateTime? Fecha { get; set; }
        public string Puesto { get; set; }
        public string Ficha { get; set; }
        public byte[] FirmaMedico { get; set; }
        public DateTime? FechaCumpleaos { get; set; }
        public string Corona { get; set; }
        public string EmpresaPropietaria { get; set; }
        public string Empresa { get; set; }
        public string EmpresaPropietariaEmail { get; set; }
        public string EmpresaPropietariaDireccion { get; set; }
        public string NombreUsuarioGraba { get; set; }
    }
}
