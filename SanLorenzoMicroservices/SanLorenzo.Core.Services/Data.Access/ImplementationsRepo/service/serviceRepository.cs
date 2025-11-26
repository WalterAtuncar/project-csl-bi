using Dapper;
using Data.Model.Response.cobranza;
using Data.Model.Response.service;
using Repositories.IContractsRepo.service;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.Model.Response.atencionmedica;
using Data.Model.Request.atencionmedica;
using Data.Model.Response.reportes;
using Data.Model.Response;
using Data.Model.Request.reportes;
using System.ComponentModel;
using Data.Model.Request.gerencia;
using Data.Model.Response.gerencia;

namespace Data.Access.ImplementationsRepo.service
{
    public class serviceRepository : Repository<Data.Model.Entities.service.service>, IServiceRepository
    {
        public serviceRepository(string _connectionString) : base(_connectionString)
        {
        }

        public componentListResponse ConcatenateComponents(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", obj.pstrServiceId);
                parameters.Add("@v_ComponentId", obj.pstrComponentId);

                return connection.Query<componentListResponse>("[dbo].[ConcatenateComponentsN_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure).FirstOrDefault();
            }
        }

        public IEnumerable<valorComponenteListResponse> DevolverValorCampoPorServicioMejoradoUnServicio(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiciosId", id);
                return connection.Query<valorComponenteListResponse>("[dbo].[DevolverValorCampoPorServicioMejoradoUnServicio_SP]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public IEnumerable<recomendationListResponse> ExamenByDefaultOrAssigned_valueFieldsRecome(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", obj.pstrServiceId);
                parameters.Add("@v_ComponentId", obj.pstrComponentId);

                return connection.Query<recomendationListResponse>("[dbo].[ExamenByDefaultOrAssigned_valueFieldsRecome_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<componentsByServiceResponse> GetAllComponentsByService(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", id);
                return connection.Query<componentsByServiceResponse>("[dbo].[GetAllComponentsByService_SP]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public IEnumerable<personMedicalHistoryListNew1Response> GetAntecedentConsolidateForServiceAll(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrPersonId", id);
                return connection.Query<personMedicalHistoryListNew1Response>("[dbo].[GetAntecedentConsolidateForServiceAll_SP]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public IEnumerable<keyValueDtoResponse> GetFormAction(formActionRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pintNodeId", obj.pintNodeId);
                parameters.Add("@pintRoleId", obj.pintRoleId);
                parameters.Add("@pintSystemUserId", obj.pintSystemUserId);
                parameters.Add("@pstrFormCode", obj.pstrFormCode);

                return connection.Query<keyValueDtoResponse>("[dbo].[GetFormAction_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public InformacionPacientSimpl GetPacienteInforSimp(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrPacientId", id);

                return connection.Query<InformacionPacientSimpl>("[dbo].[GetPacienteInforSimp_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure).FirstOrDefault();
            }
        }

        public IEnumerable<recetaDespachoDtoResponse> GetRecetaToReportGlobal(recetadespachoDtoRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", obj.serviceId);
                parameters.Add("@v_DiagnosticRepositoryId", obj.v_DiagnosticRepositoryId == ""?null: obj.v_DiagnosticRepositoryId);

                return connection.Query<recetaDespachoDtoResponse>("[dbo].[GetRecetaToReportGlobal_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public BindingList<ServiceGridJerarquizadaList> GetServiceAtence(ServiceFilter obj)
        {
            var parameters = new DynamicParameters();
            parameters.Add("@FechaIicio", obj.BeginDate.Value.Date);
            parameters.Add("@FechaFin", obj.EndDate.Value.Date.AddHours(23).AddMinutes(59).AddSeconds(59));
            parameters.Add("@i_AptitudeStatusId", obj.IsReducedSearch == true? 1 : 0);
            parameters.Add("@i_ServiceTypeId", obj.ServiceTypeId);
            parameters.Add("@i_MasterServiceId", obj.MasterServiceId);
            parameters.Add("@txtPacient", obj.PacientText);
            parameters.Add("@v_ServiceId", obj.ServiceIdText);
            parameters.Add("@i_ServiceStatusId", obj.ServiceStatusId);
            parameters.Add("@i_EsoTypeId", obj.EsoTypeId);
            parameters.Add("@i_StatusLiquidation", obj.HistoryGenerated == -1 ? -1 : (obj.HistoryGenerated == 0 ? 1 : 2));
            parameters.Add("@txtEmpresa", obj.CustomerOrganization);
            parameters.Add("@txtEmpresaFact", obj.CustomerOrganizationFact);

            using (var connection = new SqlConnection(_connectionString))
            {
                var result = connection.Query<ServiceGridJerarquizadaList>("[dbo].[GetServicesAndFiltered_Reload]", 
                    parameters, 
                    commandType: CommandType.StoredProcedure,
                    commandTimeout: 300).ToList(); // Propiedad timeout
                return new BindingList<ServiceGridJerarquizadaList>(result);
            }

        }

        public IEnumerable<keyValueDtoResponse> GetServiceByPersonForCombo(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_PersonId", id);
                return connection.Query<keyValueDtoResponse>("[dbo].[GetServiceByPersonForCombo_SP]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentconClusionesDxServiceId> GetServiceComponentConclusionesDxServiceId(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", id);
                return connection.Query<serviceComponentconClusionesDxServiceId>("[dbo].[GetServiceComponentConclusionesDxServiceId_SP]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentDisgnosticsByServiceIdResponse> GetServiceComponentDisgnosticsByServiceId(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", id);
                return connection.Query<serviceComponentDisgnosticsByServiceIdResponse>("[dbo].[GetServiceComponentDisgnosticsByServiceId_SP]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public serviceDataResponse GetServiceData(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", id);

                return connection.Query<serviceDataResponse>("[dbo].[GetServiceData_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure).FirstOrDefault();
            }
        }

        public servicePersonDataResponse GetServicePersonData(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", id);
                return connection.Query<servicePersonDataResponse>("[dbo].[GetServicePersonData_SP]", parameters, commandType: CommandType.StoredProcedure).FirstOrDefault();
            }
        }

        public IEnumerable<recomendationListResponse> GetServiceRecommendationByServiceIdN(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", id);
                return connection.Query<recomendationListResponse>("[dbo].[GetServiceRecommendationByServiceId_SP]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceListNew1Response> GetServicesConsolidateForServiceNew(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", id);

                return connection.Query<serviceListNew1Response>("[dbo].[GetServicesConsolidateForServiceNew_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<keyValueDtoResponse> GetSystemParameterForCombo(int id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pintGroupId", id);
                return connection.Query<keyValueDtoResponse>("[dbo].[GetSystemParameterForCombo_SP]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public IEnumerable<keyValueDtoResponse> GetSystemParameterForComboForm(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@form", id);
                return connection.Query<keyValueDtoResponse>("[dbo].[GetSystemParameterForComboForm_SP]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public IEnumerable<keyValueDtoResponse> GetSystemParameterForComboFormEsoN()
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                //parameters.Add("@form", id);
                return connection.Query<keyValueDtoResponse>("[dbo].[GetSystemParameterForComboFormEsoN_SP]", parameters, commandType: CommandType.StoredProcedure);
            }
        }

        public void InsertServiceComponentFieldValues(List<ServiceComponentFieldValuesResponse> obj)
        {
            DataTable dt = GetDataTableServiceComponentFieldValuesDto(obj);
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();
                parameters.Add("@serviceComponentFieldValuesTable", dt.AsTableValuedParameter("servicecomponentfieldvalues_type"));
                connection.Execute("[dbo].[InsertServiceComponentFieldValues]", parameters, commandType: CommandType.StoredProcedure);
            }

        }

        private DataTable GetDataTableServiceComponentFieldValuesDto(List<ServiceComponentFieldValuesResponse> objList)
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
                row["v_ServiceComponentFieldValuesId"] = obj.v_ServiceComponentFieldValuesId ?? "";
                row["v_ComponentFieldValuesId"] = obj.v_ComponentFieldValuesId ?? "";
                row["v_ServiceComponentFieldsId"] = obj.v_ServiceComponentFieldsId ?? "";
                row["v_Value1"] = obj.v_Value1 ?? "";
                row["v_Value2"] = obj.v_Value2 ?? "";
                row["i_Index"] = obj.i_Index ?? 0;
                row["i_Value1"] = obj.i_Value1 ?? 0;
                row["i_IsDeleted"] = obj.i_IsDeleted ?? 0;
                row["i_InsertUserId"] = obj.i_InsertUserId;
                row["d_InsertDate"] = obj.d_InsertDate ?? DateTime.Now;
                row["i_UpdateUserId"] = obj.i_UpdateUserId ?? 0;
                row["d_UpdateDate"] = obj.d_UpdateDate ?? DateTime.Now;
                row["v_ComentaryUpdate"] = obj.v_ComentaryUpdate ?? "";

                dt.Rows.Add(row);
            }

            return dt;
        }

        public ExamsAndFieldsList ListExamenes_SP(ExamRequestDTO obj)
        {
            var parameters = new DynamicParameters();
            parameters.Add("@v_ServiceId", obj.v_ServiceId);
            parameters.Add("@pintNodeId", obj.pintNodeId);
            parameters.Add("@pintRoleIdint", obj.pintRoleIdint);
            using (var connection = new SqlConnection(_connectionString))
            {
                connection.Open();
                using (var multi = connection.QueryMultiple("[dbo].[ListExamenes_SP]", parameters, commandType: CommandType.StoredProcedure))
                {
                    var examsAndFieldsList = new ExamsAndFieldsList
                    {
                        ListMissingExamenesNames = multi.Read<ComponentListN>().ToList(),
                        recomendations = multi.Read<recomendation>().ToList(),
                        restrcition = multi.Read<restriction>().ToList(),
                        values = multi.Read<values>().ToList(),
                        fields = multi.Read<fields>().ToList(),
                        componentes = multi.Read<components>().ToList()
                    };

                    return examsAndFieldsList;
                }
            }
        }

        public IEnumerable<componentListResponse> ListMissingExamenesNames(serviceNodeRoleRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", obj.v_ServiceId);
                parameters.Add("@pintNodeId", obj.pintNodeId);
                parameters.Add("@pintRoleIdint", obj.pintRoleIdint);

                return connection.Query<componentListResponse>("[dbo].[ListMissingExamenesNamesN_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<HospitalizacionListResponse> GetHospitalizacionPagedAndFilteredMS(FiltroFechaInicioFechaFin obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicio", obj.FechaInicio);
                parameters.Add("@FechaFin", obj.FechaFin);

                return connection.Query<HospitalizacionListResponse>("[dbo].[GetHospitalizacionPagedAndFilteredMS_SP]", parameters,
                        commandType: System.Data.CommandType.StoredProcedure, commandTimeout: 2400000);

            }
        }

        public IEnumerable<DxFrecuenteResponse> GetDiagnosticFrecList(FiltroDxFrecuente obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrVname", obj.Dxname);
                parameters.Add("@pintCategoriaId", obj.CategoriaId);

                return connection.Query<DxFrecuenteResponse>("[dbo].[GetDiagnosticFrecList_SP]", parameters,
                        commandType: System.Data.CommandType.StoredProcedure, commandTimeout: 2400000);

            }
        }

        public IEnumerable<ListVentasFarmacia> GetVeentasFarmacia(FiltroBusquedaMSVentasFarmacia obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@FechaInicioI", obj.FechaInicio);
                parameters.Add("@FechaFinI", obj.FechaFin);
                parameters.Add("@tipoIdd", obj.tipo);

                return connection.Query<ListVentasFarmacia>("[dbo].[GetVeentasFarmacia_S]", parameters,
                        commandType: System.Data.CommandType.StoredProcedure, commandTimeout: 2400000);

            }
        }

        public IEnumerable<keyValueDtoResponse> GetSystemParameterForComboFilt(int id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pintGroupId", id);
                return connection.Query<keyValueDtoResponse>("[dbo].[GetSystemParameterForComboFilt_SP]", parameters, commandType: CommandType.StoredProcedure);
            }
        }
    }
}
