using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.pagomedico
{
    public class ListarPagosMedicosRequest
    {
        public int? i_MedicoTratanteId { get; set; }
        public DateTime? d_FechaInicio { get; set; }
        public DateTime? d_FechaFin { get; set; }
        public bool i_IncludeDeleted { get; set; } = false;
    }
}
