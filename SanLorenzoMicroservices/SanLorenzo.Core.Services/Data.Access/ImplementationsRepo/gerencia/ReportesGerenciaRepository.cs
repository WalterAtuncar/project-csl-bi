using Dapper;
using Data.Model.Request.atencionmedica;
using Data.Model.Response.atencionmedica;
using Data.Model.Response.gerencia;
using Repositories.IContractsRepo.gerencia;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Access.ImplementationsRepo.gerencia
{
    public class ReportesGerenciaRepository : Repository<Data.Model.Entities.service.service>, IReportesGerenciaRepository
    {
        public ReportesGerenciaRepository(string _connectionString) : base(_connectionString)
        {
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMS(FiltroBusquedaMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard2mese", obj.FechaInicioRet2Meses);

                return connection.Query<GerenciaVentasDetalleResponse>("[dbo].[GerenciaVentasAsistencialMS_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }
    }
}
