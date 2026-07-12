using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Contabilidad.Infrastructure;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    [ApiController]
    [Route("api/conta/compras")]
    [Authorize]
    public class ComprasController : ControllerBase
    {
        private readonly CompraRepository _repo;
        public ComprasController(CompraRepository repo) => _repo = repo;

        [HttpGet]
        public IActionResult List([FromQuery] string periodo = null, [FromQuery] bool soloSinClasificar = false)
            => Ok(_repo.List(periodo, soloSinClasificar));

        [HttpGet("{id:int}/clasificacion")]
        public IActionResult GetClasificacion(int id)
        {
            var row = _repo.GetClasificacion(id);
            return row == null ? NoContent() : Ok(row);
        }

        [HttpPost("{id:int}/clasificar")]
        [Authorize(Roles = "SA,CONTABILIDAD")]
        public IActionResult Clasificar(int id, [FromBody] CompraClasificarRequest r)
            => Ok(new { i_IdEgreso = _repo.Clasificar(id, r.IdCentroCosto, r.IdTipoGasto, User.UserId()) });
    }
}
