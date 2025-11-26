using Business.Logic.IContractsBL.cobranza;
using Data.Model;
using Data.Model.Request.atencionmedica;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Facturacion.Microservice.Controllers.cobranza
{
    [Route("api/cobranza")]
    [ApiController]
    public class cobranzaController : ControllerBase
    {
        private ICobranzaLogic _cobranza;
        public ResponseDTO _ResponseDTO;
        public cobranzaController(ICobranzaLogic cobranza)
        {
            _cobranza = cobranza;
        }

        [HttpGet]
        public IActionResult GetList()
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _cobranza.GetList()));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }        

        [HttpGet]
        [Route("{id}")]
        public IActionResult GetByIdString(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _cobranza.GetById(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetCobranzaDetalleByIdVenta/{id}")]
        public IActionResult GetCobranzaDetalleByIdVenta(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _cobranza.GetCobranzaDetalleByIdVenta(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        public IActionResult Insert([FromBody] Data.Model.Entities.cobranza.cobranza obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _cobranza.Insert(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPut]
        public IActionResult Update([FromBody] Data.Model.Entities.cobranza.cobranza obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _cobranza.Update(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
        [HttpDelete]
        public IActionResult Delete([FromBody] Data.Model.Entities.cobranza.cobranza obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _cobranza.Delete(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }


        [HttpPost]
        [Route("GerenciaVentasAsistencialMS")]
        public IActionResult GerenciaVentasAsistencialMS([FromBody] FiltroBusquedaMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _cobranza.GerenciaVentasAsistencialMS(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialMSSISOL")]
        public IActionResult GerenciaVentasAsistencialMSSISOL([FromBody] FiltroBusquedaMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _cobranza.GerenciaVentasAsistencialMSSISOL(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
    }
}
