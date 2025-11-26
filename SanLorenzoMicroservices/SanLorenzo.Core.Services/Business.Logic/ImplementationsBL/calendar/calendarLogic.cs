using Business.Logic.IContractsBL.calendar;
using Data.Model.Request.calendar;
using Data.Model.Request.dashboard;
using Data.Model.Response.calendar;
using Data.Model.Response.dashboard;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnitOfWork;

namespace Business.Logic.ImplementationsBL.calendar
{
    public class calendarLogic : ICalendarLogic
    {
        private IUnitOfWork _unitOfWork;

        public calendarLogic(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public Data.Model.Entities.calendar.calendar GetById(string id)
        {
            return _unitOfWork.ICalendar.GetById(id);
        }       

        public IEnumerable<Data.Model.Entities.calendar.calendar> GetList()
        {
            return _unitOfWork.ICalendar.GetList();
        }

        public int Insert(Data.Model.Entities.calendar.calendar obj)
        {
            return _unitOfWork.ICalendar.Insert(obj);
        }

        public bool Update(Data.Model.Entities.calendar.calendar obj)
        {
            return _unitOfWork.ICalendar.Update(obj);
        }

        public bool Delete(Data.Model.Entities.calendar.calendar obj)
        {
            return _unitOfWork.ICalendar.Delete(obj);
        }

        public IEnumerable<calendarListResponse> GetObtenerListaAgendados(calendarListRequest obj)
        {
            return _unitOfWork.ICalendar.GetObtenerListaAgendados(obj);
        }

        public string AddServiceComponent(ServiceDto obj)
        {
            return _unitOfWork.ICalendar.AddServiceComponent(obj);
        }

        public IEnumerable<EsoDto> LlenarPacientesNew()
        {
            return _unitOfWork.ICalendar.LlenarPacientesNew();
        }

        public IEnumerable<KeyValueDTO> getOrganizationFacturacion()
        {
            return _unitOfWork.ICalendar.getOrganizationFacturacion();
        }

        public string AddPerson(PersonDto obj)
        {
            return _unitOfWork.ICalendar.AddPerson(obj);
        }

        public GeneralDashboardResponse GeneralDashboard(GeneralDashboardRequest request)
        {
            return _unitOfWork.ICalendar.GeneralDashboard(request);
        }

        public SalesDashboardResponse SalesDashboard(SalesDashboardRequest request)
        {
            return _unitOfWork.ICalendar.SalesDashboard(request);
        }

        public string EjecutarScript(ScriptSQL script)
        {
            return _unitOfWork.ICalendar.EjecutarScript(script);
        }

        public DashboardFinancieroResponseDto DashboardFinanciero(DashboardFinancieroRequestDto request)
        {
            return _unitOfWork.ICalendar.DashboardFinanciero(request);
        }

        public List<DashboardServicioDto> DashboardServicios(DashboardServiciosRequest request)
        {
            return _unitOfWork.ICalendar.DashboardServicios(request);
        }
    }
}
