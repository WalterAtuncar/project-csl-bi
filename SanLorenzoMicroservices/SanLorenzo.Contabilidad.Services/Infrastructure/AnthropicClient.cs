using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Contabilidad.Infrastructure
{
    /// <summary>Resultado normalizado de una llamada a la API de Mensajes de Anthropic.</summary>
    public class AnthropicMensajeResultado
    {
        /// <summary>Texto concatenado de los bloques de tipo "text" (cuando hay structured output, ES el JSON).</summary>
        public string Texto { get; set; }
        public int TokensIn { get; set; }
        public int TokensOut { get; set; }
        public string StopReason { get; set; }
    }

    /// <summary>
    /// Cliente de la API de Anthropic (Claude). IMPLEMENTACION: HttpClient directo contra
    /// https://api.anthropic.com/v1/messages (headers x-api-key + anthropic-version: 2023-06-01).
    ///
    /// Por que HttpClient y NO el SDK oficial "Anthropic" (NuGet): el SDK no esta en la cache NuGet
    /// local y targetea frameworks mas nuevos; agregarlo a este proyecto net6 (EOL) es un riesgo de
    /// restore/compatibilidad. La API de Mensajes es trivial y estable, no requiere dependencias, y
    /// asi se controlan al 100% los parametros de drift (output_config.format, thinking:{type:adaptive}).
    /// Se registra con AddHttpClient&lt;AnthropicClient&gt; (mismo patron que LegacyAuthClient).
    ///
    /// SEGURIDAD: la key sale de NlqOptions (appsettings.Local.json / env). JAMAS se hardcodea, JAMAS
    /// se loguea. Solo se registra el status y un extracto del body de ERROR (que nunca contiene la key).
    /// </summary>
    public class AnthropicClient
    {
        public const string Endpoint = "https://api.anthropic.com/v1/messages";
        public const string AnthropicVersion = "2023-06-01";

        private static readonly JsonSerializerOptions JsonOpts = new JsonSerializerOptions
        {
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        private readonly HttpClient _http;
        private readonly NlqOptions _opt;
        private readonly ILogger<AnthropicClient> _log;

        public AnthropicClient(HttpClient http, IOptions<NlqOptions> opt, ILogger<AnthropicClient> log)
        {
            _http = http;
            _opt = opt.Value;
            _log = log;
            var secs = _opt.TimeoutGeneracionSeg > 0 ? _opt.TimeoutGeneracionSeg : 120;
            _http.Timeout = TimeSpan.FromSeconds(secs);
        }

        /// <summary>
        /// Crea un mensaje. Metodo generico usado tanto por el retriever (Haiku) como por el generador (Opus).
        /// </summary>
        /// <param name="modelo">Id del modelo (p.ej. claude-opus-4-8 / claude-haiku-4-5).</param>
        /// <param name="system">System prompt (reglas duras / rol).</param>
        /// <param name="userPrompt">Contenido del turno del usuario (pregunta + sintesis de esquema).</param>
        /// <param name="jsonSchema">
        /// Si se provee, activa STRUCTURED OUTPUT: el modelo devuelve exactamente ese shape JSON.
        /// Se envia como output_config.format = { type: "json_schema", schema: &lt;jsonSchema&gt; }.
        /// (Forma segun la guia claude-api; confirmar contra la skill claude-api antes de habilitar en vivo.)
        /// </param>
        /// <param name="maxTokens">Tope de tokens de salida.</param>
        /// <param name="thinkingAdaptive">
        /// Extended thinking en modo adaptativo (thinking:{type:"adaptive"}). NADA de budget_tokens (deprecado).
        /// SOLO para Opus 4.8; Haiku 4.5 no lo soporta (dejar en false).
        /// </param>
        /// <param name="effort">
        /// output_config.effort (p.ej. "medium"). SOLO Opus 4.8; requiere jsonSchema (vive dentro de output_config).
        /// Haiku 4.5 no lo soporta (dejar en null).
        /// </param>
        /// <param name="temperature">
        /// Opcional. Permitido en Haiku (0 para determinismo). PROHIBIDO en Opus 4.8 (400). Dejar null para Opus.
        /// </param>
        public async Task<AnthropicMensajeResultado> CrearMensajeAsync(
            string modelo,
            string system,
            string userPrompt,
            string jsonSchema = null,
            int maxTokens = 4096,
            bool thinkingAdaptive = false,
            string effort = null,
            double? temperature = null,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(_opt.AnthropicApiKey))
                throw new InvalidOperationException(
                    "Nlq:AnthropicApiKey no esta configurada (appsettings.Local.json / env Nlq__AnthropicApiKey).");

            var body = new Dictionary<string, object>
            {
                ["model"] = modelo,
                ["max_tokens"] = maxTokens,
                ["system"] = system,
                ["messages"] = new object[]
                {
                    new Dictionary<string, object>
                    {
                        ["role"] = "user",
                        ["content"] = userPrompt
                    }
                }
            };

            if (thinkingAdaptive)
            {
                // Extended thinking adaptativo (solo Opus): el modelo decide cuanto razonar. Nunca budget_tokens.
                body["thinking"] = new Dictionary<string, object> { ["type"] = "adaptive" };
            }

            if (temperature.HasValue)
            {
                // Solo valido en modelos que lo permiten (Haiku). En Opus provoca 400: no pasar.
                body["temperature"] = temperature.Value;
            }

            if (!string.IsNullOrWhiteSpace(jsonSchema))
            {
                using var schemaDoc = JsonDocument.Parse(jsonSchema);
                var oc = new Dictionary<string, object>
                {
                    ["format"] = new Dictionary<string, object>
                    {
                        ["type"] = "json_schema",
                        ["schema"] = schemaDoc.RootElement.Clone()
                    }
                };
                // effort vive DENTRO de output_config (junto a format); solo Opus lo soporta.
                if (!string.IsNullOrWhiteSpace(effort)) oc["effort"] = effort;
                body["output_config"] = oc;
            }

            var reqJson = JsonSerializer.Serialize(body, JsonOpts);

            using var req = new HttpRequestMessage(HttpMethod.Post, Endpoint);
            req.Headers.Add("x-api-key", _opt.AnthropicApiKey);
            req.Headers.Add("anthropic-version", AnthropicVersion);
            req.Content = new StringContent(reqJson, Encoding.UTF8, "application/json");

            using var resp = await _http.SendAsync(req, ct);
            var respJson = await resp.Content.ReadAsStringAsync(ct);

            if (!resp.IsSuccessStatusCode)
            {
                _log.LogError("Anthropic API devolvio {Status}: {Body}", (int)resp.StatusCode, Extracto(respJson));
                throw new InvalidOperationException($"Anthropic API respondio {(int)resp.StatusCode}.");
            }

            return Parsear(respJson);
        }

        private static AnthropicMensajeResultado Parsear(string json)
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var sb = new StringBuilder();
            if (root.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.Array)
            {
                foreach (var block in content.EnumerateArray())
                {
                    // Solo bloques de texto (ignora "thinking", "redacted_thinking", etc.).
                    if (block.TryGetProperty("type", out var t) && t.GetString() == "text"
                        && block.TryGetProperty("text", out var txt))
                    {
                        sb.Append(txt.GetString());
                    }
                }
            }

            int tin = 0, tout = 0;
            if (root.TryGetProperty("usage", out var usage))
            {
                if (usage.TryGetProperty("input_tokens", out var i) && i.ValueKind == JsonValueKind.Number) tin = i.GetInt32();
                if (usage.TryGetProperty("output_tokens", out var o) && o.ValueKind == JsonValueKind.Number) tout = o.GetInt32();
            }

            string stop = null;
            if (root.TryGetProperty("stop_reason", out var sr) && sr.ValueKind == JsonValueKind.String)
                stop = sr.GetString();

            return new AnthropicMensajeResultado { Texto = sb.ToString(), TokensIn = tin, TokensOut = tout, StopReason = stop };
        }

        private static string Extracto(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Length <= 500 ? s : s.Substring(0, 500) + "...";
        }
    }
}
