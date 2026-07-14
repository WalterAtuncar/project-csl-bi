using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Contabilidad.Infrastructure;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    /// <summary>
    /// Disparo manual y estado del poller de reconciliacion de caja legacy (comparte camino/semaforo
    /// con el hosted service). Rutas bajo api/conta/caja (mismo prefijo que CajaController, sin colision).
    /// </summary>
    [ApiController]
    [Route("api/conta/caja")]
    [Authorize]
    public class CajaReconciliacionController : ControllerBase
    {
        private readonly ReconciliacionRunner _runner;
        private readonly ReconciliacionRepository _repo;
        private readonly ReconciliacionOptions _opt;

        public CajaReconciliacionController(
            ReconciliacionRunner runner, ReconciliacionRepository repo, IOptions<ReconciliacionOptions> opt)
        {
            _runner = runner;
            _repo = repo;
            _opt = opt.Value;
        }

        /// <summary>
        /// Dispara una corrida. Sin fecha => Tick completo; con fecha => reconciliar ese dia.
        /// Respeta el Modo de config: permite override SOLO hacia Observacion (jamas fuerza Escritura).
        /// </summary>
        [HttpPost("reconciliar")]
        [Authorize(Roles = "SA")]
        public async Task<IActionResult> Reconciliar([FromBody] ReconciliarRequest req, CancellationToken ct)
        {
            req ??= new ReconciliarRequest();

            var cfgModo = ReconciliacionScheduler.NormalizeModo(_opt.Modo);
            var reqModo = string.IsNullOrWhiteSpace(req.Modo) ? null : ReconciliacionScheduler.NormalizeModo(req.Modo);
            // ESCRITURA solo si config=ESCRITURA y el request NO pide bajar a Observacion; en cualquier otro caso, OBSERVACION.
            var modo = (cfgModo == "ESCRITURA" && reqModo != "OBSERVACION") ? "ESCRITURA" : "OBSERVACION";

            List<ReconLogRow> corrida;
            if (req.Fecha.HasValue)
                corrida = await _runner.EjecutarDiaAsync(req.Fecha.Value.Date, modo, "MANUAL", User.UserId(), ct);
            else
                corrida = await _runner.EjecutarTickAsync(modo, req.BarridoProfundo, "MANUAL", User.UserId(), ct);

            return Ok(new ReconciliacionCorridaResponse
            {
                Modo = modo,
                Origen = "MANUAL",
                Fecha = req.Fecha,
                BarridoProfundo = req.BarridoProfundo,
                Corrida = corrida
            });
        }

        /// <summary>Estado del poller: config efectiva + ultimas corridas del log + estados de dia.</summary>
        [HttpGet("reconciliacion/estado")]
        public async Task<IActionResult> Estado([FromQuery] int corridas = 25, [FromQuery] int dias = 35)
        {
            if (corridas < 1) corridas = 1; else if (corridas > 200) corridas = 200;
            if (dias < 1) dias = 1; else if (dias > 400) dias = 400;

            var cfg = new ReconConfigDto
            {
                Enabled = _opt.Enabled,
                Modo = ReconciliacionScheduler.NormalizeModo(_opt.Modo),
                PisoFecha = _opt.PisoFecha,
                Horarios = _opt.Horarios,
                TimeZone = _opt.TimeZone,
                ProximoHorarioUtc = null
            };
            if (_opt.Enabled)
            {
                var tz = ReconciliacionScheduler.ResolveTimeZone(_opt.TimeZone);
                cfg.ProximoHorarioUtc = ReconciliacionScheduler.ProximoHorario(tz, _opt.Horarios).nextUtc;
            }

            return Ok(new ReconEstadoResponse
            {
                Config = cfg,
                Corridas = (await _repo.UltimasCorridasAsync(corridas)).ToList(),
                Dias = (await _repo.UltimosDiasAsync(dias)).ToList()
            });
        }
    }
}
