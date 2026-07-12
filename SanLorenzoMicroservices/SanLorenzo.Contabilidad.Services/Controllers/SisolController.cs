using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Contabilidad.Infrastructure;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    [ApiController]
    [Route("api/conta/sisol")]
    [Authorize]
    public class SisolController : ControllerBase
    {
        private readonly SisolRepository _repo;
        public SisolController(SisolRepository repo) => _repo = repo;

        private const string ESCRITURA = "SA,CONTABILIDAD";

        [HttpGet("liquidaciones")]
        public IActionResult List([FromQuery] short anio) => Ok(_repo.List(anio));

        [HttpGet("liquidaciones/{anio}/{mes}")]
        public IActionResult Get(short anio, byte mes) => Ok(_repo.Get(anio, mes));

        [HttpPost("liquidaciones/calcular")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult Calcular([FromBody] SisolCalcularRequest r)
            => Ok(new { i_IdLiquidacion = _repo.Calcular(r, User.UserId()) });

        [HttpPost("liquidaciones/{id:int}/pagar")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult Pagar(int id, [FromBody] SisolPagarRequest r)
            => Ok(new { i_IdEgresoHospital = _repo.Pagar(id, r.FechaPago, User.UserId()) });
    }
}
