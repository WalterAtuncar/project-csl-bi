using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Contabilidad.Infrastructure;
using Contabilidad.Infrastructure.Nlq;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    /// <summary>
    /// Modulo NLQ (consulta a BD en lenguaje natural). §3.1 del PLAN_NLQ_CONTA.
    /// KILL SWITCH: con Nlq:Enabled=false TODOS los endpoints responden 404 (el modulo no existe hacia afuera).
    /// </summary>
    [ApiController]
    [Route("api/conta/nlq")]
    [Authorize]
    public class NlqController : ControllerBase
    {
        private const string LECTURA = "SA,CONTABILIDAD,GERENTE";
        private const string ESCRITURA = "SA,CONTABILIDAD";
        private const string ADMIN = "SA";

        private readonly NlqService _service;
        private readonly NlqRepository _repo;
        private readonly NlqOptions _opt;
        private readonly ILogger<NlqController> _log;

        public NlqController(NlqService service, NlqRepository repo, IOptions<NlqOptions> opt, ILogger<NlqController> log)
        {
            _service = service;
            _repo = repo;
            _opt = opt.Value;
            _log = log;
        }

        private bool Off => !_opt.Enabled;
        private bool EsSA => User.IsInRole("SA");
        private string RolPrincipal()
            => User.IsInRole("SA") ? "SA"
             : User.IsInRole("CONTABILIDAD") ? "CONTABILIDAD"
             : User.IsInRole("GERENTE") ? "GERENTE" : "";

        // POST /api/conta/nlq/preguntar
        [HttpPost("preguntar")]
        [Authorize(Roles = LECTURA)]
        public async Task<IActionResult> Preguntar([FromBody] NlqPreguntarRequest req, CancellationToken ct)
        {
            if (Off) return NotFound();
            if (req == null || string.IsNullOrWhiteSpace(req.Pregunta))
                return BadRequest(new { message = "La pregunta es obligatoria." });
            try
            {
                var r = await _service.PreguntarAsync(req.Pregunta.Trim(), User.UserId(), ct);
                return Ok(r);
            }
            catch (NlqLimiteExcedidoException ex)
            {
                return StatusCode(429, new { message = ex.Message });
            }
        }

        // POST /api/conta/nlq/guardadas
        [HttpPost("guardadas")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult Guardar([FromBody] NlqGuardarDto dto)
        {
            if (Off) return NotFound();
            var fingerprint = _service.FingerprintActual();
            var id = _repo.GuardarConsulta(dto, fingerprint, User.UserId(), RolPrincipal());
            return Ok(new { id });
        }

        // GET /api/conta/nlq/guardadas
        [HttpGet("guardadas")]
        [Authorize(Roles = LECTURA)]
        public IActionResult ListarGuardadas()
        {
            if (Off) return NotFound();
            var fp = _service.FingerprintActual();
            var rows = _repo.ListarGuardadas(User.UserId(), EsSA);
            var items = rows.Select(r => new NlqGuardadaDto
            {
                Id = r.Id,
                Nombre = r.v_Nombre,
                Descripcion = r.v_Descripcion,
                ChartTipo = r.v_ChartTipo,
                Params = r.v_Params,
                DesactualizadaFlag = !string.Equals(r.v_FingerprintEsquema, fp, StringComparison.Ordinal)
            }).ToList();
            return Ok(items);
        }

        // POST /api/conta/nlq/guardadas/{id}/ejecutar  (0 tokens)
        [HttpPost("guardadas/{id:int}/ejecutar")]
        [Authorize(Roles = LECTURA)]
        public IActionResult EjecutarGuardada(int id, [FromBody] NlqEjecutarGuardadaRequest req)
        {
            if (Off) return NotFound();
            var g = _repo.ObtenerGuardada(id);
            if (g == null) return NotFound();
            var datos = _service.EjecutarGuardada(g, req?.Params, User.UserId());
            return Ok(datos);
        }

        // DELETE /api/conta/nlq/guardadas/{id}
        [HttpDelete("guardadas/{id:int}")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult BorrarGuardada(int id)
        {
            if (Off) return NotFound();
            var afectadas = _repo.BorrarGuardada(id, User.UserId(), EsSA);
            return afectadas > 0 ? NoContent() : NotFound();
        }

        // PATCH /api/conta/nlq/guardadas/{id}/chart  — cambia el tipo de grafico de una guardada (dueño o SA)
        [HttpPatch("guardadas/{id:int}/chart")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult ActualizarChart(int id, [FromBody] NlqActualizarChartDto dto)
        {
            if (Off) return NotFound();
            if (dto == null || string.IsNullOrWhiteSpace(dto.ChartTipo))
                return BadRequest(new { message = "ChartTipo es obligatorio." });
            var afectadas = _repo.ActualizarChart(id, User.UserId(), EsSA, dto.ChartTipo.Trim());
            return afectadas > 0 ? NoContent() : NotFound();
        }

        // GET /api/conta/nlq/catalogo
        [HttpGet("catalogo")]
        [Authorize(Roles = ADMIN)]
        public IActionResult Catalogo()
        {
            if (Off) return NotFound();
            return Ok(_service.ObtenerCatalogo());
        }

        // POST /api/conta/nlq/catalogo/rebuild
        // v1: recomputa conteos + fingerprint del catalogo activo. La re-introspeccion/seed de dbo
        // (sp_Nlq_CatalogoUpsert desde el esquema real) es tarea de BD (F2), no de este endpoint.
        [HttpPost("catalogo/rebuild")]
        [Authorize(Roles = ADMIN)]
        public IActionResult RebuildCatalogo()
        {
            if (Off) return NotFound();
            var c = _service.ObtenerCatalogo();
            return Ok(new { tablas = c.TotalObjetos, columnas = c.TotalColumnas });
        }
    }
}
