namespace Contabilidad.Infrastructure
{
    /// <summary>
    /// Configuracion del modulo NLQ (consulta a BD en lenguaje natural). Seccion "Nlq" de appsettings.
    /// Overrideable por env vars con el patron Nlq__Enabled, Nlq__AnthropicApiKey, etc.
    ///
    /// KILL SWITCH: <see cref="Enabled"/> nace en false (el modulo no existe hacia afuera).
    /// SECRETO: <see cref="AnthropicApiKey"/> se coloca SOLO en appsettings.Local.json (GITIGNORADO)
    /// o env var Nlq__AnthropicApiKey; JAMAS en appsettings.json ni en el codigo fuente.
    /// </summary>
    public class NlqOptions
    {
        /// <summary>Feature flag global. false = todos los endpoints NLQ responden 404 (modulo apagado).</summary>
        public bool Enabled { get; set; } = false;

        /// <summary>Clave de la API de Anthropic. Se lee de appsettings.Local.json / env. Nunca se loguea ni se serializa hacia afuera.</summary>
        public string AnthropicApiKey { get; set; }

        /// <summary>Modelo para la generacion de SQL (Tier 2). Importa la correccion y el dialecto SQL Server 2012.</summary>
        public string ModeloGeneracion { get; set; } = "claude-opus-4-8";

        /// <summary>Modelo para el retrieval / seleccion de tablas (Tier 1), barato y determinista.</summary>
        public string ModeloRetrieval { get; set; } = "claude-haiku-4-5";

        /// <summary>Tope duro (segundos) para la llamada de generacion a Claude (HttpClient timeout).</summary>
        public int TimeoutGeneracionSeg { get; set; } = 120;

        /// <summary>CommandTimeout (segundos) para la EJECUCION del SQL generado bajo el login reader. Corto e independiente del de generacion.</summary>
        public int CommandTimeoutSeg { get; set; } = 30;

        /// <summary>Cap de filas del resultado (se fuerza como TOP (@cap) en el validador y como limite en el executor).</summary>
        public int CapFilas { get; set; } = 5000;

        /// <summary>Rate limit por usuario: maximo de preguntas por minuto. 0 = sin limite.</summary>
        public int MaxPreguntasMin { get; set; } = 10;

        /// <summary>Presupuesto diario de tokens (in+out) por usuario para las llamadas a Claude. 0 = sin tope.</summary>
        public long PresupuestoTokensDia { get; set; } = 2000000;

        /// <summary>TTL (minutos) del cache de resultados. v1: TTL unico para todo resultado.</summary>
        public int CacheResultadoTtlMin { get; set; } = 60;
    }
}
