using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.Model.Request.atencionmedica;
using Data.Model.Response.cobranza;
using Data.Model.Response.gerencia;

namespace Business.Logic.IContractsBL.gerencia
{
    public interface IReportesGerenciaLogic
    {
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMS(FiltroBusquedaMSRequest obj);
    }
}
