using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.pagomedico
{
    public class GetPagoMedicoCompletoByIdResponse
    {
        public PagoMedicoCompletoCabecera Cabecera { get; set; }
        public List<PagoMedicoCompletoDetalle> Detalles { get; set; }
    }
}
