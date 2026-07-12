using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    [ApiController]
    [Route("api/conta/rentabilidad")]
    [Authorize]
    public class RentabilidadController : ControllerBase
    {
        private readonly RentabilidadRepository _repo;
        public RentabilidadController(RentabilidadRepository repo) => _repo = repo;

        [HttpGet("general")]
        public IActionResult General([FromQuery] short anio, [FromQuery] byte mes) => Ok(_repo.General(anio, mes));

        [HttpGet("por-unidad")]
        public IActionResult PorUnidad([FromQuery] short anio, [FromQuery] byte mes) => Ok(_repo.PorUnidad(anio, mes));

        [HttpGet("gastos")]
        public IActionResult Gastos([FromQuery] short anio, [FromQuery] byte mes) => Ok(_repo.Gastos(anio, mes));

        [HttpGet("ingresos")]
        public IActionResult Ingresos([FromQuery] short anio, [FromQuery] byte mes) => Ok(_repo.Ingresos(anio, mes));

        [HttpGet("comparativa")]
        public IActionResult Comparativa([FromQuery] short anio) => Ok(_repo.Comparativa(anio));
    }
}
