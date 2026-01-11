using Dapper;
using Data.Model.Request.atencionmedica;
using Data.Model.Request.gerencia;
using Data.Model.Response.atencionmedica;
using Data.Model.Response.cobranza;
using Data.Model.Response.gerencia;
using Repositories.IContractsRepo.cobranza;
using System.Data;
using System.Data.SqlClient;

namespace Data.Access.ImplementationsRepo.cobranza
{
    public class cobranzaRepository : Repository<Data.Model.Entities.cobranza.cobranza>, ICobranzaRepository
    {
        public cobranzaRepository(string _connectionString) : base(_connectionString)
        {
        }


        public object ANULAR_VENTA_MAL_ENVIADA(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@idVenta", id);
                return connection.Query<servicePersonDataResponse>("[dbo].[ANULAR_VENTA_MAL_ENVIADA_SP]", parameters, commandType: CommandType.StoredProcedure).FirstOrDefault();
            }
        }

        public IEnumerable<mdlExternoVentasSanLorenzoGlobResponseAll> GerenciaVentasAsistencialAll(FiltroBusquedaMSVentasAll obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);
                parameters.Add("@PacienteDni", obj.PacienteDni);
                parameters.Add("@Comprobante", obj.Comprobante);

                return connection.Query<mdlExternoVentasSanLorenzoGlobResponseAll>("[dbo].[GerenciaVentasAsistencialAll_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMS(FiltroBusquedaMSRequest obj)
        {
            try
            {
                using (var connection = new SqlConnection(_connectionString))
                {
                    var parameters = new DynamicParameters();

                    parameters.Add("@FechaInicio", obj.FechaInicio);
                    parameters.Add("@FechaFin", obj.FechaFin);
                    parameters.Add("@FechaInicioRetard2mese", obj.FechaInicioRet2Meses);

                    return connection.Query<GerenciaVentasDetalleResponse>("[dbo].[GerenciaVentasAsistencialMS_SP]", parameters,
                        commandType: System.Data.CommandType.StoredProcedure, commandTimeout: 60000000);
                }
            }
            catch (Exception ex)
            {

                throw ex;
            }
           
        }

        public IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBALT_ENVIO(FiltroBusquedaMSVentas obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard", obj.FechaInicioRetard);
                parameters.Add("@PacienteDni", obj.PacienteDni);
                parameters.Add("@TipoVenta", obj.TipoVenta);
                parameters.Add("@Comprobante", obj.Comprobante);

                return connection.Query<mdlExternoVentasSanLorenzoGlobResponse>("[dbo].[GerenciaVentasAsistencialMSGLOBAL_ENVIO_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<mdlExternoSanLorenzoGlobEgresos> GerenciaVentasAsistencialMSGLOBAL_EGRESOS(FiltroBusquedaMSEgresos obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);
                parameters.Add("@IdClienteAgente", obj.TipoVenta);
                parameters.Add("@dni", obj.dni);


                return connection.Query<mdlExternoSanLorenzoGlobEgresos>("[dbo].[GetEgresoMedicos_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<mdlExternoVentasSanLorenzoMKTGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ENVIO_MKT(FiltroBusquedaMSVentas obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard", obj.FechaInicioRetard);
                parameters.Add("@PacienteDni", obj.PacienteDni);
                parameters.Add("@TipoVenta", obj.TipoVenta);
                parameters.Add("@Comprobante", obj.Comprobante);

                return connection.Query<mdlExternoVentasSanLorenzoMKTGlobResponse>("[dbo].[GerenciaVentasAsistencialMSGLOBAL_ENVIO_MKT_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ListaService(FiltroBusquedaMSVentas obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard", obj.FechaInicioRetard);
                parameters.Add("@PacienteDni", obj.PacienteDni);
                parameters.Add("@TipoVenta", obj.TipoVenta);
                parameters.Add("@Comprobante", obj.Comprobante);

                return connection.Query<mdlExternoVentasSanLorenzoGlobResponse>("[dbo].[GerenciaVentasAsistencialMSGLOBAL_ListaService_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ListaService_Filtros(FiltroBusquedaMSVentas2 obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard", obj.FechaInicioRetard);
                parameters.Add("@PacienteDni", obj.PacienteDni);
                parameters.Add("@TipoVenta", obj.TipoVenta);
                parameters.Add("@Comprobante", obj.Comprobante);
                parameters.Add("@MedicoTto", obj.MedicoTto);
                parameters.Add("@Consultorio", obj.Consultorio);
                parameters.Add("@EstProtocoloAtencion", obj.EstProtocoloAtencion);
                parameters.Add("@CampañaText", obj.CampañaText);
                parameters.Add("@FiltAlt", obj.FiltAlt);


                return connection.Query<mdlExternoVentasSanLorenzoGlobResponse>("[dbo].[GerenciaVentasAsistencialMSGLOBAL_ListaService_Filtros_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ListaVentas(FiltroBusquedaMSVentas obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard", obj.FechaInicioRetard);
                parameters.Add("@PacienteDni", obj.PacienteDni);
                parameters.Add("@TipoVenta", obj.TipoVenta);
                parameters.Add("@Comprobante", obj.Comprobante);

                return connection.Query<mdlExternoVentasSanLorenzoGlobResponse>("[dbo].[GerenciaVentasAsistencialMSGLOBAL_ListaVentas_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMSSISOL(FiltroBusquedaMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard2mese", obj.FechaInicioRet2Meses);

                return connection.Query<GerenciaVentasDetalleResponse>("[dbo].[GerenciaVentasAsistencialMSSISOL_SP]", 
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<mdlExternoSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO(FiltroBusquedaMSRequestSISOL obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard", obj.FechaInicioRetard);

                return connection.Query<mdlExternoSanLorenzoGlobResponse>("[dbo].[GerenciaVentasAsistencialMSSISOL_ENVIO_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 900000);
            }
        }

        public IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO(FiltroBusquedaMSVentas obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard", obj.FechaInicioRetard);
                parameters.Add("@PacienteDni", obj.PacienteDni);
                parameters.Add("@TipoVenta", obj.TipoVenta);
                parameters.Add("@Comprobante", obj.Comprobante);

                return connection.Query<mdlExternoVentasSanLorenzoGlobResponse>("[dbo].[GerenciaVentasAsistencialMSGLOBAL_ENVIO_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<mdlExternoSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO_ANULADOS(FiltroBusquedaMSRequestSISOL obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard", obj.FechaInicioRetard);

                return connection.Query<mdlExternoSanLorenzoGlobResponse>("[dbo].[GerenciaVentasAsistencialMSSISOL_ENVIO_ANULADOS_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<mdlExternoSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO_EGRESOS(FiltroBusquedaMSRequestSISOL2 obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);
                parameters.Add("@agenteId", obj.AgenteBusqueda);


                return connection.Query<mdlExternoSanLorenzoGlobResponse>("[dbo].[GerenciaVentasAsistencialMSSISOL_ENVIO_EGRESOS_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMSSISOL_NEW(FiltroBusquedaMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard2mese", obj.FechaInicioRet2Meses);

                return connection.Query<GerenciaVentasDetalleResponse>("[dbo].[GerenciaVentasAsistencialMSSISOL_NEW_SP]", parameters,
                    commandType: System.Data.CommandType.StoredProcedure, commandTimeout: 60000000);
            }
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMS_NEW(FiltroBusquedaMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard2mese", obj.FechaInicioRet2Meses);

                return connection.Query<GerenciaVentasDetalleResponse>("[dbo].[GerenciaVentasAsistencialMS_NEW_SP]", parameters,
                    commandType: System.Data.CommandType.StoredProcedure, commandTimeout: 60000000);
            }
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasFarmaciaMS(FiltroBusquedaMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard2mese", obj.FechaInicioRet2Meses);

                return connection.Query<GerenciaVentasDetalleResponse>("[dbo].[GerenciaVentasFarmaciaMS_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasMTCMS(FiltroBusquedaMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard2mese", obj.FechaInicioRet2Meses);

                return connection.Query<GerenciaVentasDetalleResponse>("[dbo].[GerenciaVentasMTCMS_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasOcupacionalMS(FiltroBusquedaMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard2mese", obj.FechaInicioRet2Meses);

                return connection.Query<GerenciaVentasDetalleResponse>("[dbo].[GerenciaVentasOcupacionalMS_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasOcupacionalMS_NEW(FiltroBusquedaMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@FechaInicioRetard2mese", obj.FechaInicioRet2Meses);

                return connection.Query<GerenciaVentasDetalleResponse>("[dbo].[GerenciaVentasOcupacionalMS_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<MarcaResponse> GetCLMarca(string filtro)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@filtro", filtro);
                
                return connection.Query<MarcaResponse>("[dbo].[GetCLMarca_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<ProveedorResponse> GetCLProveedor(string filtro)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@filtro", filtro);

                return connection.Query<ProveedorResponse>("[dbo].[GetCLProveedor_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<cobranzaDetalleResponse> GetCobranzaDetalleByIdVenta(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrIdVenta", id);
                return connection.Query<cobranzaDetalleResponse>("[dbo].[GetCobranzaDetalleByIdVenta_SP]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public IEnumerable<LiquidacionEmpresaList> GetEmpresaPorLiquidacion(LiquidacionFiltrosEmpresaFechas obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);

                return connection.Query<LiquidacionEmpresaList>("[dbo].[GetEmpresaPorLiquidacion_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<LiquidacionesConsolidadoResponse> GetLiqPendFacturarDETALLE(LiquidacionFiltrosEmpresaFechas obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);

                return connection.Query<LiquidacionesConsolidadoResponse>("[dbo].[GetLiqPendFacturarDETALLE_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<LiquidacionEmpresaResponse> GetLiquidacionCuentasPorCobrar(LiquidacionFiltrosEmpresaFechas obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FInicio", obj.FechaInicio);
                parameters.Add("@FaFin", obj.FechaFin);

                return connection.Query<LiquidacionEmpresaResponse>("[dbo].[GetLiquidacionCuentasPorCobrar_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<LiquidacionResponse> GetNoLiquidados(LiquidacionFiltrosEmpresaFechas obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);

                return connection.Query<LiquidacionResponse>("[dbo].[GetNoLiquidados_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<IndicadoresLaboratorioResponse1> LaboratorioIndicadores_Cantidad(FiltroBusquedaFechasMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);

                return connection.Query<IndicadoresLaboratorioResponse1>("[dbo].[LaboratorioIndicadores_Cantidad_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<IndicadoresLaboratorioResponse34> LaboratorioIndicadores_GrupoyExamen(FiltroBusquedaFechasMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);

                return connection.Query<IndicadoresLaboratorioResponse34>("[dbo].[LaboratorioIndicadores_GrupoyExamen_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<IndicadoresLaboratorioResponse2> LaboratorioIndicadores_MinaEmpresa(FiltroBusquedaFechasMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);

                return connection.Query<IndicadoresLaboratorioResponse2>("[dbo].[LaboratorioIndicadores_MinaEmpresa_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<IndicadoresLaboratorioResponse6> LaboratorioIndicadores_OrdenesMedicos6(FiltroBusquedaFechasMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);

                return connection.Query<IndicadoresLaboratorioResponse6>("[dbo].[LaboratorioIndicadores_OrdenesMedicos6_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<IndicadoresLaboratorioResponse5> LaboratorioIndicadores_ServicioDisgregado5(FiltroBusquedaFechasMSRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@fechainicio", obj.FechaInicio);
                parameters.Add("@fechafin", obj.FechaFin);

                return connection.Query<IndicadoresLaboratorioResponse5>("[dbo].[LaboratorioIndicadores_ServicioDisgregado5_SP]",
                    parameters,
                    commandType: System.Data.CommandType.StoredProcedure,
                    commandTimeout: 60000000);
            }
        }

        public IEnumerable<LiquidacionEmpresaResponse> ListaLiquidacionByEmpresa(LiquidacionFiltrosEmpresaRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@NroLiquidacion", obj.NroLiquidacion == "null" ? null : obj.NroLiquidacion);
                parameters.Add("@Facturacion", obj.Facturacion == "null" ? null : obj.Facturacion);

                return connection.Query<LiquidacionEmpresaResponse>("[dbo].[ListaLiquidacionByEmpresa_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<LiquidacionResponse> ListaLiquidacionNoStatus(LiquidacionFiltrosRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@CCosto", obj.CCosto == "null"? null: obj.CCosto);
                parameters.Add("@NroLiquidacion", obj.NroLiquidacion == "null" ? null : obj.NroLiquidacion);
                parameters.Add("@Facturacion", obj.Facturacion == "null" ? null : obj.Facturacion);
                parameters.Add("@Customer", obj.Customer == "null" ? null : obj.Customer);
                parameters.Add("@Employer", obj.Employer == "null" ? null : obj.Employer);
                parameters.Add("@Working", obj.Working == "null" ? null : obj.Working);

                return connection.Query<LiquidacionResponse>("[dbo].[ListaLiquidacion_NoStatus_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_2(LiquidacionFiltrosRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@CCosto", obj.CCosto == "null" ? null : obj.CCosto);
                parameters.Add("@NroLiquidacion", obj.NroLiquidacion == "null" ? null : obj.NroLiquidacion);
                parameters.Add("@Facturacion", obj.Facturacion == "null" ? null : obj.Facturacion);
                parameters.Add("@Customer", obj.Customer == "null" ? null : obj.Customer);
                parameters.Add("@Employer", obj.Employer == "null" ? null : obj.Employer);
                parameters.Add("@Working", obj.Working == "null" ? null : obj.Working);

                return connection.Query<LiquidacionResponse>("[dbo].[ListaLiquidacion_Liq_2_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_Fac_1(LiquidacionFiltrosRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@CCosto", obj.CCosto == "null" ? null : obj.CCosto);
                parameters.Add("@NroLiquidacion", obj.NroLiquidacion == "null" ? null : obj.NroLiquidacion);
                parameters.Add("@Facturacion", obj.Facturacion == "null" ? null : obj.Facturacion);
                parameters.Add("@Customer", obj.Customer == "null" ? null : obj.Customer);
                parameters.Add("@Employer", obj.Employer == "null" ? null : obj.Employer);
                parameters.Add("@Working", obj.Working == "null" ? null : obj.Working);

                return connection.Query<LiquidacionResponse>("[dbo].[ListaLiquidacion_Liq_Fac_1_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_Fac_2(LiquidacionFiltrosRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@CCosto", obj.CCosto == "null" ? null : obj.CCosto);
                parameters.Add("@NroLiquidacion", obj.NroLiquidacion == "null" ? null : obj.NroLiquidacion);
                parameters.Add("@Facturacion", obj.Facturacion == "null" ? null : obj.Facturacion);
                parameters.Add("@Customer", obj.Customer == "null" ? null : obj.Customer);
                parameters.Add("@Employer", obj.Employer == "null" ? null : obj.Employer);
                parameters.Add("@Working", obj.Working == "null" ? null : obj.Working);

                return connection.Query<LiquidacionResponse>("[dbo].[ListaLiquidacion_Liq_Fac_2_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_Fac_3(LiquidacionFiltrosRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);
                parameters.Add("@CCosto", obj.CCosto == "null" ? null : obj.CCosto);
                parameters.Add("@NroLiquidacion", obj.NroLiquidacion == "null" ? null : obj.NroLiquidacion);
                parameters.Add("@Facturacion", obj.Facturacion == "null" ? null : obj.Facturacion);
                parameters.Add("@Customer", obj.Customer == "null" ? null : obj.Customer);
                parameters.Add("@Employer", obj.Employer == "null" ? null : obj.Employer);
                parameters.Add("@Working", obj.Working == "null" ? null : obj.Working);

                return connection.Query<LiquidacionResponse>("[dbo].[ListaLiquidacion_Liq_Fac_3_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }


    }
}
