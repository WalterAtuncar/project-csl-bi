using Business.Logic.IContractsBL.especialidades;
using Data.Model;
using Data.Model.Request.especialidades;
using Data.Model.Response.especialidades;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Agenda.Microservice.Controllers.especialidades
{
    [Route("api/[controller]")]
    [ApiController]
    [Produces("application/json")]
    [Consumes("application/json")]
    public class EspecialidadesController : ControllerBase
    {
        private IEspecialidadesLogic _especialidadesLogic;
        public ResponseDTO _ResponseDTO;

        public EspecialidadesController(IEspecialidadesLogic especialidadesLogic)
        {
            _especialidadesLogic = especialidadesLogic;
        }

        /// <summary>
        /// Crear una nueva especialidad médica
        /// </summary>
        /// <param name="request">Datos para crear la especialidad</param>
        /// <returns>Respuesta con la especialidad creada</returns>
        /// <response code="200">Especialidad creada exitosamente. El objModel contiene un objeto CreateEspecialidadResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPost]
        [ProducesResponseType(typeof(CreateEspecialidadResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult CreateEspecialidad([FromBody] CreateEspecialidadRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _especialidadesLogic.CreateEspecialidad(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Obtener todas las especialidades médicas
        /// </summary>
        /// <param name="includeDeleted">Incluir especialidades eliminadas</param>
        /// <returns>Lista de todas las especialidades</returns>
        /// <response code="200">Lista obtenida exitosamente. El objModel contiene una lista de EspecialidadResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet]
        [ProducesResponseType(typeof(List<EspecialidadResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GetAllEspecialidades([FromQuery] bool includeDeleted = false)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _especialidadesLogic.GetAllEspecialidades(includeDeleted);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Obtener especialidad médica por ID
        /// </summary>
        /// <param name="id">ID de la especialidad</param>
        /// <returns>Datos de la especialidad encontrada</returns>
        /// <response code="200">Especialidad encontrada exitosamente. El objModel contiene un objeto GetEspecialidadByIdResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(GetEspecialidadByIdResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GetEspecialidadById([FromRoute] int id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _especialidadesLogic.GetEspecialidadById(id);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Actualizar especialidad médica
        /// </summary>
        /// <param name="id">ID de la especialidad a actualizar</param>
        /// <param name="request">Datos actualizados de la especialidad</param>
        /// <returns>Respuesta con la especialidad actualizada</returns>
        /// <response code="200">Especialidad actualizada exitosamente. El objModel contiene un objeto UpdateEspecialidadResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(UpdateEspecialidadResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult UpdateEspecialidad([FromRoute] int id, [FromBody] UpdateEspecialidadRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _especialidadesLogic.UpdateEspecialidad(id, request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Eliminar especialidad médica (eliminación lógica)
        /// </summary>
        /// <param name="id">ID de la especialidad a eliminar</param>
        /// <param name="userId">ID del usuario que realiza la eliminación</param>
        /// <returns>Respuesta de confirmación de eliminación</returns>
        /// <response code="200">Especialidad eliminada exitosamente. El objModel contiene un objeto DeleteEspecialidadResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(typeof(DeleteEspecialidadResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult DeleteEspecialidad([FromRoute] int id, [FromQuery] int userId)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _especialidadesLogic.DeleteEspecialidad(id, userId);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Actualizar solo el porcentaje de pago de una especialidad
        /// </summary>
        /// <param name="id">ID de la especialidad</param>
        /// <param name="request">Nuevo porcentaje de pago</param>
        /// <returns>Respuesta con el porcentaje actualizado</returns>
        /// <response code="200">Porcentaje actualizado exitosamente. El objModel contiene un objeto UpdatePorcentajeResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPatch("{id}/porcentaje")]
        [ProducesResponseType(typeof(UpdatePorcentajeResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult UpdatePorcentajePago([FromRoute] int id, [FromBody] UpdatePorcentajeRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _especialidadesLogic.UpdatePorcentajePago(id, request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Buscar especialidades con filtros
        /// </summary>
        /// <param name="request">Filtros de búsqueda</param>
        /// <returns>Lista de especialidades filtradas</returns>
        /// <response code="200">Búsqueda realizada exitosamente. El objModel contiene una lista de EspecialidadResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("search")]
        [ProducesResponseType(typeof(List<EspecialidadResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult SearchEspecialidades([FromQuery] SearchEspecialidadesRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _especialidadesLogic.SearchEspecialidades(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Buscar profesionales por texto
        /// </summary>
        /// <param name="request">Texto de búsqueda para encontrar profesionales</param>
        /// <returns>Lista de profesionales que coinciden con la búsqueda</returns>
        /// <response code="200">Búsqueda realizada exitosamente. El objModel contiene una lista de ProfesionalDto</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("profesionales/search")]
        [ProducesResponseType(typeof(List<ProfesionalDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult BuscarProfesionales([FromQuery] BuscarProfesionalesRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _especialidadesLogic.BuscarProfesionales(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
    }
} 