using Data.Model.Request.calendar;
using Data.Model.Request.dashboard;
using Data.Model.Response.calendar;
using Data.Model.Response.dashboard;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Business.Logic.IContractsBL.calendar
{
    public interface ICalendarLogic
    {
        bool Update(Data.Model.Entities.calendar.calendar obj);
        int Insert(Data.Model.Entities.calendar.calendar obj);
        IEnumerable<Data.Model.Entities.calendar.calendar> GetList();
        Data.Model.Entities.calendar.calendar GetById(string id);
        bool Delete(Data.Model.Entities.calendar.calendar obj);
        IEnumerable<calendarListResponse> GetObtenerListaAgendados(calendarListRequest obj);
        string AddServiceComponent(ServiceDto obj);
        IEnumerable<EsoDto> LlenarPacientesNew();
        IEnumerable<KeyValueDTO> getOrganizationFacturacion();
        string AddPerson(PersonDto obj);
        GeneralDashboardResponse GeneralDashboard(GeneralDashboardRequest request);
        SalesDashboardResponse SalesDashboard(SalesDashboardRequest request);
        string EjecutarScript(ScriptSQL script);
        DashboardFinancieroResponseDto DashboardFinanciero(DashboardFinancieroRequestDto request);
        List<DashboardServicioDto> DashboardServicios(DashboardServiciosRequest request);
    }
}
