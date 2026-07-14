using Microsoft.Extensions.Options;
using Contabilidad.Repositories;

namespace Contabilidad.Infrastructure
{
    /// <summary>
    /// Poller de reconciliacion de caja legacy. Corre a los horarios de config (hora Lima), hace
    /// catch-up al arrancar y dispara BarridoProfundo en la corrida de 00:00. KILL SWITCH via
    /// Reconciliacion:Enabled. Captura TODA excepcion (nunca tumba el host) + 1 reintento.
    /// </summary>
    public class ReconciliacionHostedService : BackgroundService
    {
        private const int SystemUserId = 1;   // usuario "sistema" para POLLER/STARTUP_CATCHUP (int de auditoria, sin FK)

        private readonly ILogger<ReconciliacionHostedService> _log;
        private readonly ReconciliacionRunner _runner;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ReconciliacionOptions _opt;

        public ReconciliacionHostedService(
            ILogger<ReconciliacionHostedService> log,
            ReconciliacionRunner runner,
            IServiceScopeFactory scopeFactory,
            IOptions<ReconciliacionOptions> opt)
        {
            _log = log;
            _runner = runner;
            _scopeFactory = scopeFactory;
            _opt = opt.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_opt.Enabled)
            {
                _log.LogInformation(
                    "[Reconciliacion] KILL SWITCH activo (Reconciliacion:Enabled=false). El poller NO se ejecutara. Modo config={Modo}.",
                    _opt.Modo);
                return;   // duerme: no agenda nada
            }

            // Esperar a que el API este sano.
            try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
            catch (OperationCanceledException) { return; }

            var tz = ReconciliacionScheduler.ResolveTimeZone(_opt.TimeZone);
            var modo = ReconciliacionScheduler.NormalizeModo(_opt.Modo);
            _log.LogInformation(
                "[Reconciliacion] Poller ACTIVO. Modo={Modo} TZ={Tz} Horarios=[{Horarios}] Piso={Piso} CommandTimeout={Ct}s.",
                modo, tz.Id, string.Join(",", _opt.Horarios ?? Array.Empty<string>()), _opt.PisoFecha, _opt.CommandTimeoutSeconds);

            // Catch-up: si la ultima corrida OK es anterior al ultimo horario ya vencido -> Tick STARTUP_CATCHUP.
            try { await CatchUpAsync(tz, modo, stoppingToken); }
            catch (OperationCanceledException) { return; }
            catch (Exception ex) { _log.LogError(ex, "[Reconciliacion] catch-up fallo (no fatal)."); }

            // Loop principal.
            while (!stoppingToken.IsCancellationRequested)
            {
                var (nextUtc, isMidnight) = ReconciliacionScheduler.ProximoHorario(tz, _opt.Horarios);
                var delay = nextUtc - DateTimeOffset.UtcNow;
                if (delay < TimeSpan.Zero) delay = TimeSpan.Zero;

                _log.LogInformation(
                    "[Reconciliacion] Proximo tick: {NextLima} (Lima) en {Delay}. BarridoProfundo={BP}.",
                    TimeZoneInfo.ConvertTime(nextUtc, tz), delay, isMidnight);

                try { await Task.Delay(delay, stoppingToken); }
                catch (OperationCanceledException) { break; }

                await EjecutarTickConReintentoAsync("POLLER", modo, isMidnight, stoppingToken);
            }

            _log.LogInformation("[Reconciliacion] Poller detenido.");
        }

        private async Task CatchUpAsync(TimeZoneInfo tz, string modo, CancellationToken ct)
        {
            var ultimoVencido = ReconciliacionScheduler.UltimoHorarioVencidoLima(tz, _opt.Horarios);

            DateTime? ultimaOk;
            using (var scope = _scopeFactory.CreateScope())
            {
                var repo = scope.ServiceProvider.GetRequiredService<ReconciliacionRepository>();
                ultimaOk = await repo.UltimaCorridaOkTickAsync();
            }

            if (ultimaOk == null || ultimaOk.Value < ultimoVencido)
            {
                _log.LogInformation(
                    "[Reconciliacion] catch-up: ultima corrida OK={UltimaOk}, ultimo horario vencido={Vencido} (Lima) => Tick STARTUP_CATCHUP.",
                    ultimaOk, ultimoVencido);
                await EjecutarTickConReintentoAsync("STARTUP_CATCHUP", modo, false, ct);
            }
            else
            {
                _log.LogInformation(
                    "[Reconciliacion] catch-up NO necesario (ultima corrida OK={UltimaOk} >= ultimo horario vencido={Vencido}).",
                    ultimaOk, ultimoVencido);
            }
        }

        private async Task EjecutarTickConReintentoAsync(string origen, string modo, bool barridoProfundo, CancellationToken ct)
        {
            try
            {
                var rows = await _runner.EjecutarTickAsync(modo, barridoProfundo, origen, SystemUserId, ct);
                _log.LogInformation(
                    "[Reconciliacion] Tick {Origen} OK (Modo={Modo}, BarridoProfundo={BP}). Filas de log: {N}.",
                    origen, modo, barridoProfundo, rows.Count);
                return;
            }
            catch (OperationCanceledException) { return; }
            catch (Exception ex)
            {
                _log.LogError(ex, "[Reconciliacion] Tick {Origen} fallo. Reintento en {Min} min.", origen, _opt.ReintentoMinutos);
                await SafeLogErrorAsync(origen, modo, "hosted:" + ex.Message, ct);
            }

            try { await Task.Delay(TimeSpan.FromMinutes(_opt.ReintentoMinutos), ct); }
            catch (OperationCanceledException) { return; }

            try
            {
                var rows = await _runner.EjecutarTickAsync(modo, barridoProfundo, origen, SystemUserId, ct);
                _log.LogInformation("[Reconciliacion] Reintento Tick {Origen} OK. Filas de log: {N}.", origen, rows.Count);
            }
            catch (OperationCanceledException) { /* apagando */ }
            catch (Exception ex2)
            {
                _log.LogError(ex2, "[Reconciliacion] Reintento Tick {Origen} fallo definitivamente.", origen);
                await SafeLogErrorAsync(origen, modo, "hosted-retry:" + ex2.Message, ct);
            }
        }

        private async Task SafeLogErrorAsync(string origen, string modo, string detalle, CancellationToken ct)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<ReconciliacionRepository>();
                await repo.LogErrorAsync(origen, modo, "TICK", null, detalle);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "[Reconciliacion] No se pudo escribir el log ERROR en conta (best-effort).");
            }
        }
    }
}
