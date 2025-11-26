using Dapper;
using Data.Model.Request.especialidades;
using Data.Model.Response.especialidades;
using Repositories.IContractsRepo.especialidades;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Access.ImplementationsRepo.especialidades
{
    internal class EspecialidadesRepository : Repository<CreateEspecialidadRequest>, IEspecialidadesRepository
    {
        public EspecialidadesRepository(string _connectionString) : base(_connectionString)
        {
        }

        public CreateEspecialidadResponse CreateEspecialidad(CreateEspecialidadRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@v_NombreEspecialidad", request.NombreEspecialidad);
                parameters.Add("@d_PorcentajePago", request.PorcentajePago);
                parameters.Add("@i_UserId", request.UserId);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<CreateEspecialidadResponse>("[dbo].[sp_CreateEspecialidad]", 
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

        public List<EspecialidadResponse> GetAllEspecialidades(bool includeDeleted)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@i_IncludeDeleted", includeDeleted);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<EspecialidadResponse>("[dbo].[sp_GetAllEspecialidades]", 
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

        public GetEspecialidadByIdResponse GetEspecialidadById(int id)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@i_EspecialidadId", id);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<GetEspecialidadByIdResponse>("[dbo].[sp_GetEspecialidadById]", 
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

        public UpdateEspecialidadResponse UpdateEspecialidad(int id, UpdateEspecialidadRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@i_EspecialidadId", id);
                parameters.Add("@v_NombreEspecialidad", request.NombreEspecialidad);
                parameters.Add("@d_PorcentajePago", request.PorcentajePago);
                parameters.Add("@i_UserId", request.UserId);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<UpdateEspecialidadResponse>("[dbo].[sp_UpdateEspecialidad]", 
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

        public DeleteEspecialidadResponse DeleteEspecialidad(int id, int userId)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@i_EspecialidadId", id);
                parameters.Add("@i_UserId", userId);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<DeleteEspecialidadResponse>("[dbo].[sp_DeleteEspecialidad]", 
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

        public UpdatePorcentajeResponse UpdatePorcentajePago(int id, UpdatePorcentajeRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@i_EspecialidadId", id);
                parameters.Add("@d_NuevoPorcentaje", request.NuevoPorcentaje);
                parameters.Add("@i_UserId", request.UserId);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<UpdatePorcentajeResponse>("[dbo].[sp_UpdatePorcentajePago]", 
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

        public List<EspecialidadResponse> SearchEspecialidades(SearchEspecialidadesRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@v_Filtro", request.Filtro);
                parameters.Add("@d_PorcentajeMin", request.PorcentajeMin);
                parameters.Add("@d_PorcentajeMax", request.PorcentajeMax);
                parameters.Add("@i_IncludeDeleted", request.IncludeDeleted);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<EspecialidadResponse>("[dbo].[sp_SearchEspecialidades]", 
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

        public List<ProfesionalDto> BuscarProfesionales(BuscarProfesionalesRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@textSearch", request.TextSearch);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<ProfesionalDto>("[dbo].[sp_BuscarProfesionales]", 
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
    }
} 