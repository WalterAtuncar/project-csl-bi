using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.pagomedico
{
    public class GenerarPagoMedicoRequest
    {
        public int i_MedicoTratanteId { get; set; }
        public DateTime d_FechaInicio { get; set; }
        public DateTime d_FechaFin { get; set; }
        public float r_PagadoTotal { get; set; }
        public string v_Comprobante { get; set; }
        public int i_InsertUserId { get; set; }
        public List<ServicesPaidDetailRequest> ServicesDetails { get; set; }
    }
    public class ServicesPaidDetailRequest
    {
        public string v_ServiceId { get; set; }
        public float r_Price { get; set; }
        public float r_Porcentaje { get; set; }
        public float r_Pagado { get; set; }
    }
}
