using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.gerencia
{
    public class PagoMedicoCabecera
    {
        public int? medicoId { get; set; }
        public string nombreMedico { get; set; }
        public string especialidadMedico { get; set; }
        public int totalServiciosGenerados { get; set; }
        public string primerServicio { get; set; }
        public string ultimoServicio { get; set; }
        public string fechaInicio { get; set; }
        public string fechaFin { get; set; }
        public string fechaCalculo { get; set; }
        public IEnumerable<PagoMedicoPorConsultorioResponse> detalles { get; set; }
    }
}
