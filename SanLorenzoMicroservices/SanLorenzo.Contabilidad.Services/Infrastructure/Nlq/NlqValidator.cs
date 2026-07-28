using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Contabilidad.Infrastructure.Nlq
{
    /// <summary>Resultado de la validacion de un SQL candidato.</summary>
    public class NlqValidacionResultado
    {
        public bool Ok { get; set; }
        public string Motivo { get; set; }
        /// <summary>SQL saneado y listo para ejecutar (comentarios fuera, espacios colapsados, TOP (@cap) forzado). Solo cuando Ok.</summary>
        public string SqlNormalizado { get; set; }
        /// <summary>Objetos (tabla/vista) referenciados y validados contra el allowlist. Diagnostico.</summary>
        public List<string> ObjetosReferenciados { get; set; } = new();

        public static NlqValidacionResultado Rechazo(string motivo)
            => new NlqValidacionResultado { Ok = false, Motivo = motivo };
    }

    /// <summary>
    /// Validador defensivo del SQL generado por la IA (§4.4 + §4.7 del PLAN_NLQ_CONTA).
    /// La barrera NO es el LLM: es este validador + el login read-only. La pregunta del usuario es
    /// TEXTO NO CONFIABLE. Postura: ante la duda, RECHAZAR (la sobre-restriccion es segura).
    ///
    /// Reglas:
    ///   1. Un solo statement (permite ';' final, rechaza separadores).
    ///   2. Debe empezar por SELECT o WITH.
    ///   3. Rechaza toda palabra/prefijo peligroso (DML/DDL/EXEC/xp_/sp_/GO/WAITFOR/INTO/...),
    ///      incluso oculta en comentarios o disfrazada con unicode/zero-width/fullwidth.
    ///   4. Allowlist: todo objeto referenciado debe estar en el set inyectado (CTEs se auto-permiten).
    ///   5. Fuerza TOP (@cap) en el SELECT principal si falta.
    ///   6. (Opcional) rechaza columnas sensibles (p.ej. v_Password) — doble candado con el DENY del login.
    /// </summary>
    public class NlqValidator
    {
        // Palabras completas prohibidas (case-insensitive, con frontera de palabra).
        private static readonly Regex ReDanger = new Regex(
            @"\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|EXECUTE|EXEC|GRANT|REVOKE|DENY|WAITFOR|INTO|GO|RECONFIGURE|SHUTDOWN|DBCC|KILL|BACKUP|RESTORE|OPENROWSET|OPENQUERY|OPENDATASOURCE|OPENXML|BULK)\b",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

        // Prefijos de procedimientos de sistema/extendidos: sp_..., xp_...
        private static readonly Regex RePrefix = new Regex(
            @"\b(?:sp|xp)_\w*",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

        private static readonly Regex ReStart = new Regex(
            @"^(SELECT|WITH)\b",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

        // Nombres de CTE definidos por WITH: captura el nombre antes de "AS (".
        private static readonly Regex ReCte = new Regex(
            @"(?:\bWITH\b|,)\s*(\[?[A-Za-z_@#][\w$#]*\]?)\s*(?:\([^)]*\))?\s+AS\s*\(",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

        // Tokenizador: identificadores (con puntos y corchetes), literales vacios y simbolos sueltos.
        private static readonly Regex ReToken = new Regex(
            @"(?:\[[^\]]*\]|[A-Za-z_@#][\w$#]*)(?:\.(?:\[[^\]]*\]|[A-Za-z_@#][\w$#]*))*|'[^']*'|[(),*;]|\S",
            RegexOptions.CultureInvariant | RegexOptions.Compiled);

        private static readonly HashSet<string> ClausulaCorte = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "WHERE","GROUP","ORDER","HAVING","UNION","EXCEPT","INTERSECT","ON","OPTION",
            "PIVOT","UNPIVOT","FOR","SELECT"
        };

        /// <summary>
        /// Valida un SQL candidato contra el allowlist. cap = tope de filas que se fuerza como TOP (@cap).
        /// columnasSensibles: identificadores que jamas deben aparecer (p.ej. v_Password); opcional.
        /// </summary>
        public NlqValidacionResultado Validar(
            string sqlCandidato,
            ISet<string> allowlist,
            int cap = 5000,
            ISet<string> columnasSensibles = null)
        {
            if (string.IsNullOrWhiteSpace(sqlCandidato))
                return NlqValidacionResultado.Rechazo("SQL vacio.");

            // 1) Neutralizar trucos unicode: fold de compatibilidad (fullwidth->ascii), quitar formato
            //    (zero-width, BOM, soft-hyphen) y controles (excepto \n\r, que el escaner usa para cortar
            //    comentarios de linea).
            string uni = NormalizarUnicode(sqlCandidato);

            // 2) Escaneo estructural: quita comentarios (con anidamiento), colapsa espacios, valida cierres,
            //    y produce dos vistas: 'norm' (ejecutable, literales intactos) y 'scrub' (literales en '').
            if (!Escanear(uni, out string norm, out string scrub, out string comentarios, out string errScan))
                return NlqValidacionResultado.Rechazo(errScan);

            scrub = scrub.Trim();
            norm = norm.Trim();
            if (scrub.Length == 0)
                return NlqValidacionResultado.Rechazo("El SQL no contiene sentencia ejecutable (solo comentarios).");

            // 3) Palabras/prefijos peligrosos: se buscan en el CODIGO y en los COMENTARIOS (no en literales,
            //    que son datos). Asi se rechaza tambien el DML "oculto en comentario".
            string objetivoKw = scrub + " " + comentarios;
            var mDanger = ReDanger.Match(objetivoKw);
            if (mDanger.Success)
                return NlqValidacionResultado.Rechazo($"Palabra no permitida en el SQL: '{mDanger.Value.ToUpperInvariant()}'. Solo se permiten consultas de lectura.");
            var mPrefix = RePrefix.Match(objetivoKw);
            if (mPrefix.Success)
                return NlqValidacionResultado.Rechazo($"Procedimiento no permitido: '{mPrefix.Value}'.");

            // 4) Un solo statement: se descarta el ';' final; cualquier ';' interior = multiples sentencias.
            norm = QuitarPuntoyComaFinal(norm);
            scrub = QuitarPuntoyComaFinal(scrub);
            if (scrub.IndexOf(';') >= 0)
                return NlqValidacionResultado.Rechazo("Se permite una sola sentencia (se detecto un separador ';').");

            // 5) Debe empezar por SELECT o WITH.
            if (!ReStart.IsMatch(scrub))
                return NlqValidacionResultado.Rechazo("La consulta debe iniciar con SELECT o WITH.");

            // 6) Columnas sensibles (opcional; doble candado con el DENY del login sobre v_Password).
            if (columnasSensibles != null && columnasSensibles.Count > 0)
            {
                foreach (var col in columnasSensibles)
                {
                    if (string.IsNullOrWhiteSpace(col)) continue;
                    if (Regex.IsMatch(scrub, $@"\b{Regex.Escape(col)}\b", RegexOptions.IgnoreCase))
                        return NlqValidacionResultado.Rechazo($"La consulta referencia una columna sensible no permitida: '{col}'.");
                }
            }

            // 7) Allowlist de objetos. Los nombres de CTE se auto-permiten.
            var ctes = ExtraerCtes(scrub);
            var objetos = ExtraerObjetos(scrub);
            var expandido = ExpandirAllowlist(allowlist);
            var referenciados = new List<string>();
            foreach (var obj in objetos)
            {
                string norml = NormalizarObjeto(obj);
                if (ctes.Contains(norml)) continue;                 // referencia a un CTE local
                referenciados.Add(norml);
                if (!CoincideAllowlist(norml, expandido))
                    return NlqValidacionResultado.Rechazo($"Objeto no permitido: '{obj}'. Solo se pueden consultar los objetos del catalogo activo.");
            }

            // 8) Forzar TOP (@cap) en el SELECT principal (nivel 0) si falta.
            if (!InyectarTop(norm, cap, out string conTop, out bool selectHallado))
            {
                if (!selectHallado)
                    return NlqValidacionResultado.Rechazo("No se encontro un SELECT principal (la consulta debe proyectar filas).");
            }

            return new NlqValidacionResultado
            {
                Ok = true,
                Motivo = null,
                SqlNormalizado = conTop,
                ObjetosReferenciados = referenciados
            };
        }

        // ---------------- helpers ----------------

        private static string NormalizarUnicode(string s)
        {
            string nf;
            try { nf = s.Normalize(NormalizationForm.FormKC); }
            catch { nf = s; }
            var sb = new StringBuilder(nf.Length);
            foreach (char ch in nf)
            {
                var cat = CharUnicodeInfo.GetUnicodeCategory(ch);
                if (cat == UnicodeCategory.Format) continue;                 // zero-width, BOM, soft-hyphen...
                if (ch == '\n' || ch == '\r') { sb.Append(ch); continue; }   // conservar: cortan comentarios --
                if (char.IsControl(ch)) { sb.Append(' '); continue; }        // \t \v \f -> espacio
                sb.Append(ch);
            }
            return sb.ToString();
        }

        /// <summary>
        /// Escaner de un solo paso. Produce:
        ///   norm  = SQL sin comentarios, con literales de cadena INTACTOS, espacios colapsados (ejecutable).
        ///   scrub = igual pero con los literales de cadena reemplazados por '' (para chequeos de codigo).
        ///   comentarios = texto de los comentarios (para el chequeo de palabras peligrosas).
        /// Valida cierres de cadena, comentario de bloque (anidado) e identificador [].
        /// </summary>
        private static bool Escanear(string s, out string norm, out string scrub, out string comentarios, out string error)
        {
            var sbNorm = new StringBuilder(s.Length);
            var sbScrub = new StringBuilder(s.Length);
            var sbCom = new StringBuilder();
            error = null;
            int i = 0, n = s.Length;

            while (i < n)
            {
                char c = s[i];

                // Comentario de linea --
                if (c == '-' && i + 1 < n && s[i + 1] == '-')
                {
                    i += 2;
                    while (i < n && s[i] != '\n' && s[i] != '\r') { sbCom.Append(s[i]); i++; }
                    sbNorm.Append(' '); sbScrub.Append(' '); sbCom.Append(' ');
                    continue;
                }

                // Comentario de bloque /* ... */ (con anidamiento de SQL Server)
                if (c == '/' && i + 1 < n && s[i + 1] == '*')
                {
                    int depth = 1; i += 2;
                    while (i < n && depth > 0)
                    {
                        if (s[i] == '/' && i + 1 < n && s[i + 1] == '*') { depth++; sbCom.Append("/*"); i += 2; continue; }
                        if (s[i] == '*' && i + 1 < n && s[i + 1] == '/') { depth--; i += 2; if (depth > 0) sbCom.Append("*/"); continue; }
                        sbCom.Append(s[i]); i++;
                    }
                    if (depth > 0) { norm = scrub = comentarios = null; error = "Comentario de bloque sin cerrar."; return false; }
                    sbNorm.Append(' '); sbScrub.Append(' '); sbCom.Append(' ');
                    continue;
                }

                // Literal de cadena '...'
                if (c == '\'')
                {
                    sbNorm.Append('\'');
                    i++;
                    bool cerrado = false;
                    while (i < n)
                    {
                        if (s[i] == '\'')
                        {
                            if (i + 1 < n && s[i + 1] == '\'') { sbNorm.Append("''"); i += 2; continue; } // '' escapado
                            sbNorm.Append('\''); i++; cerrado = true; break;
                        }
                        sbNorm.Append(s[i]); i++;
                    }
                    if (!cerrado) { norm = scrub = comentarios = null; error = "Literal de cadena sin cerrar."; return false; }
                    sbScrub.Append("''");
                    continue;
                }

                // Identificador entre corchetes [ ... ] (]] escapado)
                if (c == '[')
                {
                    sbNorm.Append('['); sbScrub.Append('[');
                    i++;
                    bool cerrado = false;
                    while (i < n)
                    {
                        if (s[i] == ']')
                        {
                            if (i + 1 < n && s[i + 1] == ']') { sbNorm.Append("]]"); sbScrub.Append("]]"); i += 2; continue; }
                            sbNorm.Append(']'); sbScrub.Append(']'); i++; cerrado = true; break;
                        }
                        sbNorm.Append(s[i]); sbScrub.Append(s[i]); i++;
                    }
                    if (!cerrado) { norm = scrub = comentarios = null; error = "Identificador [] sin cerrar."; return false; }
                    continue;
                }

                if (char.IsWhiteSpace(c)) { sbNorm.Append(' '); sbScrub.Append(' '); i++; continue; }

                sbNorm.Append(c); sbScrub.Append(c); i++;
            }

            norm = ColapsarEspacios(sbNorm.ToString());
            scrub = ColapsarEspacios(sbScrub.ToString());
            comentarios = sbCom.ToString();
            return true;
        }

        private static string ColapsarEspacios(string s) => Regex.Replace(s, @"\s+", " ").Trim();

        private static string QuitarPuntoyComaFinal(string s)
        {
            s = s.TrimEnd();
            while (s.EndsWith(";")) s = s.Substring(0, s.Length - 1).TrimEnd();
            return s;
        }

        private static HashSet<string> ExtraerCtes(string scrub)
        {
            var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (Match m in ReCte.Matches(scrub))
                set.Add(NormalizarObjeto(m.Groups[1].Value));
            return set;
        }

        /// <summary>Extrae objetos referenciados tras FROM/JOIN/APPLY y en listas de FROM separadas por coma.</summary>
        private static List<string> ExtraerObjetos(string scrub)
        {
            var objetos = new List<string>();
            var tokens = ReToken.Matches(scrub);
            int depth = 0;
            bool inFrom = false;
            int fromDepth = 0;
            bool expect = false;

            foreach (Match t in tokens)
            {
                string tok = t.Value;
                if (tok == "(") { depth++; if (expect) expect = false; continue; }
                if (tok == ")") { depth--; continue; }

                if (tok == ",")
                {
                    if (inFrom && depth == fromDepth) expect = true;
                    continue;
                }

                string up = tok.ToUpperInvariant();

                if (up == "FROM") { inFrom = true; fromDepth = depth; expect = true; continue; }
                if (up == "JOIN" || up == "APPLY") { expect = true; continue; }

                if (ClausulaCorte.Contains(up)) { inFrom = false; expect = false; continue; }

                if (expect)
                {
                    expect = false;
                    if (EsIdentificador(tok)) objetos.Add(tok);
                }
            }
            return objetos;
        }

        private static bool EsIdentificador(string tok)
        {
            if (string.IsNullOrEmpty(tok)) return false;
            char c0 = tok[0];
            return char.IsLetter(c0) || c0 == '_' || c0 == '[' || c0 == '@' || c0 == '#';
        }

        private static string NormalizarObjeto(string obj)
            => obj.Replace("[", "").Replace("]", "").Replace("\"", "").Trim().ToLowerInvariant();

        /// <summary>Expande el allowlist a formas normalizadas: nombre completo + ultimos dos segmentos (schema.objeto).</summary>
        private static HashSet<string> ExpandirAllowlist(ISet<string> allowlist)
        {
            var set = new HashSet<string>(StringComparer.Ordinal);
            if (allowlist == null) return set;
            foreach (var raw in allowlist)
            {
                if (string.IsNullOrWhiteSpace(raw)) continue;
                string full = NormalizarObjeto(raw);
                set.Add(full);
                var parts = full.Split('.');
                if (parts.Length >= 2) set.Add(parts[parts.Length - 2] + "." + parts[parts.Length - 1]);
            }
            return set;
        }

        private static bool CoincideAllowlist(string objNorm, HashSet<string> expandido)
        {
            if (expandido.Contains(objNorm)) return true;
            var parts = objNorm.Split('.');
            if (parts.Length >= 2 && expandido.Contains(parts[parts.Length - 2] + "." + parts[parts.Length - 1])) return true;
            return false;
        }

        /// <summary>
        /// Inserta TOP (@cap) tras el primer SELECT a nivel de parentesis 0 (el SELECT principal),
        /// saltando literales y corchetes. Devuelve false solo si no hay SELECT principal.
        /// </summary>
        private static bool InyectarTop(string norm, int cap, out string result, out bool selectHallado)
        {
            result = norm;
            selectHallado = false;

            int depth = 0, i = 0, n = norm.Length, selEnd = -1;
            bool inStr = false, inBr = false;
            while (i < n)
            {
                char c = norm[i];
                if (inStr)
                {
                    if (c == '\'') { if (i + 1 < n && norm[i + 1] == '\'') { i += 2; continue; } inStr = false; }
                    i++; continue;
                }
                if (inBr)
                {
                    if (c == ']') { if (i + 1 < n && norm[i + 1] == ']') { i += 2; continue; } inBr = false; }
                    i++; continue;
                }
                if (c == '\'') { inStr = true; i++; continue; }
                if (c == '[') { inBr = true; i++; continue; }
                if (c == '(') { depth++; i++; continue; }
                if (c == ')') { depth--; i++; continue; }
                if (char.IsLetter(c) || c == '_')
                {
                    int s = i;
                    while (i < n && (char.IsLetterOrDigit(norm[i]) || norm[i] == '_')) i++;
                    if (depth == 0 && string.Compare(norm, s, "SELECT", 0, 6, StringComparison.OrdinalIgnoreCase) == 0
                        && (i - s) == 6)
                    { selEnd = i; break; }
                    continue;
                }
                i++;
            }

            if (selEnd < 0) return false;   // no hay SELECT de nivel 0
            selectHallado = true;

            // Punto de insercion: tras SELECT (o tras un DISTINCT/ALL inmediato). Si ya hay TOP, no tocar.
            int insertAt = selEnd;
            string w1 = SiguientePalabra(norm, selEnd, out int w1End);
            if (w1.Equals("DISTINCT", StringComparison.OrdinalIgnoreCase) || w1.Equals("ALL", StringComparison.OrdinalIgnoreCase))
            {
                insertAt = w1End;
                string w2 = SiguientePalabra(norm, w1End, out _);
                if (w2.Equals("TOP", StringComparison.OrdinalIgnoreCase)) { result = norm; return true; }
            }
            else if (w1.Equals("TOP", StringComparison.OrdinalIgnoreCase))
            {
                result = norm; return true;
            }

            result = norm.Substring(0, insertAt) + " TOP (@cap)" + norm.Substring(insertAt);
            return true;
        }

        /// <summary>Lee la siguiente palabra (letras/digitos/_) desde 'from', saltando espacios. "" si el siguiente no-espacio no es palabra.</summary>
        private static string SiguientePalabra(string s, int from, out int end)
        {
            int i = from, n = s.Length;
            while (i < n && char.IsWhiteSpace(s[i])) i++;
            int st = i;
            while (i < n && (char.IsLetterOrDigit(s[i]) || s[i] == '_')) i++;
            end = i;
            return i > st ? s.Substring(st, i - st) : "";
        }
    }
}
