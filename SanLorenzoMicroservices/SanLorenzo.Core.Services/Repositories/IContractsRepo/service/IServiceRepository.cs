using Data.Model.Request.atencionmedica;
using Data.Model.Request.gerencia;
using Data.Model.Request.reportes;
using Data.Model.Response;
using Data.Model.Response.atencionmedica;
using Data.Model.Response.gerencia;
using Data.Model.Response.service;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Repositories.IContractsRepo.service
{
    public interface IServiceRepository : IRepository<Data.Model.Entities.service.service>
    {
        componentListResponse ConcatenateComponents(filtroServicioComponenteRequest obj);
        IEnumerable<valorComponenteListResponse> DevolverValorCampoPorServicioMejoradoUnServicio(string id);
        IEnumerable<recomendationListResponse> ExamenByDefaultOrAssigned_valueFieldsRecome(filtroServicioComponenteRequest obj);
        IEnumerable<componentsByServiceResponse> GetAllComponentsByService(string id);
        IEnumerable<personMedicalHistoryListNew1Response> GetAntecedentConsolidateForServiceAll(string id);
        IEnumerable<DxFrecuenteResponse> GetDiagnosticFrecList(FiltroDxFrecuente obj);
        IEnumerable<keyValueDtoResponse> GetFormAction(formActionRequest obj);
        IEnumerable<HospitalizacionListResponse> GetHospitalizacionPagedAndFilteredMS(FiltroFechaInicioFechaFin obj);
        InformacionPacientSimpl GetPacienteInforSimp(string id);
        IEnumerable<recetaDespachoDtoResponse> GetRecetaToReportGlobal(recetadespachoDtoRequest obj);
        BindingList<ServiceGridJerarquizadaList> GetServiceAtence(ServiceFilter obj);
        IEnumerable<keyValueDtoResponse> GetServiceByPersonForCombo(string id);
        IEnumerable<serviceComponentconClusionesDxServiceId> GetServiceComponentConclusionesDxServiceId(string id);
        IEnumerable<serviceComponentDisgnosticsByServiceIdResponse> GetServiceComponentDisgnosticsByServiceId(string id);
        serviceDataResponse GetServiceData(string id);
        servicePersonDataResponse GetServicePersonData(string id);
        IEnumerable<recomendationListResponse> GetServiceRecommendationByServiceIdN(string id);
        IEnumerable<serviceListNew1Response> GetServicesConsolidateForServiceNew(string id);
        IEnumerable<keyValueDtoResponse> GetSystemParameterForCombo(int id);
        IEnumerable<keyValueDtoResponse> GetSystemParameterForComboFilt(int id);
        IEnumerable<keyValueDtoResponse> GetSystemParameterForComboForm(string id);
        IEnumerable<keyValueDtoResponse> GetSystemParameterForComboFormEsoN();
        IEnumerable<ListVentasFarmacia> GetVeentasFarmacia(FiltroBusquedaMSVentasFarmacia obj);
        void InsertServiceComponentFieldValues(List<ServiceComponentFieldValuesResponse> obj);
        ExamsAndFieldsList ListExamenes_SP(ExamRequestDTO obj);
        IEnumerable<componentListResponse> ListMissingExamenesNames(serviceNodeRoleRequest obj);
    }
}
