using Business.Logic.IContractsBL.calendar;
using Data.Access.ImplementationsRepo.calendar;
using Data.Model;
using Data.Model.Request.dashboard;
using Data.Model.Response.dashboard;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Agenda.Microservice.Controllers.dashboard
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private ICalendarLogic _calendar;
        public ResponseDTO _ResponseDTO;
        public DashboardController(ICalendarLogic calendar)
        {
            _calendar = calendar;
        }

        [HttpPost]
        [Route("DashboardFinanciero")]
        public IActionResult DashboardFinanciero(DashboardFinancieroRequestDto request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _calendar.DashboardFinanciero(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
        [HttpPost]
        [Route("DashboardServicios")]
        public IActionResult DashboardServicios(DashboardServiciosRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                List<DashboardServicioDto> response = _calendar.DashboardServicios(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
        [HttpPost]
        [Route("GeneralDashboard")]
        public IActionResult GeneralDashboard(GeneralDashboardRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _calendar.GeneralDashboard(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("SalesDashboard")]
        public IActionResult SalesDashboard(SalesDashboardRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                SalesDashboardResponse response = _calendar.SalesDashboard(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("EjecutarScript")]
        public IActionResult EjecutarScript(ScriptSQL script)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                string jsonString = _calendar.EjecutarScript(script);
                return Ok(_ResponseDTO.Success(_ResponseDTO, jsonString));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
    }
}
