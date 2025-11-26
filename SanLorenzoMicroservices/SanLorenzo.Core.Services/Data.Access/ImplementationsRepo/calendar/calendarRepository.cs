using Dapper;
using Data.Model.Request.calendar;
using Data.Model.Response.calendar;
using Repositories.IContractsRepo.calendar;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.Model.Response.dashboard;
using Data.Model.Request.dashboard;
using System.Text.Json;

namespace Data.Access.ImplementationsRepo.calendar
{
    public class calendarRepository : Repository<Data.Model.Entities.calendar.calendar>, ICalendarRepository
    {
        public calendarRepository(string _connectionString) : base(_connectionString)
        {
        }

        public string AddServiceComponent(ServiceDto obj)
        {
            string v_serviceId = "";
            DataTable dt = GetDataTableServiceDto(obj);
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();
                parameters.Add("@ServiceDto", dt.AsTableValuedParameter("ServiceDtoType"));
                parameters.Add("@NuevoId", dbType: DbType.String, direction: ParameterDirection.Output, size: 16);
                parameters.Add("@NuevoCalendarId", dbType: DbType.String, direction: ParameterDirection.Output, size: 16);
                parameters.Add("@NuevoHospiId", dbType: DbType.String, direction: ParameterDirection.Output, size: 16);
                parameters.Add("@NuevoHospiServId", dbType: DbType.String, direction: ParameterDirection.Output, size: 16);
                connection.Execute("[dbo].[AddServiceComponent]", parameters, commandType: CommandType.StoredProcedure);
                v_serviceId = parameters.Get<string>("@NuevoId");
                string v_CalendarId = parameters.Get<string>("@NuevoCalendarId");
                string v_HospiId = parameters.Get<string>("@NuevoHospiId");
                string v_HospiServId = parameters.Get<string>("@NuevoHospiServId");
            }
                return v_serviceId;
        }

        /*
         * 
         * public void InsertServiceComponentFieldValues(List<ServiceComponentFieldValuesResponse> objList)
                {
                    DataTable dt = GetDataTableServiceComponentFieldValuesDto(objList);
                    using (var connection = new SqlConnection(_connectionString))
                    {
                        var parameters = new DynamicParameters();
                        parameters.Add("@serviceComponentFieldValuesTable", dt.AsTableValuedParameter("servicecomponentfieldvalues_type"));
                        connection.Execute("[dbo].[InsertServiceComponentFieldValues]", parameters, commandType: CommandType.StoredProcedure);
                    }
                }

        private DataTable GetDataTableServiceComponentFieldValuesDto(List<ServiceComponentFieldValuesDto> objList)
                    {
                        DataTable dt = new DataTable();

                        // Definición de las columnas del DataTable
                        dt.Columns.Add("v_ServiceComponentFieldValuesId", typeof(string));
                        dt.Columns.Add("v_ComponentFieldValuesId", typeof(string));
                        dt.Columns.Add("v_ServiceComponentFieldsId", typeof(string));
                        dt.Columns.Add("v_Value1", typeof(string));
                        dt.Columns.Add("v_Value2", typeof(string));
                        dt.Columns.Add("i_Index", typeof(int));
                        dt.Columns.Add("i_Value1", typeof(int));
                        dt.Columns.Add("i_IsDeleted", typeof(int));
                        dt.Columns.Add("i_InsertUserId", typeof(int));
                        dt.Columns.Add("d_InsertDate", typeof(DateTime));
                        dt.Columns.Add("i_UpdateUserId", typeof(int));
                        dt.Columns.Add("d_UpdateDate", typeof(DateTime));
                        dt.Columns.Add("v_ComentaryUpdate", typeof(string));

                        // Llenado del DataTable con los datos de la lista
                        foreach (var obj in objList)
                        {
                            DataRow row = dt.NewRow();
                            row["v_ServiceComponentFieldValuesId"] = obj.ServiceComponentFieldValuesId;
                            row["v_ComponentFieldValuesId"] = obj.ComponentFieldValuesId;
                            row["v_ServiceComponentFieldsId"] = obj.ServiceComponentFieldsId;
                            row["v_Value1"] = obj.Value1;
                            row["v_Value2"] = obj.Value2;
                            row["i_Index"] = obj.Index;
                            row["i_Value1"] = obj.Value1Int; // Asumiendo que tienes una propiedad Value1Int en tu DTO
                            row["i_IsDeleted"] = obj.IsDeleted;
                            row["i_InsertUserId"] = obj.InsertUserId;
                            row["d_InsertDate"] = obj.InsertDate;
                            row["i_UpdateUserId"] = obj.UpdateUserId;
                            row["d_UpdateDate"] = obj.UpdateDate;
                            row["v_ComentaryUpdate"] = obj.ComentaryUpdate;

                            dt.Rows.Add(row);
                        }

                        return dt;
                    }

         */

        private DataTable GetDataTableServiceDto(ServiceDto dto)
        {
            var dt = new DataTable();

            dt.Columns.Add("ServiceId", typeof(string));
            dt.Columns.Add("OrganizationId", typeof(string));
            dt.Columns.Add("ProtocolId", typeof(string));
            dt.Columns.Add("PersonId", typeof(string));
            dt.Columns.Add("MasterServiceId", typeof(int));
            dt.Columns.Add("ServiceStatusId", typeof(int));
            dt.Columns.Add("AptitudeStatusId", typeof(int));
            dt.Columns.Add("ServiceDate", typeof(DateTime));
            dt.Columns.Add("GlobalExpirationDate", typeof(DateTime));
            dt.Columns.Add("ObsExpirationDate", typeof(DateTime));
            dt.Columns.Add("FlagAgentId", typeof(int));
            dt.Columns.Add("Motive", typeof(string));
            dt.Columns.Add("IsFac", typeof(int));
            dt.Columns.Add("FechaNacimiento", typeof(DateTime));
            dt.Columns.Add("GeneroId", typeof(int));
            dt.Columns.Add("MedicoTratanteId", typeof(int));
            dt.Columns.Add("MedicoRealizaId", typeof(int));
            dt.Columns.Add("v_centrocosto", typeof(string));
            dt.Columns.Add("CommentaryUpdate", typeof(string));
            dt.Columns.Add("Area", typeof(string));
            dt.Columns.Add("CCosto", typeof(string));
            dt.Columns.Add("Plan", typeof(int));
            dt.Columns.Add("ServiceTypeId", typeof(int));
            dt.Columns.Add("v_LicenciaConducir", typeof(string));
            dt.Columns.Add("ObservacionesAtencion", typeof(string));
            dt.Columns.Add("PacienteHospSala", typeof(string));
            dt.Columns.Add("i_ModTrabajo", typeof(int));
            dt.Columns.Add("PasoSop", typeof(int));
            dt.Columns.Add("PasoHosp", typeof(int));
            dt.Columns.Add("i_ProcedenciaPac_Mkt", typeof(int));
            dt.Columns.Add("Establecimiento", typeof(int));
            dt.Columns.Add("VendedorExterno", typeof(int));
            dt.Columns.Add("MedicoSolicitanteExterno", typeof(int));
            dt.Columns.Add("_idccEditarNew", typeof(string));
            dt.Columns.Add("i_MedicoAtencion", typeof(int));
            dt.Columns.Add("i_CodigoAtencion", typeof(int));
            dt.Columns.Add("i_GrupoAtencion", typeof(int));

            dt.Rows.Add(
                dto.ServiceId, dto.OrganizationId, dto.ProtocolId, dto.PersonId, dto.MasterServiceId,
                dto.ServiceStatusId, dto.AptitudeStatusId, dto.ServiceDate, dto.GlobalExpirationDate,
                dto.ObsExpirationDate, dto.FlagAgentId, dto.Motive, dto.IsFac, dto.FechaNacimiento,
                dto.GeneroId, dto.MedicoTratanteId, dto.MedicoRealizaId, dto.v_centrocosto,
                dto.CommentaryUpdate, dto.Area, dto.CCosto, dto.Plan, dto.ServiceTypeId,
                dto.v_LicenciaConducir, dto.ObservacionesAtencion, dto.PacienteHospSala,
                dto.i_ModTrabajo, dto.PasoSop, dto.PasoHosp, dto.i_ProcedenciaPac_Mkt,
                dto.Establecimiento, dto.VendedorExterno, dto.MedicoSolicitanteExterno,
                dto._idccEditarNew, dto.i_MedicoAtencion, dto.i_CodigoAtencion, dto.i_GrupoAtencion
            );

            return dt;
        }

        public IEnumerable<calendarListResponse> GetObtenerListaAgendados(calendarListRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@nroDoc", obj.nroDoc);
                parameters.Add("@fi", obj.fi);
                parameters.Add("@ff", obj.ff);
                parameters.Add("@servicio", obj.servicio);
                parameters.Add("@modalidad", obj.modalidad);
                parameters.Add("@cola", obj.cola);
                parameters.Add("@vip", obj.vip);
                parameters.Add("@estadoCita", obj.estadoCita);
                parameters.Add("@paciente", obj.paciente);

                return connection.Query<calendarListResponse>("[dbo].[GetObtenerListaAgendados_Optimizado]", parameters, commandType: CommandType.StoredProcedure);

            }
        }

        public IEnumerable<EsoDto> LlenarPacientesNew()
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();
                return connection.Query<EsoDto>("[dbo].[LlenarPacientesNew]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public IEnumerable<KeyValueDTO> getOrganizationFacturacion()
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();
                parameters.Add("@pintNodeId", 9);
                return connection.Query<KeyValueDTO>("[dbo].[getorganizationfacturacion_sp]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public string AddPerson(PersonDto obj)
        {
            string v_PersonId = "";
            try
            {
                DataTable dt = GetDataTablePersonDto(obj);
                using (var connection = new SqlConnection(_connectionString))
                {
                    var parameters = new DynamicParameters();
                    parameters.Add("@PersonData", dt.AsTableValuedParameter("PersonDtoTypeNew1"));
                    parameters.Add("@v_BirthPlace", obj.LugarNacimiento);
                    parameters.Add("@NuevoId", dbType: DbType.String, direction: ParameterDirection.Output, size: 16);
                    connection.Execute("[dbo].[AddPersonNew1]", parameters, commandType: CommandType.StoredProcedure);
                    v_PersonId = parameters.Get<string>("@NuevoId");
                }
            }
            catch (SqlException ex)
            {
                throw ex;
            }
           
           
            return v_PersonId;
        }

        private DataTable GetDataTablePersonDto(PersonDto dto)
        {
            var dt = new DataTable();

            dt.Columns.Add("Nombres", typeof(string));
            dt.Columns.Add("TipoDocumento", typeof(int));
            dt.Columns.Add("NroDocumento", typeof(string));
            dt.Columns.Add("ApellidoPaterno", typeof(string));
            dt.Columns.Add("ApellidoMaterno", typeof(string));
            dt.Columns.Add("GeneroId", typeof(int));
            dt.Columns.Add("FechaNacimiento", typeof(DateTime));
            dt.Columns.Add("CommentaryUpdate", typeof(string));
            dt.Columns.Add("EstadoCivil", typeof(int));
            dt.Columns.Add("LugarNacimiento", typeof(string));
            dt.Columns.Add("Distrito", typeof(int));
            dt.Columns.Add("Provincia", typeof(int));
            dt.Columns.Add("Departamento", typeof(int));
            dt.Columns.Add("Reside", typeof(int));
            dt.Columns.Add("Email", typeof(string));
            dt.Columns.Add("Direccion", typeof(string));
            dt.Columns.Add("Puesto", typeof(string));
            dt.Columns.Add("Area", typeof(string));
            dt.Columns.Add("Altitud", typeof(int));
            dt.Columns.Add("Minerales", typeof(string));
            dt.Columns.Add("Estudios", typeof(int));
            dt.Columns.Add("Grupo", typeof(int));
            dt.Columns.Add("Factor", typeof(int));
            dt.Columns.Add("TiempoResidencia", typeof(string));
            dt.Columns.Add("TipoSeguro", typeof(int));
            dt.Columns.Add("Vivos", typeof(int));
            dt.Columns.Add("Muertos", typeof(int));
            dt.Columns.Add("Hermanos", typeof(int));
            dt.Columns.Add("Telefono", typeof(string));
            dt.Columns.Add("Parantesco", typeof(int));
            dt.Columns.Add("Labor", typeof(int));
            dt.Columns.Add("b_PersonImage", typeof(byte[]));
            dt.Columns.Add("b_FingerPrintTemplate", typeof(byte[]));
            dt.Columns.Add("b_FingerPrintImage", typeof(byte[]));
            dt.Columns.Add("b_RubricImage", typeof(byte[]));
            dt.Columns.Add("t_RubricImageText", typeof(string));
            dt.Columns.Add("Nacionalidad", typeof(string));
            dt.Columns.Add("ResidenciaAnte", typeof(string));
            dt.Columns.Add("Religion", typeof(string));
            dt.Columns.Add("titular", typeof(string));
            dt.Columns.Add("ContactoEmergencia", typeof(string));
            dt.Columns.Add("CelularEmergencia", typeof(string));
            dt.Columns.Add("i_EtniaRaza", typeof(int));
            dt.Columns.Add("i_Migrante", typeof(int));
            dt.Columns.Add("v_Migrante", typeof(string));
            dt.Columns.Add("v_FotocheckMY", typeof(string));
            dt.Columns.Add("v_FechaInicioMY", typeof(string));
            dt.Columns.Add("i_Marketing", typeof(int));
            dt.Columns.Add("v_MarketingOtros", typeof(string));

            dt.Rows.Add(
                dto.Nombres, dto.TipoDocumento, dto.NroDocumento, dto.ApellidoPaterno,
                dto.ApellidoMaterno, dto.GeneroId, dto.FechaNacimiento, dto.CommentaryUpdate,
                dto.EstadoCivil, dto.LugarNacimiento, dto.Distrito, dto.Provincia,
                dto.Departamento, dto.Reside, dto.Email, dto.Direccion, dto.Puesto,
                dto.Area, dto.Altitud, dto.Minerales, dto.Estudios, dto.Grupo,
                dto.Factor, dto.TiempoResidencia, dto.TipoSeguro, dto.Vivos,
                dto.Muertos, dto.Hermanos, dto.Telefono, dto.Parantesco, dto.Labor,
                dto.b_PersonImage, dto.b_FingerPrintTemplate, dto.b_FingerPrintImage,
                dto.b_RubricImage, dto.t_RubricImageText, dto.Nacionalidad, dto.ResidenciaAnte,
                dto.Religion, dto.titular, dto.ContactoEmergencia, dto.CelularEmergencia,
                dto.i_EtniaRaza, dto.i_Migrante, dto.v_Migrante, dto.v_FotocheckMY, dto.v_FechaInicioMY
                , dto.i_Marketing, dto.v_MarketingOtros
            );

            return dt;
        }

        /// <summary>
        /// Obtiene los datos del dashboard general con estadísticas, gráficos y rankings
        /// </summary>
        /// <param name="request">Parámetros de consulta del dashboard</param>
        /// <returns>Respuesta completa del dashboard con todas las secciones</returns>
        /// <remarks>
        /// Las fechas StartDate y EndDate deben estar en formato "yyyyMMdd" (ejemplo: "20240101")
        /// El stored procedure sp_GeneralDashboardReport espera este formato específico
        /// </remarks>
        public GeneralDashboardResponse GeneralDashboard(GeneralDashboardRequest request)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            // Convertir las fechas string yyyyMMdd a DateTime para uso interno
            var startDate = DateTime.ParseExact(request.StartDate, "yyyyMMdd", null);
            var endDate = DateTime.ParseExact(request.EndDate, "yyyyMMdd", null);
            
            var parameters = new DynamicParameters();
            // Enviar las fechas como string en formato yyyyMMdd al stored procedure
            parameters.Add("@StartDate", request.StartDate);
            parameters.Add("@EndDate", request.EndDate);
            parameters.Add("@PeriodType", request.PeriodType);
            parameters.Add("@RankingCriteria", request.RankingCriteria);
            parameters.Add("@MaxRecentTransactions", request.MaxRecentTransactions);
            parameters.Add("@MaxSpecialtiesRanking", request.MaxSpecialtiesRanking);

            using (var connection = new SqlConnection(_connectionString))
            {
                var multiQuery = connection.QueryMultiple("[dbo].[sp_GeneralDashboardReport]", parameters, commandType: CommandType.StoredProcedure);

                // 1. Estadísticas principales (4 consultas separadas)
                var patientsAttendedData = multiQuery.Read<StatCardData>().FirstOrDefault();
                var totalRevenueData = multiQuery.Read<StatCardData>().FirstOrDefault();
                var pendingAppointmentsData = multiQuery.Read<StatCardData>().FirstOrDefault();
                var occupancyRateData = multiQuery.Read<StatCardData>().FirstOrDefault();

                // 2. Datos para gráfico de ingresos
                var incomeChartData = multiQuery.Read<IncomeChartRawData>().ToList();

                // 3. Distribución de servicios
                var servicesDistribution = multiQuery.Read<ServiceDistribution>().ToList();

                // 4. Ranking de especialidades
                var specialtiesRanking = multiQuery.Read<SpecialtyRanking>().ToList();

                // 5. Transacciones recientes
                var recentTransactions = multiQuery.Read<RecentTransaction>().ToList();

                // 6. Metadatos del dashboard
                var metadata = multiQuery.Read<DashboardMetadataRaw>().FirstOrDefault();

                stopwatch.Stop();

                // Construir la respuesta final
                var response = new GeneralDashboardResponse
                {
                    DateRange = new DateRangeInfo
                    {
                        StartDate = startDate,
                        EndDate = endDate,
                        QuickFilter = request.QuickFilter,
                        TotalDays = metadata?.TotalDays ?? (int)(endDate - startDate).TotalDays + 1
                    },
                    MainStats = new DashboardStats
                    {
                        PatientsAttended = MapToStatCard(patientsAttendedData),
                        DailyRevenue = MapToStatCard(totalRevenueData, "S/."),
                        PendingAppointments = MapToStatCard(pendingAppointmentsData),
                        OccupancyRate = MapToStatCard(occupancyRateData, "%")
                    },
                    IncomeChart = new IncomeChartData
                    {
                        PeriodType = request.PeriodType,
                        DataPoints = incomeChartData.Select(x => new IncomeDataPoint
                        {
                            Value = x.Value,
                            Label = x.Label,
                            Date = x.Date,
                            NormalizedHeight = x.NormalizedHeight
                        }).ToList(),
                        MaxValue = incomeChartData.FirstOrDefault()?.MaxValue ?? 0,
                        MinValue = incomeChartData.FirstOrDefault()?.MinValue ?? 0,
                        TotalRevenue = incomeChartData.FirstOrDefault()?.TotalRevenue ?? 0,
                        AverageRevenue = incomeChartData.FirstOrDefault()?.AverageRevenue ?? 0
                    },
                    ServicesDistribution = servicesDistribution,
                    SpecialtiesRanking = specialtiesRanking,
                    RecentTransactions = recentTransactions,
                    Metadata = new DashboardMetadata
                    {
                        LastUpdated = metadata?.LastUpdated ?? DateTime.Now,
                        ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
                        TotalRecordsProcessed = recentTransactions.Count + servicesDistribution.Count + specialtiesRanking.Count,
                        ApiVersion = metadata?.ApiVersion ?? "v1.0",
                        Config = new DashboardConfig
                        {
                            Currency = metadata?.Currency ?? "PEN",
                            CurrencySymbol = metadata?.CurrencySymbol ?? "S/.",
                            TimeZone = metadata?.TimeZone ?? "America/Lima",
                            DateFormat = metadata?.DateFormat ?? "MMM dd, yyyy",
                            Language = metadata?.Language ?? "es"
                        }
                    }
                };

                return response;
            }
        }

        // Clases auxiliares para mapear los resultados del stored procedure
        private class StatCardData
        {
            public string StatType { get; set; }
            public decimal CurrentValue { get; set; }
            public decimal PreviousValue { get; set; }
            public decimal TrendPercentage { get; set; }
            public string Title { get; set; }
        }

        private class IncomeChartRawData
        {
            public DateTime Periodo { get; set; }
            public decimal Value { get; set; }
            public string Label { get; set; }
            public DateTime Date { get; set; }
            public decimal NormalizedHeight { get; set; }
            public decimal MaxValue { get; set; }
            public decimal MinValue { get; set; }
            public decimal TotalRevenue { get; set; }
            public decimal AverageRevenue { get; set; }
        }

        private class DashboardMetadataRaw
        {
            public DateTime LastUpdated { get; set; }
            public string ApiVersion { get; set; }
            public int TotalDays { get; set; }
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
            public string PeriodType { get; set; }
            public string Currency { get; set; }
            public string CurrencySymbol { get; set; }
            public string TimeZone { get; set; }
            public string DateFormat { get; set; }
            public string Language { get; set; }
        }

        // Método auxiliar para mapear StatCardData a StatCard
        private StatCard MapToStatCard(StatCardData data, string prefix = "")
        {
            if (data == null) return new StatCard();

            var trendValue = data.TrendPercentage;
            var trendDirection = trendValue > 0 ? "up" : trendValue < 0 ? "down" : "neutral";
            var trendSign = trendValue > 0 ? "+" : "";

            return new StatCard
            {
                Title = data.Title,
                Value = prefix + data.CurrentValue.ToString("N0"),
                NumericValue = data.CurrentValue,
                Trend = $"{trendSign}{trendValue:F1}%",
                TrendDirection = trendDirection,
                TrendValue = trendValue,
                TrendDescription = "desde el período anterior"
            };
        }

        public SalesDashboardResponse SalesDashboard(SalesDashboardRequest request)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            // Convertir las fechas string yyyyMMdd a DateTime para uso interno
            var startDate = DateTime.ParseExact(request.StartDate, "yyyyMMdd", null);
            var endDate = DateTime.ParseExact(request.EndDate, "yyyyMMdd", null);

            var parameters = new DynamicParameters();
            // Enviar las fechas como DateTime al stored procedure
            parameters.Add("@StartDate", startDate);
            parameters.Add("@EndDate", endDate);
            parameters.Add("@TopResults", request.TopResults);
            parameters.Add("@IncludePriceRangeAnalysis", request.IncludePriceRangeAnalysis);
            parameters.Add("@IncludeDailyTrend", request.IncludeDailyTrend);

            using (var connection = new SqlConnection(_connectionString))
            {
                var multiQuery = connection.QueryMultiple("[dbo].[sp_DashboardVentas]", parameters, commandType: CommandType.StoredProcedure);

                // 1. Comparación de ventas por tipo de documento
                var salesByDocumentType = multiQuery.Read<DocumentTypeSales>().ToList();

                // 2. Comparación: Atenciones Médicas vs Farmacia
                var medicalVsPharmacy = multiQuery.Read<CategoryComparison>().ToList();

                // 3. Top productos de farmacia más vendidos
                var topPharmacyProducts = multiQuery.Read<TopPharmacyProduct>().ToList();

                // 4. Análisis de atenciones médicas por tipo
                var medicalAttentionsDetail = multiQuery.Read<MedicalAttentionAnalysis>().ToList();

                // 5. Tendencia de ventas por día (condicional)
                var dailySalesTrend = new List<DailySalesTrend>();
                if (request.IncludeDailyTrend)
                {
                    dailySalesTrend = multiQuery.Read<DailySalesTrend>().ToList();
                }

                // 6. Análisis de descuentos y márgenes
                var discountAnalysis = multiQuery.Read<DiscountAnalysis>().ToList();

                // 7. Estadísticas generales del período
                var generalStats = multiQuery.Read<GeneralSalesStats>().FirstOrDefault();

                // 8. Ventas recientes con detalle
                var recentSales = multiQuery.Read<RecentSale>().ToList();

                // 9. Análisis por rangos de precio (condicional)
                var priceRangeAnalysis = new List<PriceRangeAnalysis>();
                if (request.IncludePriceRangeAnalysis)
                {
                    priceRangeAnalysis = multiQuery.Read<PriceRangeAnalysis>().ToList();
                }

                // 10. Metadatos del dashboard
                var metadata = multiQuery.Read<SalesDashboardMetadataRaw>().FirstOrDefault();

                stopwatch.Stop();

                // Construir la respuesta final
                var response = new SalesDashboardResponse
                {
                    DateRange = new DateRangeInfo
                    {
                        StartDate = startDate,
                        EndDate = endDate,
                        TotalDays = metadata?.TotalDays ?? (int)(endDate - startDate).TotalDays + 1
                    },
                    SalesByDocumentType = salesByDocumentType,
                    MedicalVsPharmacy = medicalVsPharmacy,
                    TopPharmacyProducts = topPharmacyProducts,
                    MedicalAttentionsDetail = medicalAttentionsDetail,
                    DailySalesTrend = dailySalesTrend,
                    DiscountAnalysis = discountAnalysis,
                    GeneralStats = generalStats ?? new GeneralSalesStats(),
                    RecentSales = recentSales,
                    PriceRangeAnalysis = priceRangeAnalysis,
                    Metadata = new SalesDashboardMetadata
                    {
                        LastUpdated = metadata?.LastUpdated ?? DateTime.Now,
                        ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
                        TotalRecordsProcessed = salesByDocumentType.Count + medicalVsPharmacy.Count + 
                                             topPharmacyProducts.Count + medicalAttentionsDetail.Count + 
                                             dailySalesTrend.Count + discountAnalysis.Count + recentSales.Count + 
                                             priceRangeAnalysis.Count,
                        ApiVersion = metadata?.ApiVersion ?? "v1.0",
                        GeneratedBy = metadata?.GeneratedBy ?? "sp_DashboardVentas",
                        Config = new SalesDashboardConfig
                        {
                            Currency = metadata?.Currency ?? "PEN",
                            CurrencySymbol = metadata?.CurrencySymbol ?? "S/.",
                            TimeZone = metadata?.TimeZone ?? "America/Lima",
                            DateFormat = metadata?.DateFormat ?? "dd/MM/yyyy",
                            Language = metadata?.Language ?? "es",
                            MedicalAttentionProductId = metadata?.MedicalAttentionProductId ?? "N001-PE000015780"
                        }
                    }
                };

                return response;
            }
        }
        List<DashboardServicioDto> ICalendarRepository.DashboardServicios(DashboardServiciosRequest request)
        {
            var startDate = request.FechaInicio.Date.AddSeconds(1).ToString();
            var endDate = request.FechaFin.Date.AddDays(1).AddSeconds(-1).ToString();
            var parameters = new DynamicParameters();
            // Enviar las fechas como DateTime al stored procedure
            parameters.Add("@FechaInicio", startDate);
            parameters.Add("@FechaFin", endDate);
            using (var connection = new SqlConnection(_connectionString))
            {
                return (List<DashboardServicioDto>)connection.Query<DashboardServicioDto>("[dbo].[sp_DashboardServicios]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public DashboardFinancieroResponseDto DashboardFinanciero(DashboardFinancieroRequestDto request)
        {
            var response = new DashboardFinancieroResponseDto();
            var startDate = request.StartDate.Date.ToString("yyyy-MM-dd");
            var endDate = request.EndDate.Date.ToString("yyyy-MM-dd");

            var parameters = new DynamicParameters();
            // Enviar las fechas como DateTime al stored procedure
            parameters.Add("@StartDate", startDate);
            parameters.Add("@EndDate", endDate);
            parameters.Add("@ClienteEsAgente", request.ClienteEsAgente);
            parameters.Add("@DocumentoEgreso", request.DocumentoEgreso);
            parameters.Add("@Distribucion", request.Distribucion);
            using (var connection = new SqlConnection(_connectionString))
            {
                var multiQuery = connection.QueryMultiple("[dbo].[sp_DashboardFinanciero]", parameters, commandType: CommandType.StoredProcedure);
                var ResumenComparativo = multiQuery.Read<ResumenComparativoDto>().ToList().FirstOrDefault();
                var DatosPorPeriodo = multiQuery.Read<PeriodoFinancieroDto>().ToList();
                var DatosPorConsultorio = multiQuery.Read<ConsultorioVentasDto>().ToList();

                response.ResumenComparativo = ResumenComparativo;
                response.DatosPorPeriodo = DatosPorPeriodo;
                response.DatosPorConsultorio = DatosPorConsultorio;
                
            }

            // Llenar ParametrosUtilizados con la data disponible
            var diasEnPeriodo = (int)(request.EndDate.Date - request.StartDate.Date).TotalDays + 1;
            var periodoAnteriorInicio = request.StartDate.Date.AddDays(-diasEnPeriodo + 1);
            var periodoAnteriorFin = request.StartDate.Date.AddDays(-1);

            response.ParametrosUtilizados = new ParametrosUtilizadosDto
            {
                PeriodoActualInicio = request.StartDate.Date,
                PeriodoActualFin = request.EndDate.Date,
                PeriodoAnteriorInicio = periodoAnteriorInicio,
                PeriodoAnteriorFin = periodoAnteriorFin,
                ClientesIncluidos = request.ClienteEsAgente ?? string.Empty,
                DocumentoEgresoUtilizado = request.DocumentoEgreso,
                TipoDistribucion = request.Distribucion ?? string.Empty,
                DiasEnPeriodo = diasEnPeriodo
            };
            return response;
        }
        public string EjecutarScript(ScriptSQL script)
        {
            try
            {
                // Validar que el script no esté vacío
                if (string.IsNullOrWhiteSpace(script?.scriptText))
                {
                    throw new ArgumentException("El script SQL no puede estar vacío", nameof(script));
                }

                // Limpiar y formatear el script SQL
                string cleanedScript = CleanSqlScript(script.scriptText);

                using (var connection = new SqlConnection(_connectionString))
                {
                    // Ejecutar el script SQL usando Dapper
                    var result = connection.Query<dynamic>(cleanedScript, commandType: CommandType.Text);
                    
                    // Convertir el resultado a JSON string
                    var options = new JsonSerializerOptions
                    {
                        WriteIndented = true,
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                    };
                    
                    string jsonResult = JsonSerializer.Serialize(result, options);
                    
                    return jsonResult;
                }
            }
            catch (SqlException sqlEx)
            {
                // Manejar errores específicos de SQL Server
                var errorResponse = new
                {
                    error = true,
                    message = "Error de SQL Server",
                    details = sqlEx.Message,
                    errorNumber = sqlEx.Number,
                    severity = sqlEx.State,
                    timestamp = DateTime.Now
                };

                //var options = new JsonSerializerOptions { WriteIndented = true };
                //return JsonSerializer.Serialize(errorResponse, options);
                throw new Exception(errorResponse.details);
            }
            catch (Exception ex)
            {
                // Manejar otros tipos de errores
                var errorResponse = new
                {
                    error = true,
                    message = "Error al ejecutar el script",
                    details = ex.Message,
                    timestamp = DateTime.Now
                };

                //var options = new JsonSerializerOptions { WriteIndented = true };
                //return JsonSerializer.Serialize(errorResponse, options);
                throw new Exception(errorResponse.details);
            }
        }

        /// <summary>
        /// Limpia y normaliza el script SQL eliminando caracteres problemáticos
        /// </summary>
        /// <param name="sqlScript">Script SQL a limpiar</param>
        /// <returns>Script SQL limpio y normalizado</returns>
        private string CleanSqlScript(string sqlScript)
        {
            if (string.IsNullOrWhiteSpace(sqlScript))
                return string.Empty;

            // Eliminar caracteres de control y normalizar saltos de línea
            string cleaned = sqlScript
                // Reemplazar diferentes tipos de saltos de línea por espacios
                .Replace("\r\n", " ")  // Windows line endings
                .Replace("\r", " ")    // Mac line endings  
                .Replace("\n", " ")    // Unix line endings
                .Replace("\t", " ")    // Tabs
                // Eliminar caracteres de control
                .Replace("\x0A", " ")  // Line Feed (LF)
                .Replace("\x0D", " ")  // Carriage Return (CR)
                .Replace("\x09", " ")  // Tab
                .Replace("\x0B", " ")  // Vertical Tab
                .Replace("\x0C", " ")  // Form Feed
                // Limpiar espacios múltiples
                .Trim();

            // Reemplazar múltiples espacios con un solo espacio
            while (cleaned.Contains("  "))
            {
                cleaned = cleaned.Replace("  ", " ");
            }

            return cleaned;
        }




        // Clase auxiliar para mapear los metadatos del stored procedure
        private class SalesDashboardMetadataRaw
        {
            public DateTime LastUpdated { get; set; }
            public string ApiVersion { get; set; }
            public int TotalDays { get; set; }
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
            public int TopResults { get; set; }
            public bool IncludePriceRangeAnalysis { get; set; }
            public bool IncludeDailyTrend { get; set; }
            public string Currency { get; set; }
            public string CurrencySymbol { get; set; }
            public string TimeZone { get; set; }
            public string DateFormat { get; set; }
            public string Language { get; set; }
            public string MedicalAttentionProductId { get; set; }
            public string GeneratedBy { get; set; }
        }
    }
}
