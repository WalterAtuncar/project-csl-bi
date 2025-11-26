using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.hospitalizacion
{
    public class hospitalizacion
    {
        [ExplicitKey]
        public string v_HopitalizacionId { get; set; }
        public string v_PersonId { get; set; }
        public DateTime? d_FechaIngreso { get; set; }
        public DateTime? d_FechaAlta { get; set; }
        public string v_Comentario { get; set; }
        public string v_NroLiquidacion { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public decimal? d_PagoMedico { get; set; }
        public int? i_MedicoPago { get; set; }
        public decimal? d_PagoPaciente { get; set; }
        public int? i_PacientePago { get; set; }
        public string v_ComentaryUpdate { get; set; }
        public string v_DiseasesName { get; set; }
        public string v_CIE10Id { get; set; }
        public string v_ProcedenciaPac { get; set; }
        public string v_Comprobantes { get; set; }
        public decimal? d_MontoPagado { get; set; }
        public int? i_PasoSop { get; set; }
        public int? i_PasoHosp { get; set; }
        public string v_DiseasesNameSalida { get; set; }
        public string v_CIE10IdSalida { get; set; }
        public string v_FechaHoraInicioSop { get; set; }
        public string v_FechaHoraFinSop { get; set; }
        public DateTime? d_FechaHoraInicioSop { get; set; }
        public DateTime? d_FechaHoraFinSop { get; set; }
        public int? i_TramaHosp { get; set; }
        public int? i_TramaSop { get; set; }
    }
}
