using Data.Model.Request.atencionmedica;
using Data.Model.Request.gerencia;
using Data.Model.Request.reportes;
using Data.Model.Response;
using Data.Model.Response.atencionmedica;
using Data.Model.Response.reportes;
using Data.Model.Response.service;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Business.Logic.IContractsBL.service
{
    public interface IServiceLogic
    {
        bool Update(Data.Model.Entities.service.service obj);
        int Insert(Data.Model.Entities.service.service obj);
        IEnumerable<Data.Model.Entities.service.service> GetList();
        Data.Model.Entities.service.service GetById(string id);
        bool Delete(Data.Model.Entities.service.service obj);
        IEnumerable<componentsByServiceResponse> GetAllComponentsByService(string id);
        IEnumerable<keyValueDtoResponse> GetServiceByPersonForCombo(string id);
        IEnumerable<keyValueDtoResponse> GetSystemParameterForComboForm(string id);
        IEnumerable<keyValueDtoResponse> GetSystemParameterForCombo(int id);
        IEnumerable<keyValueDtoResponse> GetFormAction(formActionRequest obj);
        servicePersonDataResponse GetServicePersonData(string id);
        IEnumerable<componentListResponse> ListMissingExamenesNames(serviceNodeRoleRequest obj);
        componentListResponse ConcatenateComponents(filtroServicioComponenteRequest obj);
        serviceDataResponse GetServiceData(string id);
        IEnumerable<recomendationListResponse> ExamenByDefaultOrAssigned_valueFieldsRecome(filtroServicioComponenteRequest obj);
        IEnumerable<personMedicalHistoryListNew1Response> GetAntecedentConsolidateForServiceAll(string id);
        IEnumerable<serviceListNew1Response> GetServicesConsolidateForServiceNew(string id);
        IEnumerable<keyValueDtoResponse> GetSystemParameterForComboFormEsoN();
        IEnumerable<serviceComponentDisgnosticsByServiceIdResponse>  GetServiceComponentDisgnosticsByServiceId(string id);
        IEnumerable<serviceComponentconClusionesDxServiceId> GetServiceComponentConclusionesDxServiceId(string id);
        IEnumerable<recomendationListResponse> GetServiceRecommendationByServiceIdN(string id);
        IEnumerable<valorComponenteListResponse> DevolverValorCampoPorServicioMejoradoUnServicio(string id);
        IEnumerable<recetaDespachoDtoResponse> GetRecetaToReportGlobal(recetadespachoDtoRequest obj);
        BindingList<ServiceGridJerarquizadaList> GetServiceAtence(ServiceFilter obj);
        ExamsAndFieldsList ListExamenes_SP(ExamRequestDTO obj);
        InformacionPacientSimpl GetPacienteInforSimp(string id);
        void InsertServiceComponentFieldValues(List<ServiceComponentFieldValuesResponse> obj);
        IEnumerable<HospitalizacionListResponse> GetHospitalizacionPagedAndFilteredMS(FiltroFechaInicioFechaFin obj);
        IEnumerable<DxFrecuenteResponse> GetDiagnosticFrecList(FiltroDxFrecuente obj);
        IEnumerable<ListVentasFarmacia> GetVeentasFarmacia(FiltroBusquedaMSVentasFarmacia obj);
        IEnumerable<keyValueDtoResponse> GetSystemParameterForComboFilt(int id);
    }
}
