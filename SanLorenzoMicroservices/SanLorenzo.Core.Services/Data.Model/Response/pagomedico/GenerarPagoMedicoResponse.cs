using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.pagomedico
{
    public class GenerarPagoMedicoResponse
    {
        public int PaidId { get; set; }
        public int MedicoId { get; set; }
        public float TotalPagado { get; set; }
        public int ServiciosInsertados { get; set; }
        public DateTime FechaPago { get; set; }
        public string Status { get; set; }
        public string Message { get; set; }
    }
}
