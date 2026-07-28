using System.Data.SqlClient;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Dapper;
using Microsoft.Extensions.Options;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Infrastructure.Nlq
{
    /// <summary>
    /// Orquestador del pipeline NL2SQL (§1.1). tier0 cache -> retrieve -> detalle -> prompt -> generate
    /// -> VALIDAR -> ejecutar (reader) -> cache -> log. Auto-correccion de 2 reintentos. La barrera de
    /// seguridad son el validador + el login reader; la pregunta jamas se concatena a SQL.
    /// </summary>
    public class NlqService
    {
        private const decimal ConfianzaMinima = 0.5m;

        private readonly NlqRepository _repo;
        private readonly NlqRetriever _retriever;
        private readonly NlqGenerator _generator;
        private readonly NlqValidator _validator;
        private readonly NlqExecutor _executor;
        private readonly NlqCache _cache;
        private readonly INlqGuard _guard;
        private readonly NlqOptions _opt;
        private readonly ILogger<NlqService> _log;

        public NlqService(NlqRepository repo, NlqRetriever retriever, NlqGenerator generator,
            NlqValidator validator, NlqExecutor executor, NlqCache cache, INlqGuard guard,
            IOptions<NlqOptions> opt, ILogger<NlqService> log)
        {
            _repo = repo;
            _retriever = retriever;
            _generator = generator;
            _validator = validator;
            _executor = executor;
            _cache = cache;
            _guard = guard;
            _opt = opt.Value;
            _log = log;
        }

        // =================== PREGUNTAR (pipeline completo) ===================
        public async Task<NlqRespuestaDto> PreguntarAsync(string pregunta, int idUsuario, CancellationToken ct = default)
        {
            _guard.AdmitirPregunta(idUsuario);
            _guard.VerificarPresupuesto(idUsuario);

            var sw = Stopwatch.StartNew();
            var catalogo = _repo.CatalogoLista();
            var allowlist = ConstruirAllowlist(catalogo);
            int tokensIn = 0, tokensOut = 0;

            // ---- TIER 0: cache semantico (0 tokens) ----
            string cacheSql = null;
            try { cacheSql = _cache.BuscarSemantico(pregunta); }
            catch (Exception ex) { _log.LogWarning(ex, "NLQ: fallo lectura de cache semantico."); }

            if (!string.IsNullOrWhiteSpace(cacheSql))
            {
                var val = _validator.Validar(cacheSql, allowlist, _opt.CapFilas);
                if (val.Ok)
                {
                    try
                    {
                        var respCache = EjecutarYArmar(val.SqlNormalizado, "cache_sem", 1m, 0, 0, sw, pregunta, idUsuario);
                        return respCache;
                    }
                    catch (SqlException ex)
                    {
                        _log.LogWarning(ex, "NLQ: SQL de cache fallo al ejecutar; se regenera.");
                    }
                }
                else
                {
                    _log.LogInformation("NLQ: SQL de cache invalido (drift?): {Motivo}; se regenera.", val.Motivo);
                }
            }

            // ---- TIER 1: retrieval (sobre el esqueleto relacional PK/FK) ----
            var esqueleto = _repo.CatalogoEsqueleto();
            var retr = await _retriever.RecuperarAsync(pregunta, esqueleto, ct);
            tokensIn += retr.TokensIn; tokensOut += retr.TokensOut;
            _guard.RegistrarConsumo(idUsuario, retr.TokensIn, retr.TokensOut);

            // Expansion determinista por FK (1 SALTO): el retriever suele elegir solo la tabla "central"
            // (p.ej. diagnosticrepository) y el generador no puede unir tablas que no se le dieron. Se
            // agregan las tablas ACTIVAS que sus FK referencian (para nombre legible y fecha real), sin recursion.
            var objetosBase = retr.Objetos.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            var objetos = ExpandirPorFk(objetosBase, esqueleto);
            var agregados = objetos.Where(o => !objetosBase.Contains(o, StringComparer.OrdinalIgnoreCase)).ToList();
            if (agregados.Count > 0)
                _log.LogInformation("NLQ: expansion FK (1 salto) agrego {Cuenta} objeto(s): {Objetos}",
                    agregados.Count, string.Join(", ", agregados));

            string csv = string.Join(",", objetos);
            var detalle = _repo.CatalogoDetalle(csv);
            string system = NlqPrompt.SystemGeneracion();
            string userBase = NlqPrompt.UsuarioGeneracion(detalle, pregunta, retr.Intencion);

            // ---- TIER 2 + 3: generar / validar / ejecutar con auto-correccion (max 2 reintentos) ----
            string userActual = userBase;
            string sqlActual = null;
            decimal confianza = 0m;
            string ultimoError = null;

            for (int intento = 1; intento <= 3; intento++)
            {
                var gen = await _generator.GenerarAsync(system, userActual, ct);
                tokensIn += gen.TokensIn; tokensOut += gen.TokensOut;
                _guard.RegistrarConsumo(idUsuario, gen.TokensIn, gen.TokensOut);
                sqlActual = gen.Sql;
                confianza = gen.Confianza;

                if (string.IsNullOrWhiteSpace(sqlActual))
                {
                    ultimoError = "El modelo no devolvio un SQL.";
                    break;
                }

                var val = _validator.Validar(sqlActual, allowlist, _opt.CapFilas);
                if (!val.Ok)
                {
                    ultimoError = "Validacion: " + val.Motivo;
                    if (intento < 3) { userActual = NlqPrompt.ConError(userBase, sqlActual, val.Motivo); continue; }
                    break;
                }

                try
                {
                    var resp = EjecutarYArmar(val.SqlNormalizado, "generado", confianza, tokensIn, tokensOut, sw, pregunta, idUsuario);
                    // Guardar en caches (best-effort).
                    try { _cache.GuardarSemantico(pregunta, val.SqlNormalizado); }
                    catch (Exception ex) { _log.LogWarning(ex, "NLQ: fallo guardado de cache semantico."); }
                    return resp;
                }
                catch (SqlException ex)
                {
                    ultimoError = ex.Message;
                    if (intento < 3) { userActual = NlqPrompt.ConError(userBase, val.SqlNormalizado, ex.Message); continue; }
                    break;
                }
            }

            // Tope de reintentos alcanzado: error limpio (SQL a la vista, sin filas). Loguea.
            SafeLog(pregunta, sqlActual, tokensIn, tokensOut, (int)sw.ElapsedMilliseconds, 0, "generado", true, ultimoError, idUsuario);
            return new NlqRespuestaDto
            {
                Sql = sqlActual,
                Fuente = "generado",
                TokensIn = tokensIn,
                TokensOut = tokensOut,
                Confianza = confianza,
                ChartSugerido = "tabla",
                Error = "No se pudo generar una consulta valida. " + ultimoError
            };
        }

        /// <summary>Ejecuta un SQL YA validado, arma la respuesta, cachea el resultado y loguea (ruta preguntar).</summary>
        private NlqRespuestaDto EjecutarYArmar(string sqlNorm, string fuente, decimal confianza,
            int tokensIn, int tokensOut, Stopwatch sw, string pregunta, int idUsuario)
        {
            // Cache de resultado (por hash del SQL). 0 ejecucion si hay hit.
            NlqEjecucionResultado ej;
            NlqCacheResRow hit = null;
            try { hit = _cache.BuscarResultado(sqlNorm); }
            catch (Exception ex) { _log.LogWarning(ex, "NLQ: fallo lectura de cache de resultado."); }

            if (hit != null && !string.IsNullOrWhiteSpace(hit.v_Payload))
            {
                ej = DesdePayload(hit.v_Payload);
            }
            else
            {
                ej = _executor.Ejecutar(sqlNorm);
                try { _cache.GuardarResultado(sqlNorm, SerializarPayload(ej)); }
                catch (Exception ex) { _log.LogWarning(ex, "NLQ: fallo guardado de cache de resultado."); }
            }

            var resp = new NlqRespuestaDto
            {
                Sql = sqlNorm,
                Columnas = ej.Columnas,
                Filas = ej.Filas,
                ChartSugerido = InferirChart(ej.Columnas, ej.Filas),
                Confianza = confianza,
                Fuente = fuente,
                TokensIn = tokensIn,
                TokensOut = tokensOut,
                Advertencia = Advertencia(ej.CapAlcanzado, confianza)
            };

            SafeLog(pregunta, sqlNorm, tokensIn, tokensOut, (int)sw.ElapsedMilliseconds, ej.Filas.Count, fuente, false, null, idUsuario);
            return resp;
        }

        // =================== GUARDADAS (0 tokens) ===================
        public NlqDatosDto EjecutarGuardada(NlqGuardadaFullRow g, Dictionary<string, object> paramsReq, int idUsuario)
        {
            var allowlist = AllowlistActual();
            var val = _validator.Validar(g.v_Sql, allowlist, _opt.CapFilas);
            if (!val.Ok)
                throw new ContaBusinessException("La consulta guardada ya no es valida: " + val.Motivo);

            var (dp, canonico) = BindParams(g.v_Params, paramsReq, val.SqlNormalizado);

            NlqEjecucionResultado ej;
            NlqCacheResRow hit = null;
            try { hit = _cache.BuscarResultado(val.SqlNormalizado, canonico); }
            catch (Exception ex) { _log.LogWarning(ex, "NLQ: fallo lectura de cache de resultado (guardada)."); }

            if (hit != null && !string.IsNullOrWhiteSpace(hit.v_Payload))
            {
                ej = DesdePayload(hit.v_Payload);
            }
            else
            {
                ej = _executor.Ejecutar(val.SqlNormalizado, dp);
                try { _cache.GuardarResultado(val.SqlNormalizado, SerializarPayload(ej), canonico); }
                catch (Exception ex) { _log.LogWarning(ex, "NLQ: fallo guardado de cache de resultado (guardada)."); }
            }

            SafeLog("[guardada:" + g.Id + "] " + g.v_Nombre, val.SqlNormalizado, 0, 0, 0, ej.Filas.Count, "cache_guardada", false, null, idUsuario);
            return new NlqDatosDto
            {
                Columnas = ej.Columnas,
                Filas = ej.Filas,
                ChartTipo = g.v_ChartTipo,
                ChartConfig = g.v_ChartConfig
            };
        }

        // =================== Catalogo / fingerprint ===================
        public HashSet<string> AllowlistActual() => ConstruirAllowlist(_repo.CatalogoLista());
        public string FingerprintActual() => CalcularFingerprint(_repo.CatalogoLista());

        public NlqCatalogoDto ObtenerCatalogo()
        {
            var catalogo = _repo.CatalogoLista();
            string csv = string.Join(",", catalogo.Select(t => t.v_Objeto).Distinct());
            int columnas = 0;
            if (catalogo.Count > 0)
            {
                var det = _repo.CatalogoDetalle(csv);
                columnas = det.Columnas.Count;
            }
            var dominios = catalogo
                .GroupBy(t => t.v_Dominio ?? "")
                .Select(gr => new NlqCatalogoDominioDto { Dominio = gr.Key, Tablas = gr.Count(), Columnas = 0 })
                .ToList();

            return new NlqCatalogoDto
            {
                Fingerprint = CalcularFingerprint(catalogo),
                TotalObjetos = catalogo.Count,
                TotalColumnas = columnas,
                Dominios = dominios
            };
        }

        // =================== Helpers puros (testeables sin red/BD) ===================
        public static HashSet<string> ConstruirAllowlist(IEnumerable<NlqTablaListaRow> catalogo)
        {
            var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var t in catalogo)
            {
                if (string.IsNullOrWhiteSpace(t.v_Objeto)) continue;
                set.Add(t.v_Objeto);                                  // objeto
                if (!string.IsNullOrWhiteSpace(t.v_Schema))
                {
                    set.Add($"{t.v_Schema}.{t.v_Objeto}");            // schema.objeto
                    if (!string.IsNullOrWhiteSpace(t.v_Base))
                    {
                        // 3 partes cross-DB, con y sin corchetes (el validador normaliza quitando corchetes).
                        set.Add($"[{t.v_Base}].[{t.v_Schema}].[{t.v_Objeto}]");
                        set.Add($"{t.v_Base}.{t.v_Schema}.{t.v_Objeto}");
                    }
                }
            }
            return set;
        }

        /// <summary>
        /// Expande el set de objetos seleccionados con las tablas que sus FK referencian (UN SALTO, no recursivo).
        /// Solo agrega tablas que existan como objeto ACTIVO en el esqueleto. Las vistas (FKs null) no expanden.
        /// Opera sobre el esqueleto ya en memoria (FKs = "col->schema.tabla.col, ...").
        /// </summary>
        public static List<string> ExpandirPorFk(IEnumerable<string> seleccionados, List<NlqEsqueletoRow> esqueleto)
        {
            var porNombre = new Dictionary<string, NlqEsqueletoRow>(StringComparer.OrdinalIgnoreCase);
            foreach (var e in esqueleto ?? new List<NlqEsqueletoRow>())
                if (!string.IsNullOrWhiteSpace(e.v_Objeto) && !porNombre.ContainsKey(e.v_Objeto))
                    porNombre[e.v_Objeto] = e;

            var orden = new List<string>();
            var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var baseList = new List<string>();
            foreach (var s in seleccionados ?? Enumerable.Empty<string>())
            {
                if (string.IsNullOrWhiteSpace(s)) continue;
                if (set.Add(s)) { orden.Add(s); baseList.Add(s); }
            }

            // 1 SALTO: solo se expande desde los objetos base (NO desde los recien agregados).
            foreach (var s in baseList)
            {
                if (!porNombre.TryGetValue(s, out var fila) || string.IsNullOrWhiteSpace(fila.FKs)) continue;
                foreach (var fk in fila.FKs.Split(','))
                {
                    string tabla = TablaReferenciada(fk);
                    if (string.IsNullOrWhiteSpace(tabla)) continue;
                    if (porNombre.TryGetValue(tabla, out var referida) && set.Add(referida.v_Objeto))
                        orden.Add(referida.v_Objeto);
                }
            }
            return orden;
        }

        /// <summary>Del texto de una FK ("col->schema.tabla.col") extrae la TABLA referenciada (penultimo segmento).</summary>
        private static string TablaReferenciada(string fkEntry)
        {
            if (string.IsNullOrWhiteSpace(fkEntry)) return null;
            int flecha = fkEntry.IndexOf("->", StringComparison.Ordinal);
            string der = (flecha >= 0 ? fkEntry.Substring(flecha + 2) : fkEntry).Replace("[", "").Replace("]", "").Trim();
            var parts = der.Split('.');
            if (parts.Length >= 2) return parts[parts.Length - 2].Trim();   // schema.TABLA.col -> TABLA
            return parts.Length == 1 ? parts[0].Trim() : null;
        }

        public static string CalcularFingerprint(IEnumerable<NlqTablaListaRow> catalogo)
        {
            var claves = catalogo
                .Select(t => $"{t.v_Base}|{t.v_Schema}|{t.v_Objeto}")
                .OrderBy(x => x, StringComparer.Ordinal)
                .ToList();
            return NlqCache.Sha256Hex(string.Join("\n", claves));
        }

        /// <summary>Chart determinista por forma del resultado (§4.6). Manda sobre la pista del modelo.</summary>
        public static string InferirChart(List<NlqColumnaDto> cols, List<List<object>> filas)
        {
            if (cols == null || cols.Count == 0) return "tabla";
            int nNum = cols.Count(c => c.Formato == "money" || c.Formato == "int" || c.Formato == "pct");
            int nText = cols.Count(c => c.Formato == "text");
            bool hayFecha = cols.Any(c => c.Formato == "date");
            int filasN = filas?.Count ?? 0;

            if (filasN <= 1 && cols.Count == 1) return "kpi";
            if (hayFecha && nNum >= 1) return "line";
            if (!hayFecha && nText == 0 && nNum == 2 && cols.Count == 2) return "scatter";
            if (nText >= 1 && nNum >= 1) return "bar";
            return "tabla";
        }

        private static string Advertencia(bool capAlcanzado, decimal confianza)
        {
            var partes = new List<string>();
            if (capAlcanzado) partes.Add("Se alcanzo el limite de filas; el resultado puede estar truncado.");
            if (confianza > 0m && confianza < ConfianzaMinima) partes.Add("Confianza baja: verifica el SQL antes de decidir.");
            return partes.Count > 0 ? string.Join(" ", partes) : null;
        }

        // ---- payload cache (serializacion columnas+filas) ----
        private class Payload
        {
            public List<NlqColumnaDto> Columnas { get; set; } = new();
            public List<List<object>> Filas { get; set; } = new();
        }

        private static string SerializarPayload(NlqEjecucionResultado ej)
            => JsonSerializer.Serialize(new Payload { Columnas = ej.Columnas, Filas = ej.Filas });

        private static NlqEjecucionResultado DesdePayload(string json)
        {
            var p = JsonSerializer.Deserialize<Payload>(json) ?? new Payload();
            return new NlqEjecucionResultado { Columnas = p.Columnas, Filas = p.Filas };
        }

        // ---- bind de params de consulta guardada (§3.5: SqlParameters de Dapper, JAMAS concatenar) ----
        private static (DynamicParameters, string) BindParams(string paramsJson, Dictionary<string, object> req, string sqlNorm)
        {
            var dp = new DynamicParameters();
            var canonico = new StringBuilder();
            var declarados = ParseDeclaraciones(paramsJson);

            foreach (var d in declarados)
            {
                string nombre = d;
                // Solo se bindea si el SQL usa el placeholder @<nombre>.
                if (sqlNorm.IndexOf("@" + nombre, StringComparison.OrdinalIgnoreCase) < 0) continue;

                object valor = null;
                if (req != null && req.TryGetValue(nombre, out var raw)) valor = ConvertirValor(raw);

                dp.Add("@" + nombre, valor);
                canonico.Append(nombre).Append('=').Append(valor?.ToString() ?? "null").Append(';');
            }
            return (dp, canonico.ToString());
        }

        private static List<string> ParseDeclaraciones(string paramsJson)
        {
            var res = new List<string>();
            if (string.IsNullOrWhiteSpace(paramsJson)) return res;
            try
            {
                using var doc = JsonDocument.Parse(paramsJson);
                if (doc.RootElement.ValueKind == JsonValueKind.Array)
                    foreach (var e in doc.RootElement.EnumerateArray())
                        if (e.TryGetProperty("nombre", out var nm) && nm.ValueKind == JsonValueKind.String)
                            res.Add(nm.GetString());
            }
            catch { /* v_Params malformado: sin params declarados */ }
            return res;
        }

        private static object ConvertirValor(object raw)
        {
            if (raw is JsonElement je)
            {
                switch (je.ValueKind)
                {
                    case JsonValueKind.String: return je.GetString();
                    case JsonValueKind.Number: return je.TryGetInt64(out var l) ? l : (object)je.GetDecimal();
                    case JsonValueKind.True: return true;
                    case JsonValueKind.False: return false;
                    case JsonValueKind.Null: return null;
                    default: return je.ToString();
                }
            }
            return raw;
        }

        private void SafeLog(string pregunta, string sql, int tin, int tout, int ms, int filas,
            string fuente, bool error, string errorTexto, int idUsuario)
        {
            try { _repo.LogInsert(Truncar(pregunta, 1000), sql, tin, tout, ms, filas, fuente, error, Truncar(errorTexto, 1000), idUsuario); }
            catch (Exception ex) { _log.LogWarning(ex, "NLQ: fallo al insertar en nlq_log."); }
        }

        private static string Truncar(string s, int max)
            => string.IsNullOrEmpty(s) ? s : (s.Length <= max ? s : s.Substring(0, max));
    }
}
