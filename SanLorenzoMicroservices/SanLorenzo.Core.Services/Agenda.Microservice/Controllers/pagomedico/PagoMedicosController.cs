using Business.Logic.IContractsBL.pagomedico;
using Data.Model;
using Data.Model.Request.pagomedico;
using Data.Model.Response.pagomedico;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Agenda.Microservice.Controllers.pagomedico
{
    [Route("api/[controller]")]
    [ApiController]
    [Produces("application/json")]
    [Consumes("application/json")]
    public class PagoMedicosController : ControllerBase
    {
        private IPagoMedicosLogic _pagoMedicosLogic;
        public ResponseDTO _ResponseDTO;

        public PagoMedicosController(IPagoMedicosLogic pagoMedicosLogic)
        {
            _pagoMedicosLogic = pagoMedicosLogic;
        }

        /// <summary>
        /// Generar pago completo a médico (cabecera + detalle)
        /// </summary>
        /// <param name="request">Datos para generar el pago completo con servicios</param>
        /// <returns>Respuesta con el pago generado</returns>
        /// <response code="200">Pago generado exitosamente. El objModel contiene un objeto GenerarPagoMedicoResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPost]
        [ProducesResponseType(typeof(GenerarPagoMedicoResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GenerarPagoMedicoCompleto([FromBody] GenerarPagoMedicoRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _pagoMedicosLogic.GenerarPagoMedicoCompleto(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Eliminar pago médico completo (eliminación lógica)
        /// </summary>
        /// <param name="id">ID del pago a eliminar</param>
        /// <param name="request">Datos para la eliminación</param>
        /// <returns>Respuesta de confirmación de eliminación</returns>
        /// <response code="200">Pago eliminado exitosamente. El objModel contiene un objeto EliminarPagoMedicoResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(typeof(EliminarPagoMedicoResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult EliminarPagoMedicoCompleto([FromRoute] int id, [FromBody] EliminarPagoMedicoRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                request.i_PaidId = id; // Asegurarse de que el ID coincida
                var response = _pagoMedicosLogic.EliminarPagoMedicoCompleto(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Obtener pago médico completo por ID
        /// </summary>
        /// <param name="id">ID del pago a consultar</param>
        /// <returns>Datos completos del pago (cabecera + detalle)</returns>
        /// <response code="200">Pago encontrado exitosamente. El objModel contiene un objeto GetPagoMedicoCompletoByIdResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(GetPagoMedicoCompletoByIdResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GetPagoMedicoCompletoById([FromRoute] int id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new GetPagoMedicoByIdRequest { i_PaidId = id };
                var response = _pagoMedicosLogic.GetPagoMedicoCompletoById(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
        [HttpGet("info")]
        public IActionResult GetOrganizationInfo()
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                OrganizationInfoResponse response = _pagoMedicosLogic.GetOrganizationInfo();
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
        /// <summary>
        /// Listar pagos médicos con filtros
        /// </summary>
        /// <param name="request">Filtros para buscar pagos</param>
        /// <returns>Lista de pagos que coinciden con los filtros</returns>
        /// <response code="200">Lista obtenida exitosamente. El objModel contiene una lista de ListarPagosMedicosResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet]
        [ProducesResponseType(typeof(List<ListarPagosMedicosResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult ListarPagosMedicos([FromQuery] ListarPagosMedicosRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _pagoMedicosLogic.ListarPagosMedicos(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Obtener análisis completo de servicios y pagos de un médico
        /// </summary>
        /// <param name="request">Filtros para el análisis (médico y fechas)</param>
        /// <returns>Análisis completo con servicios pagados y pendientes</returns>
        /// <response code="200">Análisis generado exitosamente. El objModel contiene un objeto PagoMedicoCompletoResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("analisis")]
        [ProducesResponseType(typeof(PagoMedicoCompletoResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult PagoMedicoCompleto([FromQuery] PagoMedicoCompletoRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _pagoMedicosLogic.PagoMedicoCompleto(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Obtener lista de médicos/usuarios por consultorio
        /// </summary>
        /// <param name="consultorioId">ID del consultorio (null para obtener todos)</param>
        /// <returns>Lista de médicos filtrados por consultorio</returns>
        /// <response code="200">Lista de médicos obtenida exitosamente. El objModel contiene una lista de MedicoByConsultorioResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("medicos")]
        [ProducesResponseType(typeof(List<MedicoByConsultorioResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GetMedicosByConsultorio([FromQuery] int? consultorioId = null)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _pagoMedicosLogic.GetMedicosByConsultorio(consultorioId);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Actualizar médico tratante de un componente de servicio
        /// </summary>
        /// <param name="request">Datos para actualizar el médico tratante</param>
        /// <returns>Respuesta indicando si la actualización fue exitosa</returns>
        /// <response code="200">Médico tratante actualizado exitosamente. El objModel contiene UpdateMedicoTratanteResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPut("medico-tratante")]
        [ProducesResponseType(typeof(UpdateMedicoTratanteResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult UpdateMedicoTratante([FromBody] UpdateMedicoTratanteRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _pagoMedicosLogic.UpdateMedicoTratante(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
    }
} 