using System.Globalization;

namespace Contabilidad.Infrastructure
{
    /// <summary>
    /// Helpers puros de agenda del poller (sin estado): normalizacion de Modo, resolucion de zona
    /// horaria de Lima y calculo del proximo/ultimo horario. Los usan el hosted service y el controller.
    /// </summary>
    public static class ReconciliacionScheduler
    {
        /// <summary>
        /// Mapea el Modo de config ("Observacion"/"Escritura", con o sin tilde) al token que exige el SP
        /// (CHECK IN ('OBSERVACION','ESCRITURA')). Default seguro = OBSERVACION (nunca escribe por error).
        /// </summary>
        public static string NormalizeModo(string modo)
        {
            var m = (modo ?? "").Trim().ToUpperInvariant();
            return m.StartsWith("ESCR") ? "ESCRITURA" : "OBSERVACION";
        }

        /// <summary>Resuelve la zona horaria de Lima; fallback a America/Lima y a un UTC-5 fijo (Peru sin DST).</summary>
        public static TimeZoneInfo ResolveTimeZone(string tzId)
        {
            foreach (var id in new[] { tzId, "SA Pacific Standard Time", "America/Lima" })
            {
                if (string.IsNullOrWhiteSpace(id)) continue;
                try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
                catch { /* probar el siguiente */ }
            }
            return TimeZoneInfo.CreateCustomTimeZone("CSL-Lima-UTC-5", TimeSpan.FromHours(-5), "Lima (UTC-5)", "Lima (UTC-5)");
        }

        /// <summary>Parsea los horarios "HH:mm" a TimeSpan ordenados asc (00:00 primero). Fallback al set por defecto.</summary>
        public static List<TimeSpan> HorariosOrdenados(string[] horarios)
        {
            var src = (horarios != null && horarios.Length > 0)
                ? horarios
                : new[] { "09:00", "13:00", "17:00", "21:00", "00:00" };
            var list = new List<TimeSpan>();
            foreach (var h in src)
            {
                if (TimeSpan.TryParse((h ?? "").Trim(), CultureInfo.InvariantCulture, out var ts))
                    list.Add(ts);
            }
            if (list.Count == 0) list.Add(new TimeSpan(9, 0, 0));
            list.Sort();
            return list;
        }

        private static DateTime NowLima(TimeZoneInfo tz)
            => TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, tz).DateTime;

        /// <summary>
        /// Proximo horario programado (estrictamente futuro) en hora Lima, devuelto como instante UTC.
        /// isMidnight = true cuando el horario disparado es 00:00 (dispara BarridoProfundo).
        /// </summary>
        public static (DateTimeOffset nextUtc, bool isMidnight) ProximoHorario(TimeZoneInfo tz, string[] horarios)
        {
            var now = NowLima(tz);
            var horas = HorariosOrdenados(horarios);
            var today = now.Date;

            DateTime? pick = null;
            foreach (var h in horas)
            {
                var cand = today + h;
                if (cand > now) { pick = cand; break; }
            }
            if (pick == null) pick = today.AddDays(1) + horas[0];   // el mas temprano de manana (00:00 si existe)

            var isMidnight = pick.Value.TimeOfDay == TimeSpan.Zero;
            var utc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(pick.Value, DateTimeKind.Unspecified), tz);
            return (new DateTimeOffset(utc, TimeSpan.Zero), isMidnight);
        }

        /// <summary>
        /// Ultimo horario programado ya vencido en hora Lima (para decidir el catch-up al arrancar).
        /// Devuelto como hora local Lima (comparar con t_Inicio del log, que es hora local del server).
        /// </summary>
        public static DateTime UltimoHorarioVencidoLima(TimeZoneInfo tz, string[] horarios)
        {
            var now = NowLima(tz);
            var horas = HorariosOrdenados(horarios);
            var today = now.Date;

            DateTime? best = null;
            foreach (var h in horas)
            {
                var cand = today + h;
                if (cand <= now && (best == null || cand > best.Value)) best = cand;
            }
            if (best == null) best = today.AddDays(-1) + horas[horas.Count - 1];  // el ultimo de ayer
            return best.Value;
        }
    }
}
