using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.pagomedico
{
    public class EliminarPagoMedicoRequest
    {
        public int i_PaidId { get; set; }
        public int i_UpdateUserId { get; set; }
        public string v_MotivoEliminacion { get; set; }
    }
}
