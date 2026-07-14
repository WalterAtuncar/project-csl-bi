using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    /// <summary>
    /// Modulo Epidemiologia (dato clinico cross-DB, solo lectura). Todo se resuelve en SP conta.
    /// Autorizacion: [Authorize] (cualquier usuario conta autenticado; no es dato financiero).
    /// </summary>
    [ApiController]
    [Route("api/conta/epidemiologia")]
    [Authorize]
    public class EpidemiologiaController : ControllerBase
    {
        private readonly EpidemiologiaRepository _repo;
        public EpidemiologiaController(EpidemiologiaRepository repo) => _repo = repo;

        private const int RangoMaximoDias = 366;   // protege export/dashboard
        private const int ExportCap = 100_000;      // filas maximas del export
        private static readonly HashSet<string> AmbitosValidos =
            new(StringComparer.OrdinalIgnoreCase) { "TODOS", "ASISTENCIAL", "OCUPACIONAL", "HOSPITALIZACION" };

        // Normaliza+valida el ambito. Devuelve TODOS si viene vacio; null si es invalido.
        private static string NormalizarAmbito(string ambito)
        {
            if (string.IsNullOrWhiteSpace(ambito)) return "TODOS";
            var a = ambito.Trim().ToUpperInvariant();
            return AmbitosValidos.Contains(a) ? a : null;
        }

        // Valida rango de fechas + ambito para los endpoints por rango (ficha/export/dashboard).
        // Devuelve error != null si algo falla; ambitoNorm queda con el valor normalizado.
        private IActionResult ValidarRango(DateTime desde, DateTime hasta, string ambito, out string ambitoNorm)
        {
            ambitoNorm = null;
            if (desde.Year <= 1 || hasta.Year <= 1)
                return BadRequest(new { message = "Los parametros 'desde' y 'hasta' son requeridos (formato yyyy-MM-dd)." });
            if (desde.Date > hasta.Date)
                return BadRequest(new { message = "'desde' no puede ser mayor que 'hasta'." });
            if ((hasta.Date - desde.Date).TotalDays + 1 > RangoMaximoDias)
                return BadRequest(new { message = $"El rango no puede exceder {RangoMaximoDias} dias. Acote el periodo." });
            ambitoNorm = NormalizarAmbito(ambito);
            if (ambitoNorm == null)
                return BadRequest(new { message = "Ambito invalido. Valores: TODOS, ASISTENCIAL, OCUPACIONAL, HOSPITALIZACION." });
            return null;
        }

        // ---- TAB 1: Ficha Individual EPI (grid paginada) ----
        [HttpGet("ficha")]
        public IActionResult Ficha(
            [FromQuery] DateTime desde, [FromQuery] DateTime hasta,
            [FromQuery] string ambito = "TODOS",
            [FromQuery] int page = 1, [FromQuery] int pageSize = 50,
            [FromQuery] bool soloConDx = false, [FromQuery] bool incluirDescartados = false,
            [FromQuery] string red = "Diresa Cajamarca")
        {
            var error = ValidarRango(desde, hasta, ambito, out var ambitoNorm);
            if (error != null) return error;
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 500) pageSize = 50;

            var (totalFilas, items) = _repo.Ficha(
                desde, hasta, ambitoNorm, page, pageSize, soloConDx, incluirDescartados, red);
            return Ok(new { items, totalFilas, page, pageSize });
        }

        // ---- TAB 1: export a Excel (todas las filas del rango, cap 100k) ----
        [HttpGet("ficha/export")]
        public IActionResult FichaExport(
            [FromQuery] DateTime desde, [FromQuery] DateTime hasta,
            [FromQuery] string ambito = "TODOS",
            [FromQuery] bool soloConDx = false, [FromQuery] bool incluirDescartados = false,
            [FromQuery] string red = "Diresa Cajamarca")
        {
            var error = ValidarRango(desde, hasta, ambito, out var ambitoNorm);
            if (error != null) return error;

            var (totalFilas, items) = _repo.Ficha(
                desde, hasta, ambitoNorm, 1, ExportCap, soloConDx, incluirDescartados, red,
                commandTimeout: 120);

            if (totalFilas > ExportCap)
                return StatusCode(StatusCodes.Status413PayloadTooLarge, new
                {
                    message = $"El rango tiene {totalFilas} filas y excede el maximo de {ExportCap} para exportar. Acote el rango."
                });

            return Ok(new { items, totalFilas });
        }

        // ---- TAB 2: Dashboard (KPIs + 10 arrays, un solo fetch) ----
        [HttpGet("dashboard")]
        public IActionResult Dashboard(
            [FromQuery] DateTime desde, [FromQuery] DateTime hasta,
            [FromQuery] string ambito = "TODOS",
            [FromQuery] bool incluirDescartados = false, [FromQuery] int topN = 20)
        {
            var error = ValidarRango(desde, hasta, ambito, out var ambitoNorm);
            if (error != null) return error;
            if (topN < 1 || topN > 100) topN = 20;

            var d = _repo.Dashboard(desde, hasta, ambitoNorm, incluirDescartados, topN);
            // Claves JSON EXACTAS que consume el front (PropertyNamingPolicy=null => literal).
            return Ok(new
            {
                kpis = d.Kpis,
                porConsultorio = d.PorConsultorio,
                topMorbilidad = d.TopMorbilidad,
                porCapitulo = d.PorCapitulo,
                piramide = d.Piramide,
                morbilidadSexo = d.MorbilidadSexo,
                heatmap = d.Heatmap,
                tendencia = d.Tendencia,
                medicos = d.Medicos,
                comorbilidad = d.Comorbilidad,
                geografia = d.Geografia
            });
        }

        // ---- TAB 2: Canal endemico (lazy) ----
        [HttpGet("canal-endemico")]
        public IActionResult CanalEndemico(
            [FromQuery] int anio,
            [FromQuery] int? hastaSemana = null,
            [FromQuery] string ambito = "TODOS",
            [FromQuery] int? capitulo = null,
            [FromQuery] string cie10 = null)
        {
            if (anio < 2000 || anio > 2100)
                return BadRequest(new { message = "'anio' invalido." });
            var ambitoNorm = NormalizarAmbito(ambito);
            if (ambitoNorm == null)
                return BadRequest(new { message = "Ambito invalido. Valores: TODOS, ASISTENCIAL, OCUPACIONAL, HOSPITALIZACION." });
            if (hastaSemana.HasValue && (hastaSemana < 1 || hastaSemana > 53))
                return BadRequest(new { message = "'hastaSemana' debe estar entre 1 y 53." });

            var rows = _repo.CanalEndemico(anio, hastaSemana, ambitoNorm, capitulo,
                string.IsNullOrWhiteSpace(cie10) ? null : cie10.Trim());
            return Ok(rows);
        }
    }
}
