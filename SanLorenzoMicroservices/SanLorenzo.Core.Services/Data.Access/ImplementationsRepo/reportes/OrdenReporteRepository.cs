using Dapper;
using Data.Model.Entities.organization;
using Data.Model.Request.reportes;
using Data.Model.Response.reportes;
using Repositories.IContractsRepo.reportes;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Access.ImplementationsRepo.reportes
{
    internal class OrdenReporteRepository : Repository<OrdenReporte>, IOrdenreporteRepository
    {
        public OrdenReporteRepository(string _connectionString) : base(_connectionString)
        {
        }

        public IEnumerable<antecedentesMedicosResponse> AntecedentesmEDICOS(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_PersonId", id);
                return connection.Query<antecedentesMedicosResponse>("[dbo].[AntecedentesmEDICOS_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<antecedentesOcupacionalesResponse> AntecedentesOcupacionales(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_PersonId", id);
                return connection.Query<antecedentesOcupacionalesResponse>("[dbo].[AntecedentesOcupacionales_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<restrictionsNameResponse> ConcatenateRecomendacionesByCategoria(filtroServicioYCategoriaRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.v_ServiceId);
                parameters.Add("@pintCategoriaId", obj.i_Categoria);

                return connection.Query<restrictionsNameResponse>("[dbo].[ConcatenateRecomendacionesByCategoria_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<devolverComponentesConcatenadosResponse> DevolverComponentesConcatenados(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<devolverComponentesConcatenadosResponse>("[dbo].[DevolverComponentesConcatenados_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public devolverDatosPacienteResponse DevolverDatosPaciente(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_ServiceId", id);

                return connection.Query<devolverDatosPacienteResponse>("[dbo].[DevolverDatosPaciente_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure).FirstOrDefault();
            }
        }

        public IEnumerable<alturaEstructuralResponse> GetAlturaEstructural(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<alturaEstructuralResponse>("[dbo].[GetAlturaEstructural_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<anamnesisReportResponse> GetAnamnesisReport(filtroServiceComponentComponent obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@p1", obj.pstrComponent1);
                parameters.Add("@p2", obj.pstrComponent2);

                return connection.Query<anamnesisReportResponse>("[dbo].[GetAnamnesisReport_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<diagnosticRepositoryListResponse> GetAptitudeCertificateRefactNew(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<diagnosticRepositoryListResponse>("[dbo].[GetAptitudeCertificateRefactNew_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<diagnosticRepositoryList2Response> GetAptitudeCertificateRefactNew2(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<diagnosticRepositoryList2Response>("[dbo].[GetAptitudeCertificateRefactNew2_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<diagnosticRepositoryList3Response> GetAptitudeCertificateRefactNew3(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<diagnosticRepositoryList3Response>("[dbo].[GetAptitudeCertificateRefactNew3_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<aptitudMedicoServicioResponse> GetAptitudMedicoServicio(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@serviceId", id);
                return connection.Query<aptitudMedicoServicioResponse>("[dbo].[GetAptitudMedicoServicio_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<audiometriaCoimolacheResponse> GetAudiometriaCoimolache(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<audiometriaCoimolacheResponse>("[dbo].[GetAudiometriaCoimolache_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<capeResponse> GetCAPE(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", id);

                return connection.Query<capeResponse>("[dbo].[GetCAPE_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<cAPSDResponse> GetCAPSD(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<cAPSDResponse>("[dbo].[GetCAPSD_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<recommendationNameResponse> GetConcatenateRecommendation(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrDiagnosticRepositoryId", id);
                return connection.Query<recommendationNameResponse>("[dbo].[GetConcatenateRecommendation_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<recommendationNameResponse> GetConcatenateRecommendationByService_New_2(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<recommendationNameResponse>("[dbo].[GetConcatenateRecommendationByService_New_2_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<restrictionsNameResponse> GetConcatenateRestriction(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrDiagnosticRepositoryId", id);
                return connection.Query<restrictionsNameResponse>("[dbo].[GetConcatenateRestriction_SP] ", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<restrictionsNameResponse> GetConcatenateRestrictionByServiceConcatecDx(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<restrictionsNameResponse >("[dbo].[GetConcatenateRestrictionByServiceConcatecDx_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<devolverAntecedentesPersonalesResponse> GetDevolverAntecedentesPersonales(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrPersonId", id);
                return connection.Query<devolverAntecedentesPersonalesResponse>("[dbo].[GetDevolverAntecedentesPersonales_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<devolverAptitudResponse> GetDevolverAptitud(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<devolverAptitudResponse>("[dbo].[GetDevolverAptitud_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<devolverComponentesConcatenadosResponse> GetDevolverComponentesLaboratorioConcatenados(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@INFORME_LABORATORIO_ID", obj.pstrComponentId);

                return connection.Query<devolverComponentesConcatenadosResponse>("[dbo].[GetDevolverComponentesLaboratorioConcatenados_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<devolverDatosUsuarioGraboExamenResponse> GetDevolverDatosUsuarioGraboExamen(filtroServicioYCategoriaRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrserviceId", obj.v_ServiceId);
                parameters.Add("@categoriaId", obj.i_Categoria);

                return connection.Query<devolverDatosUsuarioGraboExamenResponse>("[dbo].[GetDevolverDatosUsuarioGraboExamen_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<diseasesNameResponse> GetDiagnosticByServiceIdAndCategoryId(filtroServicioYCategoriaRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.v_ServiceId);
                parameters.Add("@pintCategoriaId", obj.i_Categoria);

                return connection.Query<diseasesNameResponse>("[dbo].[GetDiagnosticByServiceIdAndCategoryId_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<diseasesNameResponse> GetDiagnosticByServiceIdAndComponent(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponent", obj.pstrComponentId);

                return connection.Query<diseasesNameResponse>("[dbo].[GetDiagnosticByServiceIdAndComponent_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<diseasesNameResponse> GetDiagnosticForAudiometria(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponent", obj.pstrComponentId);

                return connection.Query<diseasesNameResponse>("[dbo].[GetDiagnosticForAudiometria_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<diagnosticrepositorybycomponent1Response> GetDiagnosticRepositoryByComponent1(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@componentId", obj.pstrComponentId);

                return connection.Query<diagnosticrepositorybycomponent1Response>("[dbo].[GetDiagnosticRepositoryByComponent1_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<diagnosticrepositorybycomponent2Response> GetDiagnosticRepositoryByComponent2(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@componentId", obj.pstrComponentId);

                return connection.Query<diagnosticrepositorybycomponent2Response>("[dbo].[GetDiagnosticRepositoryByComponent2_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<diagnosticrepositorybycomponent3Response> GetDiagnosticRepositoryByComponent3(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@componentId", obj.pstrComponentId);

                return connection.Query<diagnosticrepositorybycomponent3Response>("[dbo].[GetDiagnosticRepositoryByComponent3_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<diseasesNameResponse> GetDisgnosticsCIE10ByServiceIdAndComponentConcatec(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<diseasesNameResponse>("[dbo].[GetDisgnosticsCIE10ByServiceIdAndComponentConcatec_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<doctoPhisicalexamResponse> GetDoctoPhisicalExam(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@serviceId", obj.pstrServiceId);
                parameters.Add("@EXAMEN_FISICO_ID", obj.pstrComponentId);

                return connection.Query<doctoPhisicalexamResponse>("[dbo].[GetDoctoPhisicalExam_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<familyMedicalAntecedentsReportResponse> GetFamilyMedicalAntecedentsReport(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_PersonId", id);
                return connection.Query<familyMedicalAntecedentsReportResponse>("[dbo].[GetFamilyMedicalAntecedentsReport_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<fichaPsicologicaOcupacionalResponse> GetFichaPsicologicaOcupacional(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<fichaPsicologicaOcupacionalResponse>("[dbo].[GetFichaPsicologicaOcupacional_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<firmaMedicosResponse> GetFirmaMedicos(int id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@medicoID", id);
                return connection.Query<firmaMedicosResponse>("[dbo].[GetFirmaMedicos_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<historiaClinicaPsicologicaResponse> GetHistoriaClinicaPsicologica(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<historiaClinicaPsicologicaResponse>("[dbo].[GetHistoriaClinicaPsicologica_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<historyReportResponse> GetHistoryReport(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrPersonId", id);
                return connection.Query<historyReportResponse>("[dbo].[GetHistoryReport_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<historyReportResponse> GetHistoryReportA(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrPersonId", id);
                return connection.Query<historyReportResponse>("[dbo].[GetHistoryReportA_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<historyReportResponse> GetHistoryReportB(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrPersonId", id);
                return connection.Query<historyReportResponse>("[dbo].[GetHistoryReportB_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<organizationDtoResponse> GetInfoMedicalCenter(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@OWNER_ORGNIZATION_ID", id);

                return connection.Query<organizationDtoResponse>("[dbo].[GetInfoMedicalCenter_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public organizationDtoResponseN GetInfoMedicalCenterN(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_OrganizationId", id);

                return connection.Query<organizationDtoResponseN>("[dbo].[GetInfoMedicalCenterN_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure).FirstOrDefault();
            }
        }

        public IEnumerable<informacion_LaboratorioResponse> GetInformacion_Laboratorio(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<informacion_LaboratorioResponse>("[dbo].[GetInformacion_Laboratorio_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<informacion_OtrosExamenes_MSResponse> GetInformacion_OtrosExamenes_MS(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<informacion_OtrosExamenes_MSResponse>("[dbo].[GetInformacion_OtrosExamenes_MS_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<informacion_Otrosexamenes_NewResponse> GetInformacion_OtrosExamenes_New(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<informacion_Otrosexamenes_NewResponse>("[dbo].[GetInformacion_OtrosExamenes_New_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<recommendationNameResponse> GetListRecommendationByServiceIdAndComponent(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<recommendationNameResponse>("[dbo].[GetListRecommendationByServiceIdAndComponent_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<listValueComponentResponse> GetListValueComponent(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<listValueComponentResponse>("[dbo].[GetListValueComponent_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public LogoEmpresaResponse GetLogoEmpresa(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_OrganizationId", id);
                return connection.Query<LogoEmpresaResponse>("[dbo].[GetLogoEmpresa_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure).FirstOrDefault();
            }
        }

        public IEnumerable<musculoesqueleticoResponse> GetMusculoEsqueletico(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<musculoesqueleticoResponse>("[dbo].[GetMusculoEsqueletico_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<nombreEmpresaLabResponse> GetNombreEmpresaLab(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_ServiceId", id);
                return connection.Query<nombreEmpresaLabResponse>("[dbo].[GetNombreEmpresaLab_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<nombremedicolabResponse> GetNombreMedicoLab(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_ServiceId", id);
                return connection.Query<nombremedicolabResponse>("[dbo].[GetNombreMedicoLab_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<noxiousHabitsReportResponse> GetNoxiousHabitsReport(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_PersonId", id);
                return connection.Query<noxiousHabitsReportResponse>("[dbo].[GetNoxiousHabitsReport_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<obtenerFirmaMedicoExamenResponse> GetObtenerFirmaMedicoExamen(filtroServiceComponentComponent obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@p1", obj.pstrComponent1);
                parameters.Add("@p2", obj.pstrComponent2);

                return connection.Query<obtenerFirmaMedicoExamenResponse>("[dbo].[GetObtenerFirmaMedicoExamen_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public pacientreportepsResponse GetPacientReportEPS(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_ServiceId", id);
                return connection.Query<pacientreportepsResponse>("[dbo].[GetPacientReportEPS_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure).FirstOrDefault();
            }
        }

        public IEnumerable<pacientReportEpsFirmamedicoOcupacionalResponse> GetPacientReportEPSFirmaMedicoOcupacional(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@serviceId", id);
                return connection.Query<pacientReportEpsFirmamedicoOcupacionalResponse>("[dbo].[GetPacientReportEPSFirmaMedicoOcupacional_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<personMedicalHistoryReportResponse> GetPersonMedicalHistoryReport(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_PersonId", id);
                return connection.Query<personMedicalHistoryReportResponse>("[dbo].[GetPersonMedicalHistoryReport_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<recomendationsResponse> GetRecomendationByServiceIdAndComponentConcatec(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<recomendationsResponse>("[dbo].[GetRecomendationByServiceIdAndComponentConcatec_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<recommendationResponse> GetRecommendationByServiceIdAndComponent(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponent", obj.pstrComponentId);

                return connection.Query<recommendationResponse>("[dbo].[GetRecommendationByServiceIdAndComponent_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportAntropometriaResponse> GetReportAntropometria(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportAntropometriaResponse>("[dbo].[GetReportAntropometria_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportAudiometriaResponse> GetReportAudiometria(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportAudiometriaResponse>("[dbo].[GetReportAudiometria_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportCocainaMarihuanaResponse> GetReportCocainaMarihuana(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportCocainaMarihuanaResponse>("[dbo].[GetReportCocainaMarihuana_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportConsentimientoResponse> GetReportConsentimiento(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", id);

                return connection.Query<reportConsentimientoResponse>("[dbo].[GetReportConsentimiento_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportCuestionarioEspirometriaResponse> GetReportCuestionarioEspirometria(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportCuestionarioEspirometriaResponse>("[dbo].[GetReportCuestionarioEspirometria_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportCuestionarioEspirometriaAllResponse> GetReportCuestionarioEspirometria_ALL(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportCuestionarioEspirometriaAllResponse>("[dbo].[GetReportCuestionarioEspirometria_ALL_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportCuestionarioNordicoResponse> GetReportCuestionarioNordico(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportCuestionarioNordicoResponse>("[dbo].[GetReportCuestionarioNordico_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportElectroGoldResponse> GetReportElectroGold(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportElectroGoldResponse>("[dbo].[GetReportElectroGold_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reporteLumboSacaResponse> GetReporteLumboSaca(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reporteLumboSacaResponse>("[dbo].[GetReporteLumboSaca_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportEstudioElectrocardiograficoResponse> GetReportEstudioElectrocardiografico(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportEstudioElectrocardiograficoResponse>("[dbo].[GetReportEstudioElectrocardiografico_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportFuncionesVitalesResponse> GetReportFuncionesVitales(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportFuncionesVitalesResponse>("[dbo].[GetReportFuncionesVitales_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportHistoriaOcupacionalResponse> GetReportHistoriaOcupacional(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<reportHistoriaOcupacionalResponse>("[dbo].[GetReportHistoriaOcupacional_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportInformeRadiograficoResponse> GetReportInformeRadiografico(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportInformeRadiograficoResponse>("[dbo].[GetReportInformeRadiografico_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportOdontogramaResponse> GetReportOdontograma(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportOdontogramaResponse>("[dbo].[GetReportOdontograma_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<ostioCoimolacheResponse> GetReportOsteoCoimalache(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<ostioCoimolacheResponse>("[dbo].[GetReportOsteoCoimalache_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<osteomuscularNuevoResponse> GetReportOsteoMuscularNuevo(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<osteomuscularNuevoResponse>("[dbo].[GetReportOsteoMuscularNuevo_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportRadiologicoResponse> GetReportRadiologico(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportRadiologicoResponse>("[dbo].[GetReportRadiologico_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<reportToxicologicoResponse> GetReportToxicologico(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<reportToxicologicoResponse>("[dbo].[GetReportToxicologico_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<restrictionsNameResponse> GetRestrictionByServiceId(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<restrictionsNameResponse>("[dbo].[GetRestrictionByServiceId_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<servicecomponentconclusionesdxserviceidreportResponse> GetServiceComponentConclusionesDxServiceIdReport(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_ServiceId", id);
                return connection.Query<servicecomponentconclusionesdxserviceidreportResponse>("[dbo].[GetServiceComponentConclusionesDxServiceIdReport_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentConclusionesDxServiceidReport_todosResponse> GetServiceComponentConclusionesDxServiceIdReport_TODOS(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<serviceComponentConclusionesDxServiceidReport_todosResponse>("[dbo].[GetServiceComponentConclusionesDxServiceIdReport_TODOS_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentDiagnosticsReportResponse> GetServiceComponentDiagnosticsReport(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<serviceComponentDiagnosticsReportResponse>("[dbo].[GetServiceComponentDiagnosticsReport_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentsReportCResponse> GetServiceComponentsReportC(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_ServiceId", id);
                return connection.Query<serviceComponentsReportCResponse>("[dbo].[GetServiceComponentsReportC_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentsReportSCResponse> GetServiceComponentsReportSC(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_ServiceId", id);
                return connection.Query<serviceComponentsReportSCResponse>("[dbo].[GetServiceComponentsReportSCNew_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentsReport_DxListResponse> GetServiceComponentsReport_DxList(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", obj.pstrServiceId);
                parameters.Add("@v_ComponentId", obj.pstrComponentId);

                return connection.Query<serviceComponentsReport_DxListResponse>("[dbo].[GetServiceComponentsReport_DxList_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentsReport_New312Response> GetServiceComponentsReport_New312(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<serviceComponentsReport_New312Response>("[dbo].[GetServiceComponentsReport_New312_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentsReport_Newlab_1Response> GetServiceComponentsReport_NewLab_1(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<serviceComponentsReport_Newlab_1Response>("[dbo].[GetServiceComponentsReport_NewLab_1_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentsReport_Newlab_2Response> GetServiceComponentsReport_NewLab_2(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<serviceComponentsReport_Newlab_2Response>("[dbo].[GetServiceComponentsReport_NewLab_2_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceDisgnosticsReportsResponse> GetServiceDisgnosticsReports(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<serviceDisgnosticsReportsResponse>("[dbo].[GetServiceDisgnosticsReports_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<servicerecommendationbydiagnosticrepositoryidreportResponse> GetServiceRecommendationByDiagnosticRepositoryIdReport(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_DiagnosticRepository", id);
                return connection.Query<servicerecommendationbydiagnosticrepositoryidreportResponse>("[dbo].[GetServiceRecommendationByDiagnosticRepositoryIdReport_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceRecommendationByServiceIdResponse> GetServiceRecommendationByServiceId(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_ServiceId", id);
                return connection.Query<serviceRecommendationByServiceIdResponse>("[dbo].[GetServiceRecommendationByServiceId_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceReportResponse> GetServiceReport(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", id);

                return connection.Query<serviceReportResponse>("[dbo].[GetServiceReport_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceRestrictionByDiagnosticrepositoryidreport> GetServiceRestrictionByDiagnosticRepositoryIdReport(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@v_DiagnosticRepository", id);
                return connection.Query<serviceRestrictionByDiagnosticrepositoryidreport>("[dbo].[GetServiceRestrictionByDiagnosticRepositoryIdReport_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceShortResponse> GetServiceShort(string id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var paramneters = new DynamicParameters();

                paramneters.Add("@pstrServiceId", id);
                return connection.Query<serviceShortResponse>("[dbo].[GetServiceShort_SP]", paramneters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentFieldValuesListResponse> GetValoresComponente(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<serviceComponentFieldValuesListResponse>("[dbo].[GetValoresComponente_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<valoresComponenteAmcResponse> GetValoresComponenteAMC(filtroServicioYCategoriaRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.v_ServiceId);
                parameters.Add("@pintCategory", obj.i_Categoria);

                return connection.Query<valoresComponenteAmcResponse>("[dbo].[GetValoresComponenteAMC__SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<valoresComponenteOdontogramaResponse> GetValoresComponenteOdontograma(filtroServicioComponentePathRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);
                parameters.Add("@pstrPath", obj.pstrPath);


                return connection.Query<valoresComponenteOdontogramaResponse>("[dbo].[GetValoresComponenteOdontograma_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentFieldValuesListUserControlResponse> GetValoresComponenteOdontogramaAusente(filtroServicioComponentePathRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);
                parameters.Add("@pstrPath", obj.pstrPath);


                return connection.Query<serviceComponentFieldValuesListUserControlResponse>("[dbo].[GetValoresComponenteOdontogramaAusente_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentFieldValuesListUserControlResponse> GetValoresComponenteOdontogramaValue1(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);


                return connection.Query<serviceComponentFieldValuesListUserControlResponse>("[dbo].[GetValoresComponenteOdontogramaValue1_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentFieldValuesListUserControlResponse> GetValoresComponentesUserControl(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<serviceComponentFieldValuesListUserControlResponse>("[dbo].[GetValoresComponentesUserControl_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<valoresComponente_ObservadoAmcResponse> GetValoresComponente_ObservadoAMC(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<valoresComponente_ObservadoAmcResponse>("[dbo].[GetValoresComponente_ObservadoAMC_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<valoresExamenComponeteResponse> GetValoresExamenComponete(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@pstrServiceId", obj.pstrServiceId);
                parameters.Add("@pstrComponentId", obj.pstrComponentId);

                return connection.Query<valoresExamenComponeteResponse>("[dbo].[GetValoresExamenComponete_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<obtenerIdsImporacionResponse> ObtenerIdsParaImportacionExcel(filtroServicioYCategoriaRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", obj.v_ServiceId);
                parameters.Add("@i_Categoria", obj.i_Categoria);

                return connection.Query<obtenerIdsImporacionResponse>("[dbo].[ObtenerIdsParaImportacionExcel_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<ucOsteoResponse> ReporteOsteomuscular(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", obj.pstrServiceId);
                parameters.Add("@i_ComponentId", obj.pstrComponentId);

                return connection.Query<ucOsteoResponse>("[dbo].[ReporteOsteomuscular_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        public IEnumerable<serviceComponentFieldValuesListUserControlResponse> ValoresComponenteOdontograma1(filtroServicioComponenteRequest obj)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var parameters = new DynamicParameters();

                parameters.Add("@v_ServiceId", obj.pstrServiceId);
                parameters.Add("@v_ComponentId ", obj.pstrComponentId);

                return connection.Query<serviceComponentFieldValuesListUserControlResponse>("[dbo].[ValoresComponenteOdontograma1_SP]", parameters, commandType: System.Data.CommandType.StoredProcedure);
            }
        }

        
    }
}
