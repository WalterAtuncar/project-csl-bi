using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class historiaClinicaPsicologicaResponse
    {
        public string ApellidosNombres { get; set; }
        public DateTime? FechaNacimiento { get; set; }
        public string LugarNacimiento { get; set; }
        public string EstadoCivil { get; set; }
        public string GradoInstruccion { get; set; }
        public int TipoESO { get; set; }
        public string ActividadEmpresa { get; set; }
        public DateTime? FechaEvaluacion { get; set; }
        public string IdServicio { get; set; }
        public byte[] FirmaGraba { get; set; }
        public string LugarResidencia { get; set; }
        public string NombreEmpresa { get; set; }
        public string PuestoTrabajo { get; set; }
        public string AreaTrabajo { get; set; }
    }
}
