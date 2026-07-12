using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Contabilidad.Infrastructure;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    [ApiController]
    [Route("api/conta/costos-personal")]
    [Authorize]
    public class CostosPersonalController : ControllerBase
    {
        private readonly EgresoRepository _repo;
        public CostosPersonalController(EgresoRepository repo) => _repo = repo;

        private const string ESCRITURA = "SA,CONTABILIDAD";

        [HttpGet]
        public IActionResult List([FromQuery] short anio, [FromQuery] byte mes)
            => Ok(_repo.CostoPersonalList(anio, mes));

        [HttpPost]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult Upsert([FromBody] CostoPersonalUpsertRequest r)
        {
            _repo.CostoPersonalUpsert(r, User.UserId());
            return Ok(new { ok = true });
        }

        [HttpPost("pagar")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult Pagar([FromBody] CostoPersonalPagarRequest r)
            => Ok(new { pagadas = _repo.CostoPersonalPagar(r, User.UserId()) });
    }
}
