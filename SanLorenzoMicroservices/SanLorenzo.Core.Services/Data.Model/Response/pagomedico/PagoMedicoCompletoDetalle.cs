using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.pagomedico
{
    public class PagoMedicoCompletoDetalle
    {
        public int i_PaidDetailId { get; set; }
        public int i_PaidId { get; set; }
        public string v_ServiceComponentId { get; set; }
        public float r_Price { get; set; }
        public float r_Porcentaje { get; set; }
        public float r_Pagado { get; set; }
        public DateTime d_ServiceDate { get; set; }
        public string Paciente { get; set; }
        public string v_ComprobantePago { get; set; }
        public string PrecioFormateado { get; set; }
        public string PagadoFormateado { get; set; }
        public string FechaServicioFormateada { get; set; }
        public int NumeroLinea { get; set; }
    }
}
