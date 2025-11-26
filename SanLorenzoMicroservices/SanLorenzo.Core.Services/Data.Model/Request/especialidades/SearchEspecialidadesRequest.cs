using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.especialidades
{
    public class SearchEspecialidadesRequest
    {
        public string? Filtro { get; set; }
        public decimal? PorcentajeMin { get; set; }
        public decimal? PorcentajeMax { get; set; }
        public bool IncludeDeleted { get; set; } = false;
    }
}
