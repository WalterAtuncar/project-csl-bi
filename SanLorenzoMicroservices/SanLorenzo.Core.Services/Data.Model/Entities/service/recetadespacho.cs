using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.service
{
    public class recetadespacho
    {
        [ExplicitKey]
        public int i_IdDespacho { get; set; }
        public int? i_IdReceta { get; set; }
        public decimal? d_MontoDespachado { get; set; }
        public DateTime? t_FechaDespacho { get; set; }
        public string v_ComentaryUpdate { get; set; }
    }
}
