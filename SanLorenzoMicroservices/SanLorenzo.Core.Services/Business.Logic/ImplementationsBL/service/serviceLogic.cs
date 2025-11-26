using Business.Logic.IContractsBL.service;
using Data.Model.Request.atencionmedica;
using Data.Model.Request.gerencia;
using Data.Model.Request.reportes;
using Data.Model.Response;
using Data.Model.Response.atencionmedica;
using Data.Model.Response.service;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnitOfWork;

namespace Business.Logic.ImplementationsBL.service
{
    public class serviceLogic : IServiceLogic
    {
        private IUnitOfWork _unitOfWork;

        public serviceLogic(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public Data.Model.Entities.service.service GetById(string id)
        {
            return _unitOfWork.IService.GetById(id);
        }

        public IEnumerable<Data.Model.Entities.service.service> GetList()
        {
            return _unitOfWork.IService.GetList();
        }

        public int Insert(Data.Model.Entities.service.service obj)
        {
            return _unitOfWork.IService.Insert(obj);
        }

        public bool Update(Data.Model.Entities.service.service obj)
        {
            return _unitOfWork.IService.Update(obj);
        }

        public bool Delete(Data.Model.Entities.service.service obj)
        {
            return _unitOfWork.IService.Delete(obj);
        }

        public IEnumerable<componentsByServiceResponse> GetAllComponentsByService(string id)
        {
            return _unitOfWork.IService.GetAllComponentsByService(id);
        }

        public IEnumerable<keyValueDtoResponse> GetServiceByPersonForCombo(string id)
        {
            return _unitOfWork.IService.GetServiceByPersonForCombo(id);
        }

        public IEnumerable<keyValueDtoResponse> GetSystemParameterForComboForm(string id)
        {
            return _unitOfWork.IService.GetSystemParameterForComboForm(id);
        }

        public IEnumerable<keyValueDtoResponse> GetSystemParameterForCombo(int id)
        {
            return _unitOfWork.IService.GetSystemParameterForCombo(id);
        }

        public IEnumerable<keyValueDtoResponse> GetFormAction(formActionRequest obj)
        {
            return _unitOfWork.IService.GetFormAction(obj);
        }

        public servicePersonDataResponse GetServicePersonData(string id)
        {
            return _unitOfWork.IService.GetServicePersonData(id);
        }

        public IEnumerable<componentListResponse> ListMissingExamenesNames(serviceNodeRoleRequest obj)
        {
            return _unitOfWork.IService.ListMissingExamenesNames(obj);
        }

        public componentListResponse ConcatenateComponents(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IService.ConcatenateComponents(obj);
        }

        public serviceDataResponse GetServiceData(string id)
        {
            return _unitOfWork.IService.GetServiceData(id);
        }

        public IEnumerable<recomendationListResponse> ExamenByDefaultOrAssigned_valueFieldsRecome(filtroServicioComponenteRequest obj)
        {
            return _unitOfWork.IService.ExamenByDefaultOrAssigned_valueFieldsRecome(obj);
        }

        public IEnumerable<personMedicalHistoryListNew1Response> GetAntecedentConsolidateForServiceAll(string id)
        {
            return _unitOfWork.IService.GetAntecedentConsolidateForServiceAll(id);
        }

        public IEnumerable<serviceListNew1Response> GetServicesConsolidateForServiceNew(string id)
        {
            return _unitOfWork.IService.GetServicesConsolidateForServiceNew(id);
        }

        public IEnumerable<keyValueDtoResponse> GetSystemParameterForComboFormEsoN()
        {
            return _unitOfWork.IService.GetSystemParameterForComboFormEsoN();
        }

        public IEnumerable<serviceComponentDisgnosticsByServiceIdResponse> GetServiceComponentDisgnosticsByServiceId(string id)
        {
            return _unitOfWork.IService.GetServiceComponentDisgnosticsByServiceId(id);
        }

        public IEnumerable<serviceComponentconClusionesDxServiceId> GetServiceComponentConclusionesDxServiceId(string id)
        {
            return _unitOfWork.IService.GetServiceComponentConclusionesDxServiceId(id);
        }

        public IEnumerable<recomendationListResponse> GetServiceRecommendationByServiceIdN(string id)
        {
            return _unitOfWork.IService.GetServiceRecommendationByServiceIdN(id);
        }

        public IEnumerable<valorComponenteListResponse> DevolverValorCampoPorServicioMejoradoUnServicio(string id)
        {
            return _unitOfWork.IService.DevolverValorCampoPorServicioMejoradoUnServicio(id);
        }

        public IEnumerable<recetaDespachoDtoResponse> GetRecetaToReportGlobal(recetadespachoDtoRequest obj)
        {
            return _unitOfWork.IService.GetRecetaToReportGlobal(obj);
        }

        public BindingList<ServiceGridJerarquizadaList> GetServiceAtence(ServiceFilter obj)
        {
            return _unitOfWork.IService.GetServiceAtence(obj);
        }

        public ExamsAndFieldsList ListExamenes_SP(ExamRequestDTO obj)
        {
            return _unitOfWork.IService.ListExamenes_SP(obj);
        }

        public InformacionPacientSimpl GetPacienteInforSimp(string id)
        {
            return _unitOfWork.IService.GetPacienteInforSimp(id);
        }

        public void InsertServiceComponentFieldValues(List<ServiceComponentFieldValuesResponse> obj)
        {
            _unitOfWork.IService.InsertServiceComponentFieldValues(obj);

        }

        public IEnumerable<HospitalizacionListResponse> GetHospitalizacionPagedAndFilteredMS(FiltroFechaInicioFechaFin obj)
        {
            return _unitOfWork.IService.GetHospitalizacionPagedAndFilteredMS(obj);
        }

        public IEnumerable<DxFrecuenteResponse> GetDiagnosticFrecList(FiltroDxFrecuente obj)
        {
            return _unitOfWork.IService.GetDiagnosticFrecList(obj);
        }

        public IEnumerable<ListVentasFarmacia> GetVeentasFarmacia(FiltroBusquedaMSVentasFarmacia obj)
        {
            return _unitOfWork.IService.GetVeentasFarmacia(obj);
        }

        public IEnumerable<keyValueDtoResponse> GetSystemParameterForComboFilt(int id)
        {
            return _unitOfWork.IService.GetSystemParameterForComboFilt(id);
        }
    }
}
