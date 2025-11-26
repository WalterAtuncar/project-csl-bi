using Business.Logic.IContractsBL.reportes;
using Data.Model.Entities.organization;
using Data.Model.Request.reportes;
using Data.Model.Response.reportes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnitOfWork;

namespace Business.Logic.ImplementationsBL.reportes
{
    public class OrdenReporteLogic : IOrdenreporteLogic
    {
        private IUnitOfWork _unitOfWork;
        public OrdenReporteLogic(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public IEnumerable<antecedentesMedicosResponse> AntecedentesmEDICOS(string id)
        {
            return _unitOfWork.IOrdenreporte.AntecedentesmEDICOS(id);
        }

        public IEnumerable<antecedentesOcupacionalesResponse> AntecedentesOcupacionales(string id)
        {
            return _unitOfWork.IOrdenreporte.AntecedentesOcupacionales(id);
        }

        public IEnumerable<restrictionsNameResponse> ConcatenateRecomendacionesByCategoria(filtroServicioYCategoriaRequest obj)
        {
            return _unitOfWork.IOrdenreporte.ConcatenateRecomendacionesByCategoria(obj);
        }

        public bool Delete(OrdenReporte obj)
        {
            return _unitOfWork.IOrdenreporte.Delete(obj);
        }

        public IEnumerable<devolverComponentesConcatenadosResponse> DevolverComponentesConcatenados(string id)
        {
            return _unitOfWork.IOrdenreporte.DevolverComponentesConcatenados(id);
        }

        public devolverDatosPacienteResponse DevolverDatosPaciente(string id)
        {
            return _unitOfWork.IOrdenreporte.DevolverDatosPaciente(id);
        }

        public IEnumerable<alturaEstructuralResponse> GetAlturaEstructural(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetAlturaEstructural(obj);
        }

        public IEnumerable<anamnesisReportResponse> GetAnamnesisReport(filtroServiceComponentComponent obj)
        {
            return _unitOfWork.IOrdenreporte.GetAnamnesisReport(obj);
        }

        public IEnumerable<diagnosticRepositoryListResponse> GetAptitudeCertificateRefactNew(string id)
        {
            return _unitOfWork.IOrdenreporte.GetAptitudeCertificateRefactNew(id);
        }

        public IEnumerable<diagnosticRepositoryList2Response> GetAptitudeCertificateRefactNew2(string id)
        {
            return _unitOfWork.IOrdenreporte.GetAptitudeCertificateRefactNew2(id);
        }

        public IEnumerable<diagnosticRepositoryList3Response> GetAptitudeCertificateRefactNew3(string id)
        {
            return _unitOfWork.IOrdenreporte.GetAptitudeCertificateRefactNew3(id);
        }

        public IEnumerable<aptitudMedicoServicioResponse> GetAptitudMedicoServicio(string id)
        {
            return _unitOfWork.IOrdenreporte.GetAptitudMedicoServicio(id);
        }

        public IEnumerable<audiometriaCoimolacheResponse> GetAudiometriaCoimolache(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetAudiometriaCoimolache(obj);
        }

        public OrdenReporte GetById(string id)
        {
            return _unitOfWork.IOrdenreporte.GetById(id);
        }

        public IEnumerable<capeResponse> GetCAPE(string id)
        {
            return _unitOfWork.IOrdenreporte.GetCAPE(id);
        }

        public IEnumerable<cAPSDResponse> GetCAPSD(string id)
        {
            return _unitOfWork.IOrdenreporte.GetCAPSD(id);
        }

        public IEnumerable<recommendationNameResponse> GetConcatenateRecommendation(string id)
        {
            return _unitOfWork.IOrdenreporte.GetConcatenateRecommendation(id);
        }

        public IEnumerable<recommendationNameResponse> GetConcatenateRecommendationByService_New_2(string id)
        {
            return _unitOfWork.IOrdenreporte.GetConcatenateRecommendationByService_New_2(id);
        }

        public IEnumerable<restrictionsNameResponse> GetConcatenateRestriction(string id)
        {
            return _unitOfWork.IOrdenreporte.GetConcatenateRestriction(id);
        }

        public IEnumerable<restrictionsNameResponse> GetConcatenateRestrictionByServiceConcatecDx(string id)
        {
            return _unitOfWork.IOrdenreporte.GetConcatenateRestrictionByServiceConcatecDx(id);
        }

        public IEnumerable<devolverAntecedentesPersonalesResponse> GetDevolverAntecedentesPersonales(string id)
        {
            return _unitOfWork.IOrdenreporte.GetDevolverAntecedentesPersonales(id);
        }

        public IEnumerable<devolverAptitudResponse> GetDevolverAptitud(string id)
        {
            return _unitOfWork.IOrdenreporte.GetDevolverAptitud(id);
        }

        public IEnumerable<devolverComponentesConcatenadosResponse> GetDevolverComponentesLaboratorioConcatenados(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetDevolverComponentesLaboratorioConcatenados(obj);
        }

        public IEnumerable<devolverDatosUsuarioGraboExamenResponse> GetDevolverDatosUsuarioGraboExamen(filtroServicioYCategoriaRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetDevolverDatosUsuarioGraboExamen(obj);
        }

        public IEnumerable<diseasesNameResponse> GetDiagnosticByServiceIdAndCategoryId(filtroServicioYCategoriaRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetDiagnosticByServiceIdAndCategoryId(obj);
        }

        public IEnumerable<diseasesNameResponse> GetDiagnosticByServiceIdAndComponent(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetDiagnosticByServiceIdAndComponent(obj);
        }

        public IEnumerable<diseasesNameResponse> GetDiagnosticForAudiometria(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetDiagnosticForAudiometria(obj);
        }

        public IEnumerable<diagnosticrepositorybycomponent1Response> GetDiagnosticRepositoryByComponent1(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetDiagnosticRepositoryByComponent1(obj);
        }

        public IEnumerable<diagnosticrepositorybycomponent2Response> GetDiagnosticRepositoryByComponent2(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetDiagnosticRepositoryByComponent2(obj);
        }

        public IEnumerable<diagnosticrepositorybycomponent3Response> GetDiagnosticRepositoryByComponent3(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetDiagnosticRepositoryByComponent3(obj);
        }

        public IEnumerable<diseasesNameResponse> GetDisgnosticsCIE10ByServiceIdAndComponentConcatec(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetDisgnosticsCIE10ByServiceIdAndComponentConcatec(obj);
        }

        public IEnumerable<doctoPhisicalexamResponse> GetDoctoPhisicalExam(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetDoctoPhisicalExam(obj);
        }

        public IEnumerable<familyMedicalAntecedentsReportResponse> GetFamilyMedicalAntecedentsReport(string id)
        {
            return _unitOfWork.IOrdenreporte.GetFamilyMedicalAntecedentsReport(id);
        }

        public IEnumerable<fichaPsicologicaOcupacionalResponse> GetFichaPsicologicaOcupacional(string id)
        {
            return _unitOfWork.IOrdenreporte.GetFichaPsicologicaOcupacional(id);
        }

        public IEnumerable<firmaMedicosResponse> GetFirmaMedicos(int id)
        {
            return _unitOfWork.IOrdenreporte.GetFirmaMedicos(id);
        }

        public IEnumerable<historiaClinicaPsicologicaResponse> GetHistoriaClinicaPsicologica(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetHistoriaClinicaPsicologica(obj);
        }

        public IEnumerable<historyReportResponse> GetHistoryReport(string id)
        {
            return _unitOfWork.IOrdenreporte.GetHistoryReport(id);
        }

        public IEnumerable<historyReportResponse> GetHistoryReportA(string id)
        {
            return _unitOfWork.IOrdenreporte.GetHistoryReportA(id);
        }

        public IEnumerable<historyReportResponse> GetHistoryReportB(string id)
        {
            return _unitOfWork.IOrdenreporte.GetHistoryReportB(id);
        }

        public IEnumerable<organizationDtoResponse> GetInfoMedicalCenter(string id)
        {
            return _unitOfWork.IOrdenreporte.GetInfoMedicalCenter(id);
        }

        public organizationDtoResponseN GetInfoMedicalCenterN(string id)
        {
            return _unitOfWork.IOrdenreporte.GetInfoMedicalCenterN(id);
        }

        public IEnumerable<informacion_LaboratorioResponse> GetInformacion_Laboratorio(string id)
        {
            return _unitOfWork.IOrdenreporte.GetInformacion_Laboratorio(id);
        }

        public IEnumerable<informacion_OtrosExamenes_MSResponse> GetInformacion_OtrosExamenes_MS(string id)
        {
            return _unitOfWork.IOrdenreporte.GetInformacion_OtrosExamenes_MS(id);
        }

        public IEnumerable<informacion_Otrosexamenes_NewResponse> GetInformacion_OtrosExamenes_New(string id)
        {
            return _unitOfWork.IOrdenreporte.GetInformacion_OtrosExamenes_New(id);
        }

        public IEnumerable<OrdenReporte> GetList()
        {
            return _unitOfWork.IOrdenreporte.GetList();
        }

        public IEnumerable<recommendationNameResponse> GetListRecommendationByServiceIdAndComponent(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetListRecommendationByServiceIdAndComponent(obj);
        }

        public IEnumerable<listValueComponentResponse> GetListValueComponent(string id)
        {
            return _unitOfWork.IOrdenreporte.GetListValueComponent(id);
        }

        public LogoEmpresaResponse GetLogoEmpresa(string id)
        {
            return _unitOfWork.IOrdenreporte.GetLogoEmpresa(id);
        }

        public IEnumerable<musculoesqueleticoResponse> GetMusculoEsqueletico(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetMusculoEsqueletico(obj);
        }

        public IEnumerable<nombreEmpresaLabResponse> GetNombreEmpresaLab(string id)
        {
            return _unitOfWork.IOrdenreporte.GetNombreEmpresaLab(id);
        }

        public IEnumerable<nombremedicolabResponse> GetNombreMedicoLab(string id)
        {
            return _unitOfWork.IOrdenreporte.GetNombreMedicoLab(id);
        }

        public IEnumerable<noxiousHabitsReportResponse> GetNoxiousHabitsReport(string id)
        {
            return _unitOfWork.IOrdenreporte.GetNoxiousHabitsReport(id);
        }

        public IEnumerable<obtenerFirmaMedicoExamenResponse> GetObtenerFirmaMedicoExamen(filtroServiceComponentComponent obj)
        {
            return _unitOfWork.IOrdenreporte.GetObtenerFirmaMedicoExamen(obj);
        }

        public pacientreportepsResponse GetPacientReportEPS(string id)
        {
            return _unitOfWork.IOrdenreporte.GetPacientReportEPS(id);
        }

        public IEnumerable<pacientReportEpsFirmamedicoOcupacionalResponse> GetPacientReportEPSFirmaMedicoOcupacional(string id)
        {
            return _unitOfWork.IOrdenreporte.GetPacientReportEPSFirmaMedicoOcupacional(id);
        }

        public IEnumerable<personMedicalHistoryReportResponse> GetPersonMedicalHistoryReport(string id)
        {
            return _unitOfWork.IOrdenreporte.GetPersonMedicalHistoryReport(id);
        }

        public IEnumerable<recomendationsResponse> GetRecomendationByServiceIdAndComponentConcatec(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetRecomendationByServiceIdAndComponentConcatec(obj);
        }

        public IEnumerable<recommendationResponse> GetRecommendationByServiceIdAndComponent(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetRecommendationByServiceIdAndComponent(obj);

        }

        public IEnumerable<reportAntropometriaResponse> GetReportAntropometria(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportAntropometria(obj);
        }

        public IEnumerable<reportAudiometriaResponse> GetReportAudiometria(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportAudiometria(obj);
        }

        public IEnumerable<reportCocainaMarihuanaResponse> GetReportCocainaMarihuana(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportCocainaMarihuana(obj);
        }

        public IEnumerable<reportConsentimientoResponse> GetReportConsentimiento(string id)
        {
            return _unitOfWork.IOrdenreporte.GetReportConsentimiento(id);
        }

        public IEnumerable<reportCuestionarioEspirometriaResponse> GetReportCuestionarioEspirometria(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportCuestionarioEspirometria(obj);
        }

        public IEnumerable<reportCuestionarioEspirometriaAllResponse> GetReportCuestionarioEspirometria_ALL(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportCuestionarioEspirometria_ALL(obj);
        }

        public IEnumerable<reportCuestionarioNordicoResponse> GetReportCuestionarioNordico(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportCuestionarioNordico(obj);
        }

        public IEnumerable<reportElectroGoldResponse> GetReportElectroGold(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportElectroGold(obj);
        }

        public IEnumerable<reporteLumboSacaResponse> GetReporteLumboSaca(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReporteLumboSaca(obj);
        }

        public IEnumerable<reportEstudioElectrocardiograficoResponse> GetReportEstudioElectrocardiografico(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportEstudioElectrocardiografico(obj);
        }

        public IEnumerable<reportFuncionesVitalesResponse> GetReportFuncionesVitales(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportFuncionesVitales(obj);
        }

        public IEnumerable<reportHistoriaOcupacionalResponse> GetReportHistoriaOcupacional(string id)
        {
            return _unitOfWork.IOrdenreporte.GetReportHistoriaOcupacional(id);
        }

        public IEnumerable<reportInformeRadiograficoResponse> GetReportInformeRadiografico(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportInformeRadiografico(obj);
        }

        public IEnumerable<reportOdontogramaResponse> GetReportOdontograma(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportOdontograma(obj);
        }

        public IEnumerable<ostioCoimolacheResponse> GetReportOsteoCoimalache(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportOsteoCoimalache(obj);
        }

        public IEnumerable<osteomuscularNuevoResponse> GetReportOsteoMuscularNuevo(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportOsteoMuscularNuevo(obj);
        }

        public IEnumerable<reportRadiologicoResponse> GetReportRadiologico(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportRadiologico(obj);
        }

        public IEnumerable<reportToxicologicoResponse> GetReportToxicologico(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetReportToxicologico(obj);
        }

        public IEnumerable<restrictionsNameResponse> GetRestrictionByServiceId(string id)
        {
            return _unitOfWork.IOrdenreporte.GetRestrictionByServiceId(id);

        }

        public IEnumerable<servicecomponentconclusionesdxserviceidreportResponse> GetServiceComponentConclusionesDxServiceIdReport(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceComponentConclusionesDxServiceIdReport(id);
        }

        public IEnumerable<serviceComponentConclusionesDxServiceidReport_todosResponse> GetServiceComponentConclusionesDxServiceIdReport_TODOS(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceComponentConclusionesDxServiceIdReport_TODOS(id);
        }

        public IEnumerable<serviceComponentDiagnosticsReportResponse> GetServiceComponentDiagnosticsReport(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetServiceComponentDiagnosticsReport(obj);
        }

        public IEnumerable<serviceComponentsReportCResponse> GetServiceComponentsReportC(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceComponentsReportC(id);
        }

        public IEnumerable<serviceComponentsReportSCResponse> GetServiceComponentsReportSC(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceComponentsReportSC(id);
        }

        public IEnumerable<serviceComponentsReport_DxListResponse> GetServiceComponentsReport_DxList(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetServiceComponentsReport_DxList(obj);
        }

        public IEnumerable<serviceComponentsReport_New312Response> GetServiceComponentsReport_New312(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceComponentsReport_New312(id);
        }

        public IEnumerable<serviceComponentsReport_Newlab_1Response> GetServiceComponentsReport_NewLab_1(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceComponentsReport_NewLab_1(id);
        }

        public IEnumerable<serviceComponentsReport_Newlab_2Response> GetServiceComponentsReport_NewLab_2(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceComponentsReport_NewLab_2(id);
        }

        public IEnumerable<serviceDisgnosticsReportsResponse> GetServiceDisgnosticsReports(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceDisgnosticsReports(id);
        }

        public IEnumerable<servicerecommendationbydiagnosticrepositoryidreportResponse> GetServiceRecommendationByDiagnosticRepositoryIdReport(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceRecommendationByDiagnosticRepositoryIdReport(id);
        }

        public IEnumerable<serviceRecommendationByServiceIdResponse> GetServiceRecommendationByServiceId(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceRecommendationByServiceId(id);
        }

        public IEnumerable<serviceReportResponse> GetServiceReport(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceReport(id);
        }

        public IEnumerable<serviceRestrictionByDiagnosticrepositoryidreport> GetServiceRestrictionByDiagnosticRepositoryIdReport(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceRestrictionByDiagnosticRepositoryIdReport(id);
        }

        public IEnumerable<serviceShortResponse> GetServiceShort(string id)
        {
            return _unitOfWork.IOrdenreporte.GetServiceShort(id);
        }

        public IEnumerable<serviceComponentFieldValuesListResponse> GetValoresComponente(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetValoresComponente(obj);
        }

        public IEnumerable<valoresComponenteAmcResponse> GetValoresComponenteAMC(filtroServicioYCategoriaRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetValoresComponenteAMC(obj);
        }

        public IEnumerable<valoresComponenteOdontogramaResponse> GetValoresComponenteOdontograma(filtroServicioComponentePathRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetValoresComponenteOdontograma(obj);
        }

        public IEnumerable<serviceComponentFieldValuesListUserControlResponse> GetValoresComponenteOdontogramaAusente(filtroServicioComponentePathRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetValoresComponenteOdontogramaAusente(obj);
        }

        public IEnumerable<serviceComponentFieldValuesListUserControlResponse> GetValoresComponenteOdontogramaValue1(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetValoresComponenteOdontogramaValue1(obj);
        }

        public IEnumerable<serviceComponentFieldValuesListUserControlResponse> GetValoresComponentesUserControl(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetValoresComponentesUserControl(obj);
        }

        public IEnumerable<valoresComponente_ObservadoAmcResponse> GetValoresComponente_ObservadoAMC(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetValoresComponente_ObservadoAMC(obj);
        }

        public IEnumerable<valoresExamenComponeteResponse> GetValoresExamenComponete(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.GetValoresExamenComponete(obj);
        }

        public int Insert(OrdenReporte obj)
        {
            return _unitOfWork.IOrdenreporte.Insert(obj);
        }

        public IEnumerable<obtenerIdsImporacionResponse> ObtenerIdsParaImportacionExcel(filtroServicioYCategoriaRequest obj)
        {
            return _unitOfWork.IOrdenreporte.ObtenerIdsParaImportacionExcel(obj);
        }

        public IEnumerable<ucOsteoResponse> ReporteOsteomuscular(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.ReporteOsteomuscular(obj);
        }

        public bool Update(OrdenReporte obj)
        {
            return _unitOfWork.IOrdenreporte.Update(obj);
        }

        public IEnumerable<serviceComponentFieldValuesListUserControlResponse> ValoresComponenteOdontograma1(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IOrdenreporte.ValoresComponenteOdontograma1(obj);
        }

        
    }
}
