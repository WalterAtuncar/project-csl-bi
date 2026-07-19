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
        public IActionResult General([FromQuery] short anio, [FromQuery] byte mes, [FromQuery] bool incluirCredito = true) => Ok(_repo.General(anio, mes, incluirCredito));

        [HttpGet("por-unidad")]
        public IActionResult PorUnidad([FromQuery] short anio, [FromQuery] byte mes, [FromQuery] bool incluirCredito = true) => Ok(_repo.PorUnidad(anio, mes, incluirCredito));

        [HttpGet("por-consultorio")]
        public IActionResult PorConsultorio([FromQuery] short anio, [FromQuery] byte mes, [FromQuery] bool incluirCredito = true) => Ok(_repo.PorConsultorio(anio, mes, incluirCredito));

        [HttpGet("ocupacional-por-empresa")]
        public IActionResult OcupacionalPorEmpresa([FromQuery] short anio, [FromQuery] byte mes, [FromQuery] bool incluirCredito = true) => Ok(_repo.OcupacionalPorEmpresa(anio, mes, incluirCredito));

        [HttpGet("gastos")]
        public IActionResult Gastos([FromQuery] short anio, [FromQuery] byte mes) => Ok(_repo.Gastos(anio, mes));

        [HttpGet("ingresos")]
        public IActionResult Ingresos([FromQuery] short anio, [FromQuery] byte mes) => Ok(_repo.Ingresos(anio, mes));

        [HttpGet("comparativa")]
        public IActionResult Comparativa([FromQuery] short anio, [FromQuery] bool incluirCredito = true) => Ok(_repo.Comparativa(anio, incluirCredito));
    }
}
