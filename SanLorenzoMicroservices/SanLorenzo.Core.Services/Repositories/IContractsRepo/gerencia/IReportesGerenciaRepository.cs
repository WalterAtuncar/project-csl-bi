using Data.Model.Request.atencionmedica;
using Data.Model.Response.gerencia;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Repositories.IContractsRepo.gerencia
{
    public interface IReportesGerenciaRepository : IRepository<Data.Model.Entities.service.service>
    {
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMS(FiltroBusquedaMSRequest obj);
    }
}
