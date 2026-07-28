using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Contabilidad.Infrastructure.Nlq
{
    public class NlqGeneracion
    {
        public string Sql { get; set; }
        public List<string> TablasUsadas { get; set; } = new();
        public decimal Confianza { get; set; }
        public string ChartSugerido { get; set; }
        public int TokensIn { get; set; }
        public int TokensOut { get; set; }
    }

    /// <summary>
    /// Tier 2: genera el SQL con Opus 4.8 (structured output {sql, tablasUsadas, confianza, chartSugerido}).
    /// Opus: thinking adaptive + output_config.effort=medium; NADA de temperature/top_p/budget_tokens.
    /// </summary>
    public class NlqGenerator
    {
        private readonly AnthropicClient _claude;
        private readonly NlqOptions _opt;
        private readonly ILogger<NlqGenerator> _log;

        public NlqGenerator(AnthropicClient claude, IOptions<NlqOptions> opt, ILogger<NlqGenerator> log)
        {
            _claude = claude;
            _opt = opt.Value;
            _log = log;
        }

        public async Task<NlqGeneracion> GenerarAsync(string system, string userPrompt, CancellationToken ct = default)
        {
            var r = await _claude.CrearMensajeAsync(
                modelo: _opt.ModeloGeneracion,
                system: system,
                userPrompt: userPrompt,
                jsonSchema: NlqPrompt.SchemaSql,
                maxTokens: 4096,
                thinkingAdaptive: true,   // Opus 4.8
                effort: "medium",         // output_config.effort (solo Opus)
                temperature: null,        // prohibido en Opus
                ct: ct);

            var gen = new NlqGeneracion { TokensIn = r.TokensIn, TokensOut = r.TokensOut };
            try
            {
                using var doc = JsonDocument.Parse(r.Texto);
                var root = doc.RootElement;
                if (root.TryGetProperty("sql", out var sql) && sql.ValueKind == JsonValueKind.String)
                    gen.Sql = sql.GetString();
                if (root.TryGetProperty("confianza", out var conf) && conf.ValueKind == JsonValueKind.Number)
                    gen.Confianza = conf.GetDecimal();
                if (root.TryGetProperty("chartSugerido", out var ch) && ch.ValueKind == JsonValueKind.String)
                    gen.ChartSugerido = ch.GetString();
                if (root.TryGetProperty("tablasUsadas", out var tu) && tu.ValueKind == JsonValueKind.Array)
                    foreach (var t in tu.EnumerateArray())
                        if (t.ValueKind == JsonValueKind.String) gen.TablasUsadas.Add(t.GetString());
            }
            catch (JsonException ex)
            {
                _log.LogWarning(ex, "NLQ generator: respuesta de Opus no es JSON valido del esquema.");
                gen.Sql = null; // el service lo tratara como fallo de generacion
            }
            return gen;
        }
    }
}
