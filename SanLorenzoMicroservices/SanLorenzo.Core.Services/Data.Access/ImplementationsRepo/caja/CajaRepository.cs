using Dapper;
using Data.Model.Request.caja;
using Data.Model.Response.caja;
using Repositories.IContractsRepo.caja;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;

namespace Data.Access.ImplementationsRepo.caja
{
    public class CajaRepository : Repository<CreateCajaMayorRequest>, ICajaRepository
    {
        public CajaRepository(string _connectionString) : base(_connectionString)
        {
        }

        // ================================================
        // MÉTODOS HELPER
        // ================================================

        /// <summary>
        /// Convierte una lista de detalles a DataTable para usar con Table Type
        /// </summary>
        private DataTable ConvertirDetalleADataTable(List<CajaMayorDetalleRequest>? detalles)
        {
            var dataTable = new DataTable();
            
            // Definir columnas del Table Type
            dataTable.Columns.Add("IdVenta", typeof(string));
            dataTable.Columns.Add("CodigoDocumento", typeof(string));
            dataTable.Columns.Add("TipoMovimiento", typeof(string));
            dataTable.Columns.Add("ConceptoMovimiento", typeof(string));
            dataTable.Columns.Add("FechaMovimiento", typeof(DateTime));
            dataTable.Columns.Add("Subtotal", typeof(decimal));
            dataTable.Columns.Add("IGV", typeof(decimal));
            dataTable.Columns.Add("Total", typeof(decimal));
            dataTable.Columns.Add("NumeroDocumento", typeof(string));
            dataTable.Columns.Add("SerieDocumento", typeof(string));
            dataTable.Columns.Add("Observaciones", typeof(string));

            if (detalles != null)
            {
                foreach (var detalle in detalles)
                {
                    var row = dataTable.NewRow();
                    row["IdVenta"] = detalle.IdVenta ?? (object)DBNull.Value;
                    row["CodigoDocumento"] = detalle.CodigoDocumento ?? (object)DBNull.Value;
                    row["TipoMovimiento"] = detalle.TipoMovimiento;
                    row["ConceptoMovimiento"] = detalle.ConceptoMovimiento;
                    row["FechaMovimiento"] = detalle.FechaMovimiento;
                    row["Subtotal"] = detalle.Subtotal;
                    row["IGV"] = detalle.IGV;
                    row["Total"] = detalle.Total;
                    row["NumeroDocumento"] = detalle.NumeroDocumento ?? (object)DBNull.Value;
                    row["SerieDocumento"] = detalle.SerieDocumento ?? (object)DBNull.Value;
                    row["Observaciones"] = detalle.Observaciones ?? (object)DBNull.Value;
                    
                    dataTable.Rows.Add(row);
                }
            }
            
            return dataTable;
        }

        // ================================================
        // CAJA MAYOR
        // ================================================

        public CreateCajaMayorResponse CreateCajaMayor(CreateCajaMayorRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdTipoCaja", request.IdTipoCaja);
                parameters.Add("@Periodo", request.Periodo);
                parameters.Add("@Mes", request.Mes);
                parameters.Add("@Anio", request.Anio);
                parameters.Add("@FechaInicio", request.FechaInicio);
                parameters.Add("@FechaFin", request.FechaFin);
                parameters.Add("@SaldoInicialMes", request.SaldoInicialMes);
                parameters.Add("@TotalIngresos", request.TotalIngresos);
                parameters.Add("@TotalEgresos", request.TotalEgresos);
                parameters.Add("@ObservacionesCierre", request.ObservacionesCierre);
                parameters.Add("@InsertaIdUsuario", request.InsertaIdUsuario);
                
                // Convertir detalles a DataTable para Table Type
                var detalleDataTable = ConvertirDetalleADataTable(request.Detalle);
                parameters.Add("@DetalleItems", detalleDataTable.AsTableValuedParameter("dbo.CajaMayorDetalleTableType"));

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<CreateCajaMayorResponse>("[dbo].[sp_CajaMayor_CreateUpdate]", 
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

        public CreateCajaMayorResponse UpdateCajaMayor(UpdateCajaMayorRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdCajaMayor", request.IdCajaMayor);
                parameters.Add("@IdTipoCaja", request.IdTipoCaja);
                parameters.Add("@Periodo", request.Periodo);
                parameters.Add("@Mes", request.Mes);
                parameters.Add("@Anio", request.Anio);
                parameters.Add("@FechaInicio", request.FechaInicio);
                parameters.Add("@FechaFin", request.FechaFin);
                parameters.Add("@SaldoInicialMes", request.SaldoInicialMes);
                parameters.Add("@TotalIngresos", request.TotalIngresos);
                parameters.Add("@TotalEgresos", request.TotalEgresos);
                parameters.Add("@ObservacionesCierre", request.ObservacionesCierre);
                parameters.Add("@InsertaIdUsuario", request.ActualizaIdUsuario);
                
                // Convertir detalles a DataTable para Table Type
                var detalleDataTable = ConvertirDetalleADataTable(request.Detalle);
                parameters.Add("@DetalleItems", detalleDataTable.AsTableValuedParameter("dbo.CajaMayorDetalleTableType"));

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<CreateCajaMayorResponse>("[dbo].[sp_CajaMayor_CreateUpdate]", 
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

        public List<CajaMayorListResponse> GetCajaMayorList(GetCajaMayorListRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdTipoCaja", request.IdTipoCaja);
                parameters.Add("@Anio", request.Anio);
                parameters.Add("@Mes", request.Mes);
                parameters.Add("@EstadoCierre", request.EstadoCierre);
                parameters.Add("@PageNumber", request.PageNumber);
                parameters.Add("@PageSize", request.PageSize);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<CajaMayorListResponse>("[dbo].[sp_CajaMayor_GetList]", 
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

        public CajaMayorDetalleResponse GetCajaMayorDetalle(int idCajaMayor)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdCajaMayor", idCajaMayor);

                using (var connection = new SqlConnection(_connectionString))
                {
                    using (var multi = connection.QueryMultiple("[dbo].[sp_CajaMayor_GetDetalle]", 
                        parameters, commandType: CommandType.StoredProcedure))
                    {
                        var header = multi.Read<CajaMayorHeaderResponse>().FirstOrDefault();
                        var movimientos = multi.Read<CajaMayorMovimientoResponse>().ToList();

                        return new CajaMayorDetalleResponse
                        {
                            Header = header,
                            Movimientos = movimientos
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

        public CerrarCajaMayorResponse CerrarCajaMayor(CerrarCajaMayorRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdCajaMayor", request.IdCajaMayor);
                parameters.Add("@ObservacionesCierre", request.ObservacionesCierre);
                parameters.Add("@UsuarioIdCierre", request.UsuarioIdCierre);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<CerrarCajaMayorResponse>("[dbo].[sp_CajaMayor_Cerrar]", 
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

        public DeleteCajaMayorResponse DeleteCajaMayor(DeleteCajaMayorRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdCajaMayor", request.IdCajaMayor);
                parameters.Add("@UsuarioIdEliminacion", request.UsuarioIdEliminacion);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<DeleteCajaMayorResponse>("[dbo].[sp_CajaMayor_Delete]", 
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

        // ================================================
        // INGRESOS MENSUALES
        // ================================================

        public CreateIngresoMensualResponse CreateIngresoMensual(CreateIngresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdCajaMayor", request.IdCajaMayor);
                parameters.Add("@IdTipoIngresoMensual", request.IdTipoIngresoMensual);
                parameters.Add("@ConceptoIngreso", request.ConceptoIngreso);
                parameters.Add("@FechaIngreso", request.FechaIngreso);
                parameters.Add("@MontoIngreso", request.MontoIngreso);
                parameters.Add("@NumeroDocumento", request.NumeroDocumento);
                parameters.Add("@Origen", request.Origen);
                parameters.Add("@Observaciones", request.Observaciones);
                parameters.Add("@InsertaIdUsuario", request.InsertaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<CreateIngresoMensualResponse>("[dbo].[sp_IngresoMensual_Create]", 
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

        public List<IngresoMensualListResponse> GetIngresoMensualList(GetIngresoMensualListRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdCajaMayor", request.IdCajaMayor);
                parameters.Add("@IdTipoIngresoMensual", request.IdTipoIngresoMensual);
                parameters.Add("@FechaInicio", request.FechaInicio);
                parameters.Add("@FechaFin", request.FechaFin);
                parameters.Add("@Estado", request.Estado);
                parameters.Add("@PageNumber", request.PageNumber);
                parameters.Add("@PageSize", request.PageSize);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<IngresoMensualListResponse>("[dbo].[sp_IngresoMensual_GetList]", 
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

        public UpdateIngresoMensualResponse UpdateIngresoMensual(UpdateIngresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdIngresoMensual", request.IdIngresoMensual);
                parameters.Add("@ConceptoIngreso", request.ConceptoIngreso);
                parameters.Add("@FechaIngreso", request.FechaIngreso);
                parameters.Add("@MontoIngreso", request.MontoIngreso);
                parameters.Add("@NumeroDocumento", request.NumeroDocumento);
                parameters.Add("@Origen", request.Origen);
                parameters.Add("@Observaciones", request.Observaciones);
                parameters.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<UpdateIngresoMensualResponse>("[dbo].[sp_IngresoMensual_Update]", 
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

        public DeleteIngresoMensualResponse DeleteIngresoMensual(DeleteIngresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdIngresoMensual", request.IdIngresoMensual);
                parameters.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<DeleteIngresoMensualResponse>("[dbo].[sp_IngresoMensual_Delete]", 
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

        // ================================================
        // EGRESOS MENSUALES
        // ================================================

        public CreateEgresoMensualResponse CreateEgresoMensual(CreateEgresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdCajaMayor", request.IdCajaMayor);
                parameters.Add("@IdTipoEgresoMensual", request.IdTipoEgresoMensual);
                parameters.Add("@ConceptoEgreso", request.ConceptoEgreso);
                parameters.Add("@FechaEgreso", request.FechaEgreso);
                parameters.Add("@MontoEgreso", request.MontoEgreso);
                parameters.Add("@NumeroDocumento", request.NumeroDocumento);
                parameters.Add("@Beneficiario", request.Beneficiario);
                parameters.Add("@Observaciones", request.Observaciones);
                parameters.Add("@InsertaIdUsuario", request.InsertaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<CreateEgresoMensualResponse>("[dbo].[sp_EgresoMensual_Create]", 
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

        public List<EgresoMensualListResponse> GetEgresoMensualList(GetEgresoMensualListRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdCajaMayor", request.IdCajaMayor);
                parameters.Add("@IdTipoEgresoMensual", request.IdTipoEgresoMensual);
                parameters.Add("@FechaInicio", request.FechaInicio);
                parameters.Add("@FechaFin", request.FechaFin);
                parameters.Add("@Estado", request.Estado);
                parameters.Add("@PageNumber", request.PageNumber);
                parameters.Add("@PageSize", request.PageSize);

                using (var connection = new SqlConnection(_connectionString))
                {
                    // Necesitaríamos el stored procedure sp_EgresoMensual_GetList (similar al de ingresos)
                    return connection.Query<EgresoMensualListResponse>("[dbo].[sp_EgresoMensual_GetList]", 
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

        public UpdateEgresoMensualResponse UpdateEgresoMensual(UpdateEgresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdEgresoMensual", request.IdEgresoMensual);
                parameters.Add("@ConceptoEgreso", request.ConceptoEgreso);
                parameters.Add("@FechaEgreso", request.FechaEgreso);
                parameters.Add("@MontoEgreso", request.MontoEgreso);
                parameters.Add("@NumeroDocumento", request.NumeroDocumento);
                parameters.Add("@Beneficiario", request.Beneficiario);
                parameters.Add("@Observaciones", request.Observaciones);
                parameters.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<UpdateEgresoMensualResponse>("[dbo].[sp_EgresoMensual_Update]", 
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

        public DeleteEgresoMensualResponse DeleteEgresoMensual(DeleteEgresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdEgresoMensual", request.IdEgresoMensual);
                parameters.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<DeleteEgresoMensualResponse>("[dbo].[sp_EgresoMensual_Delete]", 
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

        // ================================================
        // TIPOS DE CAJA
        // ================================================

        public CreateTipoCajaResponse CreateTipoCaja(CreateTipoCajaRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@NombreTipoCaja", request.NombreTipoCaja);
                parameters.Add("@Descripcion", request.Descripcion);
                parameters.Add("@InsertaIdUsuario", request.InsertaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<CreateTipoCajaResponse>("[dbo].[sp_TipoCaja_Create]", 
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

        public List<TipoCajaResponse> GetTiposCaja(GetTiposCajaRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IncludeInactive", request.IncludeInactive);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<TipoCajaResponse>("[dbo].[sp_TipoCaja_GetList]", 
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

        public UpdateTipoCajaResponse UpdateTipoCaja(UpdateTipoCajaRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdTipoCaja", request.IdTipoCaja);
                parameters.Add("@NombreTipoCaja", request.NombreTipoCaja);
                parameters.Add("@Descripcion", request.Descripcion);
                parameters.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<UpdateTipoCajaResponse>("[dbo].[sp_TipoCaja_Update]", 
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

        public DeleteTipoCajaResponse DeleteTipoCaja(DeleteTipoCajaRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdTipoCaja", request.IdTipoCaja);
                parameters.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<DeleteTipoCajaResponse>("[dbo].[sp_TipoCaja_Delete]", 
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

        // ================================================
        // TIPOS DE INGRESO MENSUAL  
        // ================================================

        public CreateTipoIngresoMensualResponse CreateTipoIngresoMensual(CreateTipoIngresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@NombreTipoIngreso", request.NombreTipoIngreso);
                parameters.Add("@Descripcion", request.Descripcion);
                parameters.Add("@InsertaIdUsuario", request.InsertaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<CreateTipoIngresoMensualResponse>("[dbo].[sp_TipoIngresoMensual_Create]", 
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

        public List<TipoIngresoMensualResponse> GetTiposIngresoMensual(GetTiposIngresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IncludeInactive", request.IncludeInactive);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<TipoIngresoMensualResponse>("[dbo].[sp_TipoIngresoMensual_GetList]", 
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

        public UpdateTipoIngresoMensualResponse UpdateTipoIngresoMensual(UpdateTipoIngresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdTipoIngresoMensual", request.IdTipoIngresoMensual);
                parameters.Add("@NombreTipoIngreso", request.NombreTipoIngreso);
                parameters.Add("@Descripcion", request.Descripcion);
                parameters.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<UpdateTipoIngresoMensualResponse>("[dbo].[sp_TipoIngresoMensual_Update]", 
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

        public DeleteTipoIngresoMensualResponse DeleteTipoIngresoMensual(DeleteTipoIngresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdTipoIngresoMensual", request.IdTipoIngresoMensual);
                parameters.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<DeleteTipoIngresoMensualResponse>("[dbo].[sp_TipoIngresoMensual_Delete]", 
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

        // ================================================
        // TIPOS DE EGRESO MENSUAL
        // ================================================

        public CreateTipoEgresoMensualResponse CreateTipoEgresoMensual(CreateTipoEgresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@NombreTipoEgreso", request.NombreTipoEgreso);
                parameters.Add("@Descripcion", request.Descripcion);
                parameters.Add("@InsertaIdUsuario", request.InsertaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<CreateTipoEgresoMensualResponse>("[dbo].[sp_TipoEgresoMensual_Create]", 
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

        public List<TipoEgresoMensualResponse> GetTiposEgresoMensual(GetTiposEgresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IncludeInactive", request.IncludeInactive);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<TipoEgresoMensualResponse>("[dbo].[sp_TipoEgresoMensual_GetList]", 
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

        public UpdateTipoEgresoMensualResponse UpdateTipoEgresoMensual(UpdateTipoEgresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdTipoEgresoMensual", request.IdTipoEgresoMensual);
                parameters.Add("@NombreTipoEgreso", request.NombreTipoEgreso);
                parameters.Add("@Descripcion", request.Descripcion);
                parameters.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<UpdateTipoEgresoMensualResponse>("[dbo].[sp_TipoEgresoMensual_Update]", 
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

        public DeleteTipoEgresoMensualResponse DeleteTipoEgresoMensual(DeleteTipoEgresoMensualRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdTipoEgresoMensual", request.IdTipoEgresoMensual);
                parameters.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<DeleteTipoEgresoMensualResponse>("[dbo].[sp_TipoEgresoMensual_Delete]", 
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

        // ================================================
        // SALDO CAJA
        // ================================================

        public List<SaldoCajaResponse> GetSaldoCaja(GetSaldoCajaRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdTipoCaja", request.IdTipoCaja);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<SaldoCajaResponse>("[dbo].[sp_SaldoCaja_GetActual]", 
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

        public CreateCajaMayorResponse InsertCajaMayorDetalle(InsertCajaMayorDetalleRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("@IdCajaMayor", request.IdCajaMayor);
                parameters.Add("@IdVenta", request.IdVenta);
                parameters.Add("@CodigoDocumento", request.CodigoDocumento);
                parameters.Add("@TipoMovimiento", request.TipoMovimiento);
                parameters.Add("@ConceptoMovimiento", request.ConceptoMovimiento);
                parameters.Add("@FechaMovimiento", request.FechaMovimiento);
                parameters.Add("@Subtotal", request.Subtotal);
                parameters.Add("@IGV", request.IGV);
                parameters.Add("@Total", request.Total);
                parameters.Add("@NumeroDocumento", request.NumeroDocumento);
                parameters.Add("@SerieDocumento", request.SerieDocumento);
                parameters.Add("@Observaciones", request.Observaciones);
                parameters.Add("@InsertaIdUsuario", request.InsertaIdUsuario);

                using (var connection = new SqlConnection(_connectionString))
                {
                    return connection.Query<CreateCajaMayorResponse>("[dbo].[sp_CajaMayorDetalle_Insert]", 
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
    }
}
