using Dapper;
using Data.Model.Request.pagomedico;
using Data.Model.Response.pagomedico;
using Repositories.IContractsRepo.pagomedico;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Access.ImplementationsRepo.pagomedico
{
    public class PagoMedicosRepository : Repository<GenerarPagoMedicoRequest>, IPagoMedicosRepository
    {
        public PagoMedicosRepository(string _connectionString) : base(_connectionString)
        {
        }

        /// <summary>
        /// Ajusta las fechas para establecer las horas correctas:
        /// Fecha Inicio: 00:00:01
        /// Fecha Fin: 23:59:59
        /// </summary>
        private (DateTime fechaInicio, DateTime fechaFin) AjustarFechas(DateTime fechaInicio, DateTime fechaFin)
        {
            var fechaInicioAjustada = new DateTime(fechaInicio.Year, fechaInicio.Month, fechaInicio.Day, 0, 0, 1);
            var fechaFinAjustada = new DateTime(fechaFin.Year, fechaFin.Month, fechaFin.Day, 23, 59, 59);
            
            return (fechaInicioAjustada, fechaFinAjustada);
        }

        /// <summary>
        /// Ajusta las fechas opcionales para establecer las horas correctas:
        /// Fecha Inicio: 00:00:01 (solo si tiene valor)
        /// Fecha Fin: 23:59:59 (solo si tiene valor)
        /// </summary>
        private (DateTime? fechaInicio, DateTime? fechaFin) AjustarFechasOpcionales(DateTime? fechaInicio, DateTime? fechaFin)
        {
            DateTime? fechaInicioAjustada = null;
            DateTime? fechaFinAjustada = null;

            if (fechaInicio.HasValue)
            {
                fechaInicioAjustada = new DateTime(fechaInicio.Value.Year, fechaInicio.Value.Month, fechaInicio.Value.Day, 0, 0, 1);
            }

            if (fechaFin.HasValue)
            {
                fechaFinAjustada = new DateTime(fechaFin.Value.Year, fechaFin.Value.Month, fechaFin.Value.Day, 23, 59, 59);
            }
            
            return (fechaInicioAjustada, fechaFinAjustada);
        }

        public GenerarPagoMedicoResponse GenerarPagoMedicoCompleto(GenerarPagoMedicoRequest request)
        {
            try
            {
                using (var connection = new SqlConnection(_connectionString))
                {
                    connection.Open();

                    // Crear la tabla temporal para el Type
                    var servicesDetailsTable = new DataTable();
                    servicesDetailsTable.Columns.Add("v_ServiceComponentId", typeof(string));
                    servicesDetailsTable.Columns.Add("r_Price", typeof(float));
                    servicesDetailsTable.Columns.Add("r_Porcentaje", typeof(float));
                    servicesDetailsTable.Columns.Add("r_Pagado", typeof(float));

                    // Llenar la tabla con los datos del request
                    foreach (var detail in request.ServicesDetails)
                    {
                        servicesDetailsTable.Rows.Add(
                            detail.v_ServiceId,
                            detail.r_Price.HasValue ? (object)detail.r_Price.Value : DBNull.Value,
                            detail.r_Porcentaje.HasValue ? (object)detail.r_Porcentaje.Value : DBNull.Value,
                            detail.r_Pagado.HasValue ? (object)detail.r_Pagado.Value : DBNull.Value
                        );
                    }

                    // Ajustar fechas automáticamente
                    var (fechaInicioAjustada, fechaFinAjustada) = AjustarFechas(request.d_FechaInicio, request.d_FechaFin);

                    var parameters = new DynamicParameters();
                    parameters.Add("@i_MedicoTratanteId", request.i_MedicoTratanteId);
                    parameters.Add("@d_FechaInicio", fechaInicioAjustada);
                    parameters.Add("@d_FechaFin", fechaFinAjustada);
                    parameters.Add("@r_PagadoTotal", request.r_PagadoTotal);
                    parameters.Add("@v_Comprobante", request.v_Comprobante);
                    parameters.Add("@i_InsertUserId", request.i_InsertUserId);
                    parameters.Add("@ServicesDetails", servicesDetailsTable.AsTableValuedParameter("ServicesPaidDetailsType"));

                    return connection.Query<GenerarPagoMedicoResponse>("[dbo].[sp_GenerarPagoMedicoCompleto]", 
                        parameters, commandType: CommandType.StoredProcedure).FirstOrDefault();
                }
            }
            catch (SqlException e)
            {
                throw new Exception(e.Message);
            }
            catch (Exception e)
            {
                throw new Exception(e.Message);
            }
        }

        public EliminarPagoMedicoResponse EliminarPagoMedicoCompleto(EliminarPagoMedicoRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@i_PaidId", request.i_PaidId);
                parameters.Add("@i_UpdateUserId", request.i_UpdateUserId);
                parameters.Add("@v_MotivoEliminacion", request.v_MotivoEliminacion);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<EliminarPagoMedicoResponse>("[dbo].[sp_EliminarPagoMedicoCompleto]", 
                        parameters, commandType: CommandType.StoredProcedure).FirstOrDefault();
                }
            }
            catch (SqlException e)
            {
                throw new Exception(e.Message);
            }
            catch (Exception e)
            {
                throw new Exception(e.Message);
            }
        }

        public GetPagoMedicoCompletoByIdResponse GetPagoMedicoCompletoById(GetPagoMedicoByIdRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@i_PaidId", request.i_PaidId);

                using (var connection = new SqlConnection(_connectionString))
                {
                    using (var multi = connection.QueryMultiple("[dbo].[sp_GetPagoMedicoCompletoById]", 
                        parameters, commandType: CommandType.StoredProcedure))
                    {
                        var cabecera = multi.Read<PagoMedicoCompletoCabecera>().FirstOrDefault();
                        var detalles = multi.Read<PagoMedicoCompletoDetalle>().ToList();

                        return new GetPagoMedicoCompletoByIdResponse
                        {
                            Cabecera = cabecera,
                            Detalles = detalles
                        };
                    }
                }
            }
            catch (SqlException e)
            {
                throw new Exception(e.Message);
            }
            catch (Exception e)
            {
                throw new Exception(e.Message);
            }
        }

        public List<ListarPagosMedicosResponse> ListarPagosMedicos(ListarPagosMedicosRequest request)
        {
            try
            {
                // Ajustar fechas automáticamente (solo si tienen valor)
                var (fechaInicioAjustada, fechaFinAjustada) = AjustarFechasOpcionales(request.d_FechaInicio, request.d_FechaFin);

                var parameters = new DynamicParameters();
                parameters.Add("@i_MedicoTratanteId", request.i_MedicoTratanteId);
                parameters.Add("@d_FechaInicio", fechaInicioAjustada);
                parameters.Add("@d_FechaFin", fechaFinAjustada);
                parameters.Add("@i_IncludeDeleted", request.i_IncludeDeleted);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<ListarPagosMedicosResponse>("[dbo].[sp_ListarPagosMedicos]", 
                        parameters, commandType: CommandType.StoredProcedure).ToList();
                }
            }
            catch (SqlException e)
            {
                throw new Exception(e.Message);
            }
            catch (Exception e)
            {
                throw new Exception(e.Message);
            }
        }

        public PagoMedicoCompletoResponse PagoMedicoCompleto(PagoMedicoCompletoRequest request)
        {
            try
            {
                // Ajustar fechas automáticamente
                var (fechaInicioAjustada, fechaFinAjustada) = AjustarFechas(request.d_FechaInicio, request.d_FechaFin);

                var parameters = new DynamicParameters();
                parameters.Add("@i_Consultorio", request.i_Consultorio);
                parameters.Add("@d_FechaInicio", fechaInicioAjustada);
                parameters.Add("@d_FechaFin", fechaFinAjustada);

                using (var connection = new SqlConnection(_connectionString))
                {
                    using (var multi = connection.QueryMultiple("[dbo].[sp_PagoMedicoPorConsultorioCompleto]", 
                        parameters, commandType: CommandType.StoredProcedure))
                    {
                        var cabecera = multi.Read<PagoMedicoCabecera>().ToList();
                        var detalles = multi.Read<PagoMedicoDetalle>().ToList();

                        return new PagoMedicoCompletoResponse
                        {
                            Cabecera = cabecera,
                            Detalles = detalles
                        };
                    }
                }
            }
            catch (SqlException e)
            {
                throw new Exception(e.Message);
            }
            catch (Exception e)
            {
                throw new Exception(e.Message);
            }
        }

        public OrganizationInfoResponse GetOrganizationInfo()
        {
            try
            {
                string sql = @"SELECT [v_OrganizationId]
                           ,[v_IdentificationNumber]
                           ,[v_Name]
                           ,[v_Address]
                           ,[v_PhoneNumber]
                           ,[v_Mail]
                       FROM [SigesoftDesarrollo_2].[dbo].[organization]
                       WHERE v_OrganizationId = @OrganizationId";

                using (var connection = new SqlConnection(_connectionString))
                {
                    connection.Open();

                    var result = connection.QueryFirstOrDefault<OrganizationInfoResponse>(
                        sql,
                        new { OrganizationId = "N009-OO000000052" }
                    );

                    return result ?? new OrganizationInfoResponse();
                }
            }
            catch (SqlException e)
            {
                throw new Exception(e.Message);
            }
            catch (Exception e)
            {
                throw new Exception(e.Message);
            }
        }
    }
}
