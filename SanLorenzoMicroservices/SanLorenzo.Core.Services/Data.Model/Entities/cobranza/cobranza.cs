using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.cobranza
{
    public class cobranza
    {
        [ExplicitKey]
        public string v_IdCobranza { get; set; }
        public string v_Periodo { get; set; }
        public int? i_IdEstablecimiento { get; set; }
        public int? i_IdTipoDocumento { get; set; }
        public string v_Mes { get; set; }
        public string v_Correlativo { get; set; }
        public int? i_TipoMovimiento { get; set; }
        public DateTime? t_FechaRegistro { get; set; }
        public decimal? d_TipoCambio { get; set; }
        public int? i_IdMedioPago { get; set; }
        public string v_Nombre { get; set; }
        public string v_Glosa { get; set; }
        public int? i_IdMoneda { get; set; }
        public int? i_IdEstado { get; set; }
        public decimal? d_TotalSoles { get; set; }
        public decimal? d_TotalDolares { get; set; }
        public int? i_Eliminado { get; set; }
        public int? i_InsertaIdUsuario { get; set; }
        public DateTime? t_InsertaFecha { get; set; }
        public int? i_ActualizaIdUsuario { get; set; }
        public DateTime? t_ActualizaFecha { get; set; }
        public string v_MotivoEliminacion { get; set; }
    }
}
