using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    /// <summary>
    /// Acceso Dapper a los objetos del poller de reconciliacion (schema conta, FASE 1).
    /// - Los SPs sp_CajaRecon_Tick / sp_CajaRecon_ReconciliarDia contienen TODA la logica de negocio.
    /// - Los SELECT/INSERT inline aqui son de auditoria/lectura sobre NUESTRAS tablas conta
    ///   (log + dia): el plan (FASE 1, firmas finales) define el estado como "SELECT sobre
    ///   conta.caja_reconciliacion_log + conta.caja_reconciliacion_dia" y no existe un SP de lectura
    ///   (no se puede tocar la BD en esta fase). Cero SQL de negocio; cero SQL sobre dbo.
    /// </summary>
    public class ReconciliacionRepository
    {
        private readonly Db _db;
        public ReconciliacionRepository(Db db) => _db = db;

        // ---- Escritura via SPs (toda la logica vive en el SP) ----

        public async Task RunTickAsync(string modo, bool barridoProfundo, string origen, int idUsuario, int commandTimeout)
        {
            using var cn = _db.Open();
            await cn.ExecuteAsync(new CommandDefinition(
                "conta.sp_CajaRecon_Tick",
                new { Modo = modo, BarridoProfundo = barridoProfundo, IdUsuario = idUsuario, Origen = origen },
                commandType: CommandType.StoredProcedure,
                commandTimeout: commandTimeout));
        }

        public async Task RunReconciliarDiaAsync(DateTime fecha, string modo, string origen, int idUsuario, int commandTimeout)
        {
            using var cn = _db.Open();
            await cn.ExecuteAsync(new CommandDefinition(
                "conta.sp_CajaRecon_ReconciliarDia",
                new { Fecha = fecha, Modo = modo, IdUsuario = idUsuario, Origen = origen },
                commandType: CommandType.StoredProcedure,
                commandTimeout: commandTimeout));
        }

        // ---- Lectura de auditoria/estado (tablas conta propias) ----

        public async Task<int> MaxLogIdAsync()
        {
            using var cn = _db.Open();
            return await cn.ExecuteScalarAsync<int>(
                "SELECT ISNULL(MAX(i_IdLog),0) FROM conta.caja_reconciliacion_log");
        }

        public async Task<IEnumerable<ReconLogRow>> LogSinceAsync(int afterId)
        {
            using var cn = _db.Open();
            return await cn.QueryAsync<ReconLogRow>(
                @"SELECT i_IdLog, t_Inicio, t_Fin, v_Origen, v_Modo, v_Accion, d_Fecha, v_Resultado, v_Detalle, i_IdUsuario
                    FROM conta.caja_reconciliacion_log
                   WHERE i_IdLog > @AfterId
                   ORDER BY i_IdLog",
                new { AfterId = afterId });
        }

        public async Task<IEnumerable<ReconLogRow>> UltimasCorridasAsync(int top)
        {
            using var cn = _db.Open();
            return await cn.QueryAsync<ReconLogRow>(
                @"SELECT TOP (@Top) i_IdLog, t_Inicio, t_Fin, v_Origen, v_Modo, v_Accion, d_Fecha, v_Resultado, v_Detalle, i_IdUsuario
                    FROM conta.caja_reconciliacion_log
                   ORDER BY i_IdLog DESC",
                new { Top = top });
        }

        public async Task<IEnumerable<ReconDiaRow>> UltimosDiasAsync(int dias)
        {
            using var cn = _db.Open();
            return await cn.QueryAsync<ReconDiaRow>(
                @"SELECT TOP (@Dias) d_Fecha, v_Estado, n_Version, i_IdCajaMayorCierre,
                         d_TotalIngresos, d_TotalEgresos, i_CntIngresos, i_CntEgresos,
                         hf_Cnt, hf_Sum, hf_Chk, t_UltimaReconciliacion, t_UltimoCierre, t_UltimaVerificacion
                    FROM conta.caja_reconciliacion_dia
                   ORDER BY d_Fecha DESC",
                new { Dias = dias });
        }

        /// <summary>t_Inicio de la ultima corrida OK de TICK (para decidir el catch-up al arrancar).</summary>
        public async Task<DateTime?> UltimaCorridaOkTickAsync()
        {
            using var cn = _db.Open();
            return await cn.ExecuteScalarAsync<DateTime?>(
                "SELECT MAX(t_Inicio) FROM conta.caja_reconciliacion_log WHERE v_Accion='TICK' AND v_Resultado='OK'");
        }

        /// <summary>
        /// INSERT de auditoria ERROR (best-effort) para fallos a nivel C# (conexion/timeout) donde el SP
        /// no llego a escribir su propia fila. Directo a conta (permitido por el plan). v_Modo respeta CHECK.
        /// </summary>
        public async Task LogErrorAsync(string origen, string modo, string accion, DateTime? fecha, string detalle)
        {
            using var cn = _db.Open();
            await cn.ExecuteAsync(
                @"INSERT INTO conta.caja_reconciliacion_log
                        (t_Inicio, t_Fin, v_Origen, v_Modo, v_Accion, d_Fecha, v_Resultado, v_Detalle, i_IdUsuario)
                  VALUES (GETDATE(), GETDATE(), @Origen, @Modo, @Accion, @Fecha, 'ERROR', @Detalle, @IdUsuario)",
                new { Origen = origen, Modo = modo, Accion = accion, Fecha = fecha, Detalle = detalle, IdUsuario = 1 });
        }
    }
}
