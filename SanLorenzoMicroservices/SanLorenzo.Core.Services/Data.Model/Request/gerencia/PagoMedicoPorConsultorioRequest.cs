using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.gerencia
{
    public class PagoMedicoPorConsultorioRequest
    {
        public int ConsultorioId { get; set; }
        public string FechaInicio { get; set; }
        public string FechaFin { get; set; }
    }
}
