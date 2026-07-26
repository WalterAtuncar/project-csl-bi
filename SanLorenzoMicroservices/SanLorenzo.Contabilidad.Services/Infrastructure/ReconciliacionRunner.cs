using Microsoft.Extensions.Options;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Infrastructure
{
    /// <summary>
    /// Punto UNICO de ejecucion de una corrida del poller. Serializa con un SemaphoreSlim(1,1)
    /// in-process (cinturon y tirantes junto al sp_getapplock del SP) para que el hosted service y el
    /// endpoint manual JAMAS se pisen. Devuelve las filas de log producidas por la corrida.
    /// Singleton: resuelve el repositorio (scoped) por scope propio en cada corrida.
    /// </summary>
    public class ReconciliacionRunner
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ReconciliacionOptions _opt;
        private readonly ILogger<ReconciliacionRunner> _logger;
        private readonly SemaphoreSlim _gate = new(1, 1);

        public ReconciliacionRunner(
            IServiceScopeFactory scopeFactory, IOptions<ReconciliacionOptions> opt,
            ILogger<ReconciliacionRunner> logger)
        {
            _scopeFactory = scopeFactory;
            _opt = opt.Value;
            _logger = logger;
        }

        public async Task<List<ReconLogRow>> EjecutarTickAsync(
            string modo, bool barridoProfundo, string origen, int idUsuario, CancellationToken ct)
        {
            await _gate.WaitAsync(ct);
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<ReconciliacionRepository>();
                var maxId = await repo.MaxLogIdAsync();
                await repo.RunTickAsync(modo, barridoProfundo, origen, idUsuario, _opt.CommandTimeoutSeconds);

                // Remediacion de consistencia EC (solo ESCRITURA): cierra el residuo HONORARIO/overlay
                // de ventas EC anuladas post-tipificacion — el mismo evento (anulacion) que dispara la
                // re-reconciliacion por huella. Un fallo aqui NO tumba el tick (la reconciliacion ya corrio).
                if (ReconciliacionScheduler.NormalizeModo(modo) == "ESCRITURA")
                {
                    try
                    {
                        var caja = scope.ServiceProvider.GetRequiredService<CajaRepository>();
                        var rem = caja.EgresosEcConsistenciaRemediar(idUsuario);
                        if (rem.Total > 0)
                            _logger.LogInformation(
                                "[Reconciliacion] Consistencia EC: {Total} clasificacion(es) remediada(s) tras el tick.",
                                rem.Total);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex,
                            "[Reconciliacion] Fallo la remediacion de consistencia EC tras el tick (el tick NO se marca fallido).");
                    }
                }

                return (await repo.LogSinceAsync(maxId)).ToList();
            }
            finally { _gate.Release(); }
        }

        public async Task<List<ReconLogRow>> EjecutarDiaAsync(
            DateTime fecha, string modo, string origen, int idUsuario, CancellationToken ct)
        {
            await _gate.WaitAsync(ct);
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<ReconciliacionRepository>();
                var maxId = await repo.MaxLogIdAsync();
                await repo.RunReconciliarDiaAsync(fecha, modo, origen, idUsuario, _opt.CommandTimeoutSeconds);
                return (await repo.LogSinceAsync(maxId)).ToList();
            }
            finally { _gate.Release(); }
        }
    }
}
