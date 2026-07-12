using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Contabilidad.Infrastructure;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    [ApiController]
    [Route("api/conta/egresos")]
    [Authorize]
    public class EgresosController : ControllerBase
    {
        private readonly EgresoRepository _repo;
        public EgresosController(EgresoRepository repo) => _repo = repo;

        private const string ESCRITURA = "SA,CONTABILIDAD";

        [HttpGet]
        public IActionResult List(
            [FromQuery] DateTime? fdocDesde, [FromQuery] DateTime? fdocHasta,
            [FromQuery] DateTime? fpagoDesde, [FromQuery] DateTime? fpagoHasta,
            [FromQuery] string estado = null, [FromQuery] int? idCentroCosto = null,
            [FromQuery] int? idTipoGasto = null, [FromQuery] int? idProveedor = null,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var rows = _repo.List(fdocDesde, fdocHasta, fpagoDesde, fpagoHasta,
                estado, idCentroCosto, idTipoGasto, idProveedor, page, pageSize).ToList();
            var total = rows.Count > 0 ? rows[0].TotalRows : 0;
            return Ok(new { total, page, pageSize, items = rows });
        }

        [HttpGet("{id:int}")]
        public IActionResult Get(int id)
        {
            var row = _repo.Get(id);
            return row == null ? NotFound() : Ok(row);
        }

        [HttpPost]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult Crear([FromBody] EgresoCreateRequest r)
            => Ok(new { i_IdEgreso = _repo.Insert(r, User.UserId()) });

        [HttpPut]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult Actualizar([FromBody] EgresoUpdateRequest r)
            => Ok(new { i_IdEgreso = _repo.Update(r, User.UserId()) });

        [HttpPost("pagar")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult Pagar([FromBody] EgresoPagarRequest r)
            => Ok(new { i_IdEgreso = _repo.Pagar(r, User.UserId()) });

        [HttpPost("anular")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult Anular([FromBody] EgresoAnularRequest r)
            => Ok(new { i_IdEgreso = _repo.Anular(r, User.UserId()) });

        [HttpPost("carga-masiva")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult CargaMasiva([FromBody] List<EgresoCargaFila> filas)
        {
            if (filas == null || filas.Count == 0) return BadRequest(new { error = "No hay filas para cargar." });
            return Ok(_repo.CargaMasiva(filas, User.UserId()));
        }
    }
}
