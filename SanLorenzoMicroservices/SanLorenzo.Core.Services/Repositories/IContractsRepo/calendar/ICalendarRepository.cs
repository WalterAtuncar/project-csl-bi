using Data.Model.Request.calendar;
using Data.Model.Request.dashboard;
using Data.Model.Response.calendar;
using Data.Model.Response.dashboard;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Repositories.IContractsRepo.calendar
{
    public interface ICalendarRepository : IRepository<Data.Model.Entities.calendar.calendar>
    {
        string AddPerson(PersonDto obj);
        string AddServiceComponent(ServiceDto obj);
        DashboardFinancieroResponseDto DashboardFinanciero(DashboardFinancieroRequestDto request);
        List<DashboardServicioDto> DashboardServicios(DashboardServiciosRequest request);
        string EjecutarScript(ScriptSQL script);
        GeneralDashboardResponse GeneralDashboard(GeneralDashboardRequest request);
        IEnumerable<calendarListResponse> GetObtenerListaAgendados(calendarListRequest obj);
        IEnumerable<KeyValueDTO> getOrganizationFacturacion();
        IEnumerable<EsoDto> LlenarPacientesNew();
        SalesDashboardResponse SalesDashboard(SalesDashboardRequest request);
    }
}
