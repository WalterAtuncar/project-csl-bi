using System.Text.Json;
using Microsoft.Extensions.Options;
using Contabilidad.Models;

namespace Contabilidad.Infrastructure.Nlq
{
    public class NlqRetrievalResultado
    {
        public List<string> Objetos { get; set; } = new();   // nombres v_Objeto del catalogo (validados)
        public string Intencion { get; set; }
        public int TokensIn { get; set; }
        public int TokensOut { get; set; }
        public bool Fallback { get; set; }
    }

    /// <summary>
    /// Tier 1: selecciona los objetos del catalogo relevantes para la pregunta usando Haiku.
    /// Si Haiku falla o no devuelve objetos utiles, cae a un match por palabras clave (no bloquea).
    /// NUNCA devuelve objetos fuera del catalogo activo.
    /// </summary>
    public class NlqRetriever
    {
        private readonly AnthropicClient _claude;
        private readonly NlqOptions _opt;
        private readonly ILogger<NlqRetriever> _log;

        public NlqRetriever(AnthropicClient claude, IOptions<NlqOptions> opt, ILogger<NlqRetriever> log)
        {
            _claude = claude;
            _opt = opt.Value;
            _log = log;
        }

        public async Task<NlqRetrievalResultado> RecuperarAsync(
            string pregunta, List<NlqTablaListaRow> catalogo, CancellationToken ct = default)
        {
            // Set de nombres validos (case-insensitive) por v_Objeto y por schema.objeto.
            var validos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var t in catalogo)
            {
                validos.Add(t.v_Objeto);
                validos.Add($"{t.v_Schema}.{t.v_Objeto}");
            }

            try
            {
                var r = await _claude.CrearMensajeAsync(
                    modelo: _opt.ModeloRetrieval,
                    system: NlqPrompt.SystemRetrieval(),
                    userPrompt: NlqPrompt.UsuarioRetrieval(catalogo, pregunta),
                    jsonSchema: NlqPrompt.SchemaRetrieval,
                    maxTokens: 1024,
                    thinkingAdaptive: false,   // Haiku 4.5 no soporta thinking adaptive
                    effort: null,              // ni effort
                    temperature: 0,            // determinismo
                    ct: ct);

                var res = new NlqRetrievalResultado { TokensIn = r.TokensIn, TokensOut = r.TokensOut };
                using var doc = JsonDocument.Parse(r.Texto);
                var root = doc.RootElement;
                if (root.TryGetProperty("intencion", out var it) && it.ValueKind == JsonValueKind.String)
                    res.Intencion = it.GetString();
                if (root.TryGetProperty("objetos", out var objs) && objs.ValueKind == JsonValueKind.Array)
                {
                    foreach (var o in objs.EnumerateArray())
                    {
                        string nombre = o.GetString();
                        if (string.IsNullOrWhiteSpace(nombre)) continue;
                        // Solo objetos que existen en el catalogo (anti-alucinacion). Normaliza a v_Objeto.
                        var match = catalogo.FirstOrDefault(t =>
                            string.Equals(t.v_Objeto, nombre, StringComparison.OrdinalIgnoreCase) ||
                            string.Equals($"{t.v_Schema}.{t.v_Objeto}", nombre, StringComparison.OrdinalIgnoreCase));
                        if (match != null && !res.Objetos.Contains(match.v_Objeto)) res.Objetos.Add(match.v_Objeto);
                    }
                }

                if (res.Objetos.Count > 0) return res;
                // Haiku no eligio nada util -> fallback.
                _log.LogInformation("NLQ retriever: Haiku no devolvio objetos; usando fallback keyword.");
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "NLQ retriever: fallo Haiku; usando fallback keyword.");
            }

            return Fallback(pregunta, catalogo);
        }

        /// <summary>Match por palabras clave contra objeto+descripcion+dominio. Si nada matchea, devuelve TODO el catalogo.</summary>
        public static NlqRetrievalResultado Fallback(string pregunta, List<NlqTablaListaRow> catalogo)
        {
            var res = new NlqRetrievalResultado { Fallback = true, Intencion = null };
            var palabras = (pregunta ?? "")
                .ToLowerInvariant()
                .Split(new[] { ' ', ',', '.', ';', '?', '!', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                .Where(w => w.Length >= 4)
                .Distinct()
                .ToList();

            foreach (var t in catalogo)
            {
                string blob = ($"{t.v_Objeto} {t.v_Descripcion} {t.v_Dominio}").ToLowerInvariant();
                if (palabras.Any(w => blob.Contains(w)))
                    res.Objetos.Add(t.v_Objeto);
            }
            if (res.Objetos.Count == 0)
                res.Objetos = catalogo.Select(t => t.v_Objeto).ToList();
            return res;
        }
    }
}
