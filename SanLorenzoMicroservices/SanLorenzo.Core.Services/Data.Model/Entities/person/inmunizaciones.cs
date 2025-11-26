using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.person
{
    public class inmunizaciones
    {
        [ExplicitKey]
        public string v_VacunacionId { get; set; }
        public string v_PersonId { get; set; }
        public int? i_TipoVacuna { get; set; }
        public int? i_Marca { get; set; }
        public string v_Lote { get; set; }
        public DateTime? d_FechaVacuna { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public string v_ComentaryUpdate { get; set; }
        public int? i_Dosis { get; set; }
        public string v_Lugar { get; set; }
    }
}
