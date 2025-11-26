using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.person
{
    public class history
    {
        [ExplicitKey]
        public string v_HistoryId { get; set; }
        public string v_PersonId { get; set; }
        public DateTime? d_StartDate { get; set; }
        public DateTime? d_EndDate { get; set; }
        public string v_Organization { get; set; }
        public string v_TypeActivity { get; set; }
        public int? i_GeografixcaHeight { get; set; }
        public string v_workstation { get; set; }
        public byte[] b_RubricImage { get; set; }
        public byte[] b_FingerPrintImage { get; set; }
        public string t_RubricImageText { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public int? i_TypeOperationId { get; set; }
        public int? i_TrabajoActual { get; set; }
        public string v_FechaUltimaMamo { get; set; }
        public string v_FechaUltimoPAP { get; set; }
        public string v_ResultadoMamo { get; set; }
        public string v_ResultadosPAP { get; set; }
        public int? i_SoloAnio { get; set; }
        public string v_ActividadEmpresa { get; set; }
        public string v_ComentaryUpdate { get; set; }
    }
}
