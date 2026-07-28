using System.Collections.Concurrent;

namespace Contabilidad.Infrastructure.Nlq
{
    /// <summary>
    /// Se lanza cuando un usuario excede el rate limit o su presupuesto diario de tokens.
    /// La capa Controller la mapea a HTTP 429 (Too Many Requests).
    /// </summary>
    public class NlqLimiteExcedidoException : Exception
    {
        public NlqLimiteExcedidoException(string message) : base(message) { }
    }

    public interface INlqGuard
    {
        /// <summary>Registra una pregunta y lanza NlqLimiteExcedidoException si supera MaxPreguntasMin.</summary>
        void AdmitirPregunta(int idUsuario);

        /// <summary>Lanza NlqLimiteExcedidoException si el usuario ya agoto su presupuesto diario de tokens.</summary>
        void VerificarPresupuesto(int idUsuario);

        /// <summary>Suma el consumo de tokens (in+out) de una llamada a Claude para el usuario (dia actual).</summary>
        void RegistrarConsumo(int idUsuario, int tokensIn, int tokensOut);

        /// <summary>Tokens consumidos hoy por el usuario (diagnostico / tests).</summary>
        long TokensConsumidosHoy(int idUsuario);
    }

    /// <summary>
    /// Throttle por usuario (ventana deslizante de 1 minuto) + presupuesto diario de tokens por usuario.
    /// Contadores EN MEMORIA (v1). La persistencia/observabilidad real vive luego en conta.nlq_log.
    /// Killswitch global aparte = NlqOptions.Enabled. Registrar como Singleton.
    /// </summary>
    public class NlqGuard : INlqGuard
    {
        private readonly int _maxPorMinuto;
        private readonly long _presupuestoDia;
        private readonly Func<DateTime> _ahora;   // UTC

        private readonly ConcurrentDictionary<int, Queue<DateTime>> _ventana = new();
        private readonly ConcurrentDictionary<string, long> _tokensDia = new();

        /// <param name="ahora">Reloj inyectable (UTC) para pruebas. Por defecto DateTime.UtcNow.</param>
        public NlqGuard(NlqOptions opt, Func<DateTime> ahora = null)
        {
            _maxPorMinuto = opt?.MaxPreguntasMin ?? 0;
            _presupuestoDia = opt?.PresupuestoTokensDia ?? 0;
            _ahora = ahora ?? (() => DateTime.UtcNow);
        }

        public void AdmitirPregunta(int idUsuario)
        {
            if (_maxPorMinuto <= 0) return;
            var now = _ahora();
            var q = _ventana.GetOrAdd(idUsuario, _ => new Queue<DateTime>());
            lock (q)
            {
                while (q.Count > 0 && (now - q.Peek()).TotalSeconds >= 60) q.Dequeue();
                if (q.Count >= _maxPorMinuto)
                    throw new NlqLimiteExcedidoException(
                        $"Limite de {_maxPorMinuto} preguntas por minuto excedido. Intente de nuevo en unos segundos.");
                q.Enqueue(now);
            }
        }

        public void VerificarPresupuesto(int idUsuario)
        {
            if (_presupuestoDia <= 0) return;
            if (TokensConsumidosHoy(idUsuario) >= _presupuestoDia)
                throw new NlqLimiteExcedidoException(
                    "Presupuesto diario de tokens de IA agotado. Reintente manana o use una consulta guardada (0 tokens).");
        }

        public void RegistrarConsumo(int idUsuario, int tokensIn, int tokensOut)
        {
            long total = (long)Math.Max(0, tokensIn) + Math.Max(0, tokensOut);
            if (total == 0) return;
            _tokensDia.AddOrUpdate(Clave(idUsuario), total, (_, prev) => prev + total);
        }

        public long TokensConsumidosHoy(int idUsuario)
            => _tokensDia.TryGetValue(Clave(idUsuario), out var v) ? v : 0L;

        private string Clave(int idUsuario) => idUsuario + "|" + _ahora().ToString("yyyy-MM-dd");
    }
}
