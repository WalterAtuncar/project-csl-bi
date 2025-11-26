using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.pagomedico
{
    public class ListarPagosMedicosResponse
    {
        public int i_PaidId { get; set; }
        public DateTime d_PayDate { get; set; }
        public int i_MedicoTratanteId { get; set; }
        public string NombreMedico { get; set; }
        public float r_PagadoTotal { get; set; }
        public string v_Comprobante { get; set; }
        public int i_IsDeleted { get; set; }
        public int TotalServicios { get; set; }
        public string TotalFormateado { get; set; }
        public string FechaPagoFormateada { get; set; }
        public string Estado { get; set; }
    }
}
