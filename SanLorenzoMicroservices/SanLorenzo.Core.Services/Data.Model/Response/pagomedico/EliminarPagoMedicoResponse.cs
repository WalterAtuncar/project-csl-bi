using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.pagomedico
{
    public class EliminarPagoMedicoResponse
    {
        public int PaidId { get; set; }
        public int ServiciosEliminados { get; set; }
        public float MontoEliminado { get; set; }
        public string Status { get; set; }
        public string Message { get; set; }
    }
}
