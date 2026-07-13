using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Contabilidad.Infrastructure;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    [ApiController]
    [Route("api/conta/honorarios")]
    [Authorize]
    public class HonorariosController : ControllerBase
    {
        private readonly HonorariosRepository _repo;
        public HonorariosController(HonorariosRepository repo) => _repo = repo;

        private const string ESCRITURA = "SA,CONTABILIDAD";

        // ---- Catalogos / analisis (lectura, todos los roles autenticados) ----

        [HttpGet("consultorios")]
        public IActionResult Consultorios() => Ok(_repo.Consultorios());

        [HttpGet("medicos")]
        public IActionResult Medicos([FromQuery] int? consultorioId = null)
            => Ok(_repo.Medicos(consultorioId));

        [HttpGet("profesionales")]
        public IActionResult Profesionales([FromQuery] string texto = null)
        {
            if (string.IsNullOrWhiteSpace(texto) || texto.Trim().Length < 3)
                return BadRequest(new { message = "Ingrese al menos 3 caracteres para buscar." });
            return Ok(_repo.BuscarProfesional(texto.Trim()));
        }

        [HttpGet("analisis")]
        public IActionResult Analisis(
            [FromQuery] int? consultorioId, [FromQuery] DateTime desde, [FromQuery] DateTime hasta)
            => Ok(_repo.Analisis(consultorioId, desde, hasta));

        // ---- Pagos ----

        [HttpGet("pagos")]
        public IActionResult ListPagos(
            [FromQuery] DateTime? desde = null, [FromQuery] DateTime? hasta = null,
            [FromQuery] int? medicoId = null, [FromQuery] bool incluirAnulados = false,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var (total, items) = _repo.ListPagos(desde, hasta, medicoId, incluirAnulados, page, pageSize);
            return Ok(new { Total = total, Items = items, Page = page, PageSize = pageSize });
        }

        [HttpGet("pagos/{id:int}")]
        public IActionResult GetPago(int id)
        {
            var det = _repo.GetPago(id);
            return det == null ? NotFound() : Ok(det);
        }

        [HttpPost("pagos")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult CrearPago([FromBody] PagoHonorarioCreateRequest r)
        {
            if (r == null || r.Servicios == null || r.Servicios.Count == 0)
                return BadRequest(new { message = "Debe indicar al menos un servicio para pagar." });
            return Ok(_repo.CrearPago(r, User.UserId()));
        }

        [HttpPost("pagos/{id:int}/anular")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult AnularPago(int id, [FromBody] AnularRequest r)
        {
            if (r == null || string.IsNullOrWhiteSpace(r.Motivo))
                return BadRequest(new { message = "El motivo de anulacion es requerido." });
            return Ok(new { i_IdPago = _repo.AnularPago(id, r.Motivo.Trim(), User.UserId()) });
        }
    }
}
