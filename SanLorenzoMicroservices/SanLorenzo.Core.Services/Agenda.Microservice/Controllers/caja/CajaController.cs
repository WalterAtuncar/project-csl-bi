using Business.Logic.IContractsBL.caja;
using Data.Model;
using Data.Model.Request.caja;
using Data.Model.Response.caja;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;

namespace Agenda.Microservice.Controllers.caja
{
    [Route("api/[controller]")]
    [ApiController]
    [Produces("application/json")]
    [Consumes("application/json")]
    public class CajaController : ControllerBase
    {
        private ICajaLogic _cajaLogic;
        public ResponseDTO _ResponseDTO;

        public CajaController(ICajaLogic cajaLogic)
        {
            _cajaLogic = cajaLogic;
        }

        // ================================================
        // ENDPOINTS PARA CAJA MAYOR
        // ================================================

        /// <summary>
        /// Crear una nueva caja mayor con su detalle
        /// </summary>
        /// <param name="request">Datos para crear la caja mayor</param>
        /// <returns>Respuesta con la caja mayor creada</returns>
        /// <response code="200">Caja mayor creada exitosamente. El objModel contiene un objeto CreateCajaMayorResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPost("caja-mayor")]
        [ProducesResponseType(typeof(CreateCajaMayorResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult CreateCajaMayor([FromBody] CreateCajaMayorRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.CreateCajaMayor(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Actualizar una caja mayor existente
        /// </summary>
        /// <param name="request">Datos para actualizar la caja mayor</param>
        /// <returns>Respuesta con la caja mayor actualizada</returns>
        /// <response code="200">Caja mayor actualizada exitosamente. El objModel contiene un objeto CreateCajaMayorResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPut("caja-mayor")]
        [ProducesResponseType(typeof(CreateCajaMayorResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult UpdateCajaMayor([FromBody] UpdateCajaMayorRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.UpdateCajaMayor(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Obtener lista de cajas mayor con filtros
        /// </summary>
        /// <param name="request">Filtros de búsqueda</param>
        /// <returns>Lista de cajas mayor</returns>
        /// <response code="200">Lista obtenida exitosamente. El objModel contiene una lista de CajaMayorListResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("caja-mayor")]
        [ProducesResponseType(typeof(List<CajaMayorListResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GetCajaMayorList([FromQuery] GetCajaMayorListRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.GetCajaMayorList(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Obtener detalle completo de una caja mayor
        /// </summary>
        /// <param name="id">ID de la caja mayor</param>
        /// <returns>Detalle completo de la caja mayor</returns>
        /// <response code="200">Detalle obtenido exitosamente. El objModel contiene un objeto CajaMayorDetalleResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("caja-mayor/{id}")]
        [ProducesResponseType(typeof(CajaMayorDetalleResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GetCajaMayorDetalle([FromRoute] int id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.GetCajaMayorDetalle(id);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Cerrar una caja mayor
        /// </summary>
        /// <param name="request">Datos del cierre</param>
        /// <returns>Respuesta del cierre</returns>
        /// <response code="200">Caja mayor cerrada exitosamente. El objModel contiene un objeto CerrarCajaMayorResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPatch("caja-mayor/cerrar")]
        [ProducesResponseType(typeof(CerrarCajaMayorResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult CerrarCajaMayor([FromBody] CerrarCajaMayorRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.CerrarCajaMayor(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Eliminar una caja mayor (solo si está abierta)
        /// </summary>
        /// <param name="request">Datos de la eliminación</param>
        /// <returns>Respuesta de la eliminación</returns>
        /// <response code="200">Caja mayor eliminada exitosamente. El objModel contiene un objeto DeleteCajaMayorResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpDelete("caja-mayor")]
        [ProducesResponseType(typeof(DeleteCajaMayorResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult DeleteCajaMayor([FromBody] DeleteCajaMayorRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.DeleteCajaMayor(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Insertar detalle individual a una caja mayor existente (Compatible con SQL Server 2012)
        /// </summary>
        /// <param name="request">Datos del detalle a insertar</param>
        /// <returns>Respuesta de la inserción</returns>
        /// <response code="200">Detalle insertado exitosamente. El objModel contiene un objeto CreateCajaMayorResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPost("caja-mayor/detalle")]
        [ProducesResponseType(typeof(CreateCajaMayorResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult InsertCajaMayorDetalle([FromBody] InsertCajaMayorDetalleRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.InsertCajaMayorDetalle(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        // ================================================
        // ENDPOINTS PARA INGRESOS MENSUALES
        // ================================================

        /// <summary>
        /// Registrar un nuevo ingreso mensual
        /// </summary>
        /// <param name="request">Datos del ingreso</param>
        /// <returns>Respuesta con el ingreso creado</returns>
        /// <response code="200">Ingreso registrado exitosamente. El objModel contiene un objeto CreateIngresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPost("ingresos-mensuales")]
        [ProducesResponseType(typeof(CreateIngresoMensualResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult CreateIngresoMensual([FromBody] CreateIngresoMensualRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.CreateIngresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Obtener lista de ingresos mensuales con filtros
        /// </summary>
        /// <param name="request">Filtros de búsqueda</param>
        /// <returns>Lista de ingresos mensuales</returns>
        /// <response code="200">Lista obtenida exitosamente. El objModel contiene una lista de IngresoMensualListResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("ingresos-mensuales")]
        [ProducesResponseType(typeof(List<IngresoMensualListResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GetIngresoMensualList([FromQuery] GetIngresoMensualListRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.GetIngresoMensualList(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Actualizar un ingreso mensual existente
        /// </summary>
        /// <param name="request">Datos actualizados del ingreso</param>
        /// <returns>Respuesta de la actualización</returns>
        /// <response code="200">Ingreso actualizado exitosamente. El objModel contiene un objeto UpdateIngresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPut("ingresos-mensuales")]
        [ProducesResponseType(typeof(UpdateIngresoMensualResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult UpdateIngresoMensual([FromBody] UpdateIngresoMensualRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.UpdateIngresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Eliminar un ingreso mensual (eliminación lógica)
        /// </summary>
        /// <param name="request">Datos de la eliminación</param>
        /// <returns>Respuesta de la eliminación</returns>
        /// <response code="200">Ingreso eliminado exitosamente. El objModel contiene un objeto DeleteIngresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpDelete("ingresos-mensuales")]
        [ProducesResponseType(typeof(DeleteIngresoMensualResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult DeleteIngresoMensual([FromBody] DeleteIngresoMensualRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.DeleteIngresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        // ================================================
        // ENDPOINTS PARA EGRESOS MENSUALES
        // ================================================

        /// <summary>
        /// Registrar un nuevo egreso mensual
        /// </summary>
        /// <param name="request">Datos del egreso</param>
        /// <returns>Respuesta con el egreso creado</returns>
        /// <response code="200">Egreso registrado exitosamente. El objModel contiene un objeto CreateEgresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPost("egresos-mensuales")]
        [ProducesResponseType(typeof(CreateEgresoMensualResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult CreateEgresoMensual([FromBody] CreateEgresoMensualRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.CreateEgresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Obtener lista de egresos mensuales con filtros
        /// </summary>
        /// <param name="request">Filtros de búsqueda</param>
        /// <returns>Lista de egresos mensuales</returns>
        /// <response code="200">Lista obtenida exitosamente. El objModel contiene una lista de EgresoMensualListResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("egresos-mensuales")]
        [ProducesResponseType(typeof(List<EgresoMensualListResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GetEgresoMensualList([FromQuery] GetEgresoMensualListRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.GetEgresoMensualList(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Actualizar un egreso mensual existente
        /// </summary>
        /// <param name="request">Datos actualizados del egreso</param>
        /// <returns>Respuesta de la actualización</returns>
        /// <response code="200">Egreso actualizado exitosamente. El objModel contiene un objeto UpdateEgresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPut("egresos-mensuales")]
        [ProducesResponseType(typeof(UpdateEgresoMensualResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult UpdateEgresoMensual([FromBody] UpdateEgresoMensualRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.UpdateEgresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Eliminar un egreso mensual (eliminación lógica)
        /// </summary>
        /// <param name="request">Datos de la eliminación</param>
        /// <returns>Respuesta de la eliminación</returns>
        /// <response code="200">Egreso eliminado exitosamente. El objModel contiene un objeto DeleteEgresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpDelete("egresos-mensuales")]
        [ProducesResponseType(typeof(DeleteEgresoMensualResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult DeleteEgresoMensual([FromBody] DeleteEgresoMensualRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.DeleteEgresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        // ================================================
        // ENDPOINTS PARA TIPOS DE CAJA
        // ================================================

        /// <summary>
        /// Crear un nuevo tipo de caja
        /// </summary>
        /// <param name="request">Datos del tipo de caja</param>
        /// <returns>Respuesta con el tipo de caja creado</returns>
        /// <response code="200">Tipo de caja creado exitosamente. El objModel contiene un objeto CreateTipoCajaResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPost("tipos-caja")]
        [ProducesResponseType(typeof(CreateTipoCajaResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult CreateTipoCaja([FromBody] CreateTipoCajaRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.CreateTipoCaja(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Obtener lista de tipos de caja
        /// </summary>
        /// <param name="includeInactive">Incluir tipos inactivos</param>
        /// <returns>Lista de tipos de caja</returns>
        /// <response code="200">Lista obtenida exitosamente. El objModel contiene una lista de TipoCajaResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("tipos-caja")]
        [ProducesResponseType(typeof(List<TipoCajaResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GetTiposCaja([FromQuery] bool includeInactive = false)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new GetTiposCajaRequest { IncludeInactive = includeInactive };
                var response = _cajaLogic.GetTiposCaja(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Actualizar un tipo de caja
        /// </summary>
        /// <param name="request">Datos actualizados del tipo de caja</param>
        /// <returns>Respuesta de la actualización</returns>
        /// <response code="200">Tipo de caja actualizado exitosamente. El objModel contiene un objeto UpdateTipoCajaResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPut("tipos-caja")]
        [ProducesResponseType(typeof(UpdateTipoCajaResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult UpdateTipoCaja([FromBody] UpdateTipoCajaRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.UpdateTipoCaja(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Eliminar un tipo de caja (eliminación lógica)
        /// </summary>
        /// <param name="request">Datos de la eliminación</param>
        /// <returns>Respuesta de la eliminación</returns>
        /// <response code="200">Tipo de caja eliminado exitosamente. El objModel contiene un objeto DeleteTipoCajaResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpDelete("tipos-caja")]
        [ProducesResponseType(typeof(DeleteTipoCajaResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult DeleteTipoCaja([FromBody] DeleteTipoCajaRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.DeleteTipoCaja(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        // ================================================
        // ENDPOINTS PARA TIPOS DE INGRESO MENSUAL
        // ================================================

        /// <summary>
        /// Crear un nuevo tipo de ingreso mensual
        /// </summary>
        /// <param name="request">Datos del tipo de ingreso</param>
        /// <returns>Respuesta con el tipo de ingreso creado</returns>
        /// <response code="200">Tipo de ingreso creado exitosamente. El objModel contiene un objeto CreateTipoIngresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPost("tipos-ingreso-mensual")]
        [ProducesResponseType(typeof(CreateTipoIngresoMensualResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult CreateTipoIngresoMensual([FromBody] CreateTipoIngresoMensualRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.CreateTipoIngresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Obtener lista de tipos de ingreso mensual
        /// </summary>
        /// <param name="includeInactive">Incluir tipos inactivos</param>
        /// <returns>Lista de tipos de ingreso mensual</returns>
        /// <response code="200">Lista obtenida exitosamente. El objModel contiene una lista de TipoIngresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("tipos-ingreso-mensual")]
        [ProducesResponseType(typeof(List<TipoIngresoMensualResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GetTiposIngresoMensual([FromQuery] bool includeInactive = false)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new GetTiposIngresoMensualRequest { IncludeInactive = includeInactive };
                var response = _cajaLogic.GetTiposIngresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Actualizar un tipo de ingreso mensual
        /// </summary>
        /// <param name="request">Datos actualizados del tipo de ingreso</param>
        /// <returns>Respuesta de la actualización</returns>
        /// <response code="200">Tipo de ingreso actualizado exitosamente. El objModel contiene un objeto UpdateTipoIngresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPut("tipos-ingreso-mensual")]
        [ProducesResponseType(typeof(UpdateTipoIngresoMensualResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult UpdateTipoIngresoMensual([FromBody] UpdateTipoIngresoMensualRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.UpdateTipoIngresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Eliminar un tipo de ingreso mensual (eliminación lógica)
        /// </summary>
        /// <param name="request">Datos de la eliminación</param>
        /// <returns>Respuesta de la eliminación</returns>
        /// <response code="200">Tipo de ingreso eliminado exitosamente. El objModel contiene un objeto DeleteTipoIngresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpDelete("tipos-ingreso-mensual")]
        [ProducesResponseType(typeof(DeleteTipoIngresoMensualResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult DeleteTipoIngresoMensual([FromBody] DeleteTipoIngresoMensualRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.DeleteTipoIngresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        // ================================================
        // ENDPOINTS PARA TIPOS DE EGRESO MENSUAL
        // ================================================

        /// <summary>
        /// Crear un nuevo tipo de egreso mensual
        /// </summary>
        /// <param name="request">Datos del tipo de egreso</param>
        /// <returns>Respuesta con el tipo de egreso creado</returns>
        /// <response code="200">Tipo de egreso creado exitosamente. El objModel contiene un objeto CreateTipoEgresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPost("tipos-egreso-mensual")]
        [ProducesResponseType(typeof(CreateTipoEgresoMensualResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult CreateTipoEgresoMensual([FromBody] CreateTipoEgresoMensualRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.CreateTipoEgresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Obtener lista de tipos de egreso mensual
        /// </summary>
        /// <param name="includeInactive">Incluir tipos inactivos</param>
        /// <returns>Lista de tipos de egreso mensual</returns>
        /// <response code="200">Lista obtenida exitosamente. El objModel contiene una lista de TipoEgresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("tipos-egreso-mensual")]
        [ProducesResponseType(typeof(List<TipoEgresoMensualResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GetTiposEgresoMensual([FromQuery] bool includeInactive = false)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new GetTiposEgresoMensualRequest { IncludeInactive = includeInactive };
                var response = _cajaLogic.GetTiposEgresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Actualizar un tipo de egreso mensual
        /// </summary>
        /// <param name="request">Datos actualizados del tipo de egreso</param>
        /// <returns>Respuesta de la actualización</returns>
        /// <response code="200">Tipo de egreso actualizado exitosamente. El objModel contiene un objeto UpdateTipoEgresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpPut("tipos-egreso-mensual")]
        [ProducesResponseType(typeof(UpdateTipoEgresoMensualResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult UpdateTipoEgresoMensual([FromBody] UpdateTipoEgresoMensualRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.UpdateTipoEgresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        /// <summary>
        /// Eliminar un tipo de egreso mensual (eliminación lógica)
        /// </summary>
        /// <param name="request">Datos de la eliminación</param>
        /// <returns>Respuesta de la eliminación</returns>
        /// <response code="200">Tipo de egreso eliminado exitosamente. El objModel contiene un objeto DeleteTipoEgresoMensualResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpDelete("tipos-egreso-mensual")]
        [ProducesResponseType(typeof(DeleteTipoEgresoMensualResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult DeleteTipoEgresoMensual([FromBody] DeleteTipoEgresoMensualRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.DeleteTipoEgresoMensual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        // ================================================
        // ENDPOINTS PARA SALDO CAJA
        // ================================================

        /// <summary>
        /// Obtener saldo actual de caja por tipo
        /// </summary>
        /// <param name="idTipoCaja">ID del tipo de caja (opcional, si no se especifica devuelve todos)</param>
        /// <returns>Lista de saldos por tipo de caja</returns>
        /// <response code="200">Saldos obtenidos exitosamente. El objModel contiene una lista de SaldoCajaResponse</response>
        /// <response code="400">Error en la solicitud</response>
        [HttpGet("saldo-caja")]
        [ProducesResponseType(typeof(List<SaldoCajaResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ResponseDTO), StatusCodes.Status400BadRequest)]
        public IActionResult GetSaldoCaja([FromQuery] int? idTipoCaja = null)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new GetSaldoCajaRequest { IdTipoCaja = idTipoCaja };
                var response = _cajaLogic.GetSaldoCaja(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
    }
}
