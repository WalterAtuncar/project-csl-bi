using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Contabilidad.Infrastructure;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    [ApiController]
    [Route("api/conta/caja")]
    [Authorize]
    public class CajaController : ControllerBase
    {
        private readonly CajaRepository _repo;
        public CajaController(CajaRepository repo) => _repo = repo;

        private const string ESCRITURA = "SA,CONTABILIDAD";

        [HttpGet("ingresos")]
        public IActionResult Ingresos([FromQuery] DateTime desde, [FromQuery] DateTime hasta)
            => Ok(_repo.Ingresos(desde, hasta));

        [HttpGet("egresos")]
        public IActionResult Egresos([FromQuery] DateTime desde, [FromQuery] DateTime hasta)
            => Ok(_repo.Egresos(desde, hasta));

        [HttpGet("diaria")]
        public IActionResult Diaria([FromQuery] short anio, [FromQuery] byte mes,
            [FromQuery] string formasPago = null, [FromQuery] bool incluirCredito = true)
            => Ok(_repo.Diaria(anio, mes, formasPago, incluirCredito));

        [HttpGet("indicadores")]
        public IActionResult Indicadores([FromQuery] short anio, [FromQuery] byte mes)
            => Ok(_repo.Indicadores(anio, mes));

        [HttpGet("formas-pago")]
        public IActionResult FormasPago()
            => Ok(_repo.FormasPago());

        [HttpGet("flujo-consolidado")]
        public IActionResult FlujoConsolidado([FromQuery] short anio,
            [FromQuery] string formasPago = null, [FromQuery] bool incluirCredito = true)
            => Ok(_repo.FlujoConsolidado(anio, formasPago, incluirCredito));

        [HttpPost("cerrar-mes")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult CerrarMes([FromBody] CerrarMesRequest r)
            => Ok(_repo.CerrarMes(r.Anio, r.Mes, User.UserId()));

        [HttpPost("reabrir-mes")]
        [Authorize(Roles = "SA")]
        public IActionResult ReabrirMes([FromBody] CerrarMesRequest r)
            => Ok(new { ok = _repo.ReabrirMes(r.Anio, r.Mes, User.UserId()) });

        [HttpPost("apertura")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult Apertura([FromBody] AperturaRequest r)
        {
            _repo.SetApertura(r, User.UserId());
            return Ok(new { ok = true });
        }

        [HttpGet("/api/conta/saldos-banco")]
        public IActionResult SaldosBanco([FromQuery] short anio, [FromQuery] byte mes)
            => Ok(_repo.SaldosBanco(anio, mes));

        [HttpPost("/api/conta/saldos-banco")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult SaldoBancoUpsert([FromBody] SaldoBancoUpsertRequest r)
        {
            _repo.SaldoBancoUpsert(r, User.UserId());
            return Ok(new { ok = true });
        }
    }
}
