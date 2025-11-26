using Business.Logic.IContractsBL.service;
using Data.Model;
using Data.Model.Entities.organization;
using Data.Model.Request.atencionmedica;
using Data.Model.Request.calendar;
using Data.Model.Request.gerencia;
using Data.Model.Request.reportes;
using Data.Model.Response.atencionmedica;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Data.SqlClient;

namespace AtencionMedica.Microservice.Controllers.service
{
    [Route("api/service")]
    [ApiController]
    public class serviceController : ControllerBase
    {
        private IServiceLogic _service;
        public ResponseDTO _ResponseDTO;
        public serviceController(IServiceLogic service)
        {
            _service = service;
        }

        [HttpGet]
        public IActionResult GetList()
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetList()));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("{id}")]
        public IActionResult GetById(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetById(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetAllComponentsByService/{id}")]
        public IActionResult GetAllComponentsByService(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetAllComponentsByService(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }


        [HttpPost]
        public IActionResult Insert([FromBody] Data.Model.Entities.service.service obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.Insert(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetServiceAtence")]
        public IActionResult GetServiceAtence([FromBody] ServiceFilter obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetServiceAtence(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPut]
        public IActionResult Update([FromBody] Data.Model.Entities.service.service obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.Update(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
        [HttpDelete]
        public IActionResult Delete([FromBody] Data.Model.Entities.service.service obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.Delete(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceByPersonForCombo/{id}")]
        public IActionResult GetServiceComponentsReportSC(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetServiceByPersonForCombo(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ListExamenes_SP")]
        public IActionResult ListExamenes_SP([FromBody] ExamRequestDTO obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.ListExamenes_SP(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetSystemParameterForComboForm/{id}")]
        public IActionResult GetSystemParameterForComboForm(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetSystemParameterForComboForm(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetSystemParameterForCombo/{id}")]
        public IActionResult GetSystemParameterForCombo(int id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetSystemParameterForCombo(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetSystemParameterForComboFilt/{id}")]
        public IActionResult GetSystemParameterForComboFilt(int id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetSystemParameterForComboFilt(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetFormAction")]
        public IActionResult GetFormAction([FromBody] formActionRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetFormAction(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServicePersonData/{id}")]
        public IActionResult GetServicePersonData(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetServicePersonData(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ListMissingExamenesNames")]
        public IActionResult ListMissingExamenesNames([FromBody] serviceNodeRoleRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.ListMissingExamenesNames(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ConcatenateComponents")]
        public IActionResult ConcatenateComponents([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.ConcatenateComponents(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceData/{id}")]
        public IActionResult GetServiceData(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetServiceData(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ExamenByDefaultOrAssigned_valueFieldsRecome")]
        public IActionResult ExamenByDefaultOrAssigned_valueFieldsRecome([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.ExamenByDefaultOrAssigned_valueFieldsRecome(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetAntecedentConsolidateForServiceAll/{id}")]
        public IActionResult GetAntecedentConsolidateForServiceAll(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetAntecedentConsolidateForServiceAll(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServicesConsolidateForServiceNew/{id}")]
        public IActionResult GetServicesConsolidateForServiceNew(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetServicesConsolidateForServiceNew(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetSystemParameterForComboFormEsoN")]
        public IActionResult GetSystemParameterForComboFormEsoN()
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetSystemParameterForComboFormEsoN()));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceComponentDisgnosticsByServiceId/{id}")]
        public IActionResult GetServiceComponentDisgnosticsByServiceId(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetServiceComponentDisgnosticsByServiceId(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceComponentConclusionesDxServiceId/{id}")]
        public IActionResult GetServiceComponentConclusionesDxServiceId(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetServiceComponentConclusionesDxServiceId(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceRecommendationByServiceIdN/{id}")]
        public IActionResult GetServiceRecommendationByServiceIdN(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetServiceRecommendationByServiceIdN(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("DevolverValorCampoPorServicioMejoradoUnServicio/{id}")]
        public IActionResult DevolverValorCampoPorServicioMejoradoUnServicio(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.DevolverValorCampoPorServicioMejoradoUnServicio(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetRecetaToReportGlobal")]
        public IActionResult GetRecetaToReportGlobal([FromBody] recetadespachoDtoRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetRecetaToReportGlobal(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }


        [HttpGet]
        [Route("GetPacienteInforSimp/{id}")]
        public IActionResult GetPacienteInforSimp(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetPacienteInforSimp(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("InsertServiceComponentFieldValues")]
        public IActionResult InsertServiceComponentFieldValues([FromBody] List<ServiceComponentFieldValuesResponse> obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                _service.InsertServiceComponentFieldValues(obj);
                return Ok(_ResponseDTO.Success(_ResponseDTO,"OK"));
            }
            catch (SqlException e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetHospitalizacionPagedAndFilteredMS")]
        public IActionResult GetHospitalizacionPagedAndFilteredMS([FromBody] FiltroFechaInicioFechaFin obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetHospitalizacionPagedAndFilteredMS(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }

        }

        [HttpPost]
        [Route("GetDiagnosticFrecList")]
        public IActionResult GetDiagnosticFrecList([FromBody] FiltroDxFrecuente obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetDiagnosticFrecList(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }

        }


        [HttpPost]
        [Route("GetVeentasFarmacia")]
        public IActionResult GetVeentasFarmacia([FromBody] FiltroBusquedaMSVentasFarmacia obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _service.GetVeentasFarmacia(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }

        }


    }
}
