using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    /// <summary>
    /// Page /conta/especialistas: atenciones y referencias por especialista (solo lectura, cross-DB).
    /// Autorizacion a nivel controller = trio LECTURA (mismo que NLQ): SA, CONTABILIDAD, GERENTE.
    /// Toda la logica vive en los 4 SP conta.sp_Especialistas_*; el controller solo valida rango
    /// y eleva TotalFilas (que viaja en cada fila) al shape { total, filas } que consume el front.
    /// </summary>
    [ApiController]
    [Route("api/conta/especialistas")]
    [Authorize(Roles = "SA,CONTABILIDAD,GERENTE")]
    public class EspecialistasController : ControllerBase
    {
        private readonly EspecialistasRepository _repo;
        public EspecialistasController(EspecialistasRepository repo) => _repo = repo;

        private const int RangoMaximoDias = 366;   // consistente con el cap de export y con Epidemiologia

        // Valida rango obligatorio (desde<=hasta, <=366 dias). Devuelve error != null si algo falla.
        private IActionResult ValidarRango(DateTime desde, DateTime hasta)
        {
            if (desde.Year <= 1 || hasta.Year <= 1)
                return BadRequest(new { message = "Los parametros 'desde' y 'hasta' son requeridos (formato yyyy-MM-dd)." });
            if (desde.Date > hasta.Date)
                return BadRequest(new { message = "'desde' no puede ser mayor que 'hasta'." });
            if ((hasta.Date - desde.Date).TotalDays + 1 > RangoMaximoDias)
                return BadRequest(new { message = $"El rango no puede exceder {RangoMaximoDias} dias. Acote el periodo." });
            return null;
        }

        // GET api/conta/especialistas/filtros?desde=&hasta=
        // Combos del card. Params opcionales (SP: default = ultimos 12 meses). 2 resultsets.
        [HttpGet("filtros")]
        public IActionResult Filtros(
            [FromQuery] DateTime? desde = null, [FromQuery] DateTime? hasta = null,
            [FromQuery] bool incAsistencial = true, [FromQuery] bool incSisol = true,
            [FromQuery] bool incSeguro = true)
        {
            // Si el cliente manda ambas fechas, se validan; si no, el SP aplica su default de 12 meses.
            if (desde.HasValue && hasta.HasValue)
            {
                var err = ValidarRango(desde.Value, hasta.Value);
                if (err != null) return err;
            }

            var (especialidades, especialistas) = _repo.Filtros(desde, hasta, incAsistencial, incSisol, incSeguro);
            return Ok(new { especialidades, especialistas });
        }

        // GET api/conta/especialistas/resumen?desde=&hasta=&consultorioId=&medicoId=&pagina=1&tamanio=25
        // Bandeja principal paginada.
        [HttpGet("resumen")]
        public IActionResult Resumen(
            [FromQuery] DateTime desde, [FromQuery] DateTime hasta,
            [FromQuery] int? consultorioId = null, [FromQuery] int? medicoId = null,
            [FromQuery] int pagina = 1, [FromQuery] int tamanio = 25,
            [FromQuery] bool incAsistencial = true, [FromQuery] bool incSisol = true,
            [FromQuery] bool incSeguro = true)
        {
            var err = ValidarRango(desde, hasta);
            if (err != null) return err;
            if (pagina < 1) pagina = 1;
            if (tamanio < 0) tamanio = 25;   // tamanio=0 = sin paginar (export); solo negativos se corrigen

            var (total, filas) = _repo.Resumen(
                desde, hasta, consultorioId, medicoId, pagina, tamanio, incAsistencial, incSisol, incSeguro);
            return Ok(new { total, filas });
        }

        // GET api/conta/especialistas/{medicoId}/atenciones?desde=&hasta=&consultorioId=&pagina=1&tamanio=50
        // Modal "Ver Atenciones" (lazy).
        [HttpGet("{medicoId:int}/atenciones")]
        public IActionResult Atenciones(
            int medicoId,
            [FromQuery] DateTime desde, [FromQuery] DateTime hasta,
            [FromQuery] int? consultorioId = null,
            [FromQuery] int pagina = 1, [FromQuery] int tamanio = 50,
            [FromQuery] bool incAsistencial = true, [FromQuery] bool incSisol = true,
            [FromQuery] bool incSeguro = true)
        {
            var err = ValidarRango(desde, hasta);
            if (err != null) return err;
            if (pagina < 1) pagina = 1;
            if (tamanio < 0) tamanio = 50;

            var (total, filas) = _repo.Atenciones(
                medicoId, desde, hasta, consultorioId, pagina, tamanio, incAsistencial, incSisol, incSeguro);
            return Ok(new { total, filas });
        }

        // GET api/conta/especialistas/{medicoId}/referencias?desde=&hasta=&pagina=1&tamanio=50
        // Modal "Ver Referencias" (lazy).
        [HttpGet("{medicoId:int}/referencias")]
        public IActionResult Referencias(
            int medicoId,
            [FromQuery] DateTime desde, [FromQuery] DateTime hasta,
            [FromQuery] int pagina = 1, [FromQuery] int tamanio = 50,
            [FromQuery] bool incAsistencial = true, [FromQuery] bool incSisol = true,
            [FromQuery] bool incSeguro = true)
        {
            var err = ValidarRango(desde, hasta);
            if (err != null) return err;
            if (pagina < 1) pagina = 1;
            if (tamanio < 0) tamanio = 50;

            var (total, filas) = _repo.Referencias(
                medicoId, desde, hasta, pagina, tamanio, incAsistencial, incSisol, incSeguro);
            return Ok(new { total, filas });
        }
    }
}
