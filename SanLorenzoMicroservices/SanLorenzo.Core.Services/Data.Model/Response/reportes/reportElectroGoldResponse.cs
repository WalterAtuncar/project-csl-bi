using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class reportElectroGoldResponse
    {
        public string NroFicha { get; set; }
        public int TipoESO { get; set; }
        public string NroHistoria { get; set; }
        public string DatosPaciente { get; set; }
        public DateTime? FechaNacimiento { get; set; }
        public string Genero { get; set; }
        public byte[] FirmaMedico { get; set; }
        public byte[] FirmaTecnico { get; set; }
        public DateTime? Fecha { get; set; }
        public string Empresa { get; set; }
        public string Puesto { get; set; }
        public string NombreDoctor { get; set; }
        public string NombreTecnologo { get; set; }
        public string NombreUsuarioGraba { get; set; }
        public byte[] b_Imagen { get; set; }
        public byte[] HuellaPaciente { get; set; }
        public byte[] FirmaPaciente { get; set; }
    }
}
