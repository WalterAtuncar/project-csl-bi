using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class reportHistoriaOcupacionalResponse
    {
        public string IdHistory { get; set; }
        public string Trabajador { get; set; }
        public string IdServicio { get; set; }
        public DateTime? FNacimiento { get; set; }
        public int Genero { get; set; }
        public string LugarNacimiento { get; set; }
        public string LugarProcedencia { get; set; }
        public string Puesto { get; set; }
        public string FechaInicio { get; set; }
        public DateTime? FechaFin { get; set; }
        public string Empresa { get; set; }
        public string ActividadEmpresa { get; set; }
        public int Altitud { get; set; }
        public string AreaTrabajo { get; set; }
        public string PuestoTrabajo { get; set; }
        public int IdTipoOperacion { get; set; }
        public int Dia { get; set; }
        public int Mes { get; set; }
        public int Anio { get; set; }
        public byte[] FirmaMedico { get; set; }
        public byte[] FirmaTrabajador { get; set; }
        public byte[] HuellaTrabajador { get; set; }
        public byte[] FirmaAuditor { get; set; }
        public byte[] b_Logo_Cliente { get; set; }
    }
}
