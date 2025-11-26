using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.pagomedico
{
    public class PagoMedicoCompletoRequest
    {
        public int i_MedicoTratanteId { get; set; }
        public int i_Consultorio { get; set; }
        public DateTime d_FechaInicio { get; set; }
        public DateTime d_FechaFin { get; set; }
    }
}