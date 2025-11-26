using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.hospitalizacion
{
    public class hospitalizacionhabitacion
    {
        [ExplicitKey]
        public string v_HospitalizacionHabitacionId { get; set; }
        public string v_HopitalizacionId { get; set; }
        public int? i_HabitacionId { get; set; }
        public DateTime? d_StartDate { get; set; }
        public DateTime? d_EndDate { get; set; }
        public decimal? d_Precio { get; set; }
        public int? i_ConCargoA { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public decimal? d_SaldoPaciente { get; set; }
        public decimal? d_SaldoAseguradora { get; set; }
        public string v_ComentaryUpdate { get; set; }
        public int? i_EstateRoom { get; set; }
    }
}
