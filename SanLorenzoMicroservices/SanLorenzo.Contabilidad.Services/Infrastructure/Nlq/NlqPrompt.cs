using System.Text;
using Contabilidad.Models;

namespace Contabilidad.Infrastructure.Nlq
{
    /// <summary>
    /// Construye los prompts (system + user) y expone los JSON Schema de structured output.
    /// La pregunta del usuario es TEXTO NO CONFIABLE: va SOLO como contenido del prompt, JAMAS concatenada a SQL.
    /// </summary>
    public static class NlqPrompt
    {
        // Structured output del generador (Opus): {sql, tablasUsadas[], confianza, chartSugerido}
        public const string SchemaSql =
            "{\"type\":\"object\",\"properties\":{" +
            "\"sql\":{\"type\":\"string\"}," +
            "\"tablasUsadas\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}}," +
            "\"confianza\":{\"type\":\"number\"}," +
            "\"chartSugerido\":{\"type\":\"string\"}" +
            "},\"required\":[\"sql\",\"tablasUsadas\",\"confianza\",\"chartSugerido\"],\"additionalProperties\":false}";

        // Structured output del retriever (Haiku): {objetos[], intencion, entidades}
        public const string SchemaRetrieval =
            "{\"type\":\"object\",\"properties\":{" +
            "\"objetos\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}}," +
            "\"intencion\":{\"type\":\"string\"}," +
            "\"entidades\":{\"type\":\"object\"}" +
            "},\"required\":[\"objetos\",\"intencion\",\"entidades\"]}";

        public static string SystemGeneracion()
        {
            return
                "Eres un experto en SQL Server 2012. Traduces una pregunta de negocio en espanol a UNA sola " +
                "consulta SELECT de SOLO LECTURA.\n" +
                "REGLAS DURAS (obligatorias):\n" +
                "1. Devuelve UN unico SELECT (o WITH...SELECT). Nada de INSERT/UPDATE/DELETE/MERGE/DDL/EXEC/;/GO.\n" +
                "2. Usa EXCLUSIVAMENTE los objetos que se te entregan abajo, con su nombre de 2 partes (schema.objeto), " +
                "p.ej. conta.v_nlq_ventas. No inventes tablas ni columnas.\n" +
                "3. Para ventas, caja y rentabilidad usa SIEMPRE las vistas conta.v_nlq_* provistas (ya traen las reglas de negocio adentro).\n" +
                "4. Nunca SELECT *; lista columnas explicitas y con alias legibles.\n" +
                "5. Limita el resultado (TOP N razonable). Aplica las REGLAS DE NEGOCIO listadas.\n" +
                "6. SQL Server 2012: sin OPENJSON/STRING_SPLIT/TRIM/CONCAT_WS/EOMONTH si no es imprescindible; usa sintaxis 2012.\n" +
                "Responde SOLO el JSON del esquema pedido: {sql, tablasUsadas[], confianza (0..1), chartSugerido (bar|line|pie|scatter|kpi|tabla)}.";
        }

        public static string SystemRetrieval()
        {
            return
                "Eres un selector de tablas. Dada una pregunta de negocio y un catalogo de objetos (nombre + descripcion), " +
                "eliges SOLO los objetos del catalogo relevantes para responderla. No inventes objetos fuera del catalogo. " +
                "Responde SOLO el JSON: {objetos: string[] (nombres exactos del catalogo), intencion: string, entidades: object}.";
        }

        /// <summary>User prompt del retriever: catalogo (nombre + descripcion) + pregunta.</summary>
        public static string UsuarioRetrieval(IEnumerable<NlqTablaListaRow> catalogo, string pregunta)
        {
            var sb = new StringBuilder();
            sb.AppendLine("CATALOGO (objetos activos):");
            foreach (var t in catalogo)
                sb.AppendLine($"- {t.v_Schema}.{t.v_Objeto} [{t.v_Dominio}]: {t.v_Descripcion}");
            sb.AppendLine();
            sb.AppendLine("PREGUNTA:");
            sb.AppendLine(pregunta);
            return sb.ToString();
        }

        /// <summary>User prompt del generador: sintesis del catalogo (tablas + columnas + reglas) + pregunta.</summary>
        public static string UsuarioGeneracion(NlqCatalogoDetalle detalle, string pregunta, string intencion)
        {
            var sb = new StringBuilder();
            sb.AppendLine("ESQUEMA DISPONIBLE (usa SOLO estos objetos y columnas):");
            foreach (var t in detalle.Tablas)
            {
                string tipo = t.v_TipoObjeto == "V" ? "VISTA" : "TABLA";
                sb.AppendLine($"\n{tipo} {t.v_Schema}.{t.v_Objeto} [{t.v_Dominio}] - {t.v_Descripcion}");
                foreach (var c in detalle.Columnas.Where(c => c.i_IdNlqTabla == t.i_IdNlqTabla))
                {
                    var flags = new List<string>();
                    if (c.b_EsPk) flags.Add("PK");
                    if (c.b_EsFk) flags.Add("FK->" + c.v_FkObjeto);
                    string extra = flags.Count > 0 ? " (" + string.Join(", ", flags) + ")" : "";
                    sb.AppendLine($"    - {c.v_Columna} {c.v_TipoDato}{extra}: {c.v_Descripcion}");
                }
            }

            if (detalle.Reglas.Count > 0)
            {
                sb.AppendLine("\nREGLAS DE NEGOCIO (aplicalas):");
                foreach (var r in detalle.Reglas.OrderBy(r => r.i_Orden))
                {
                    string amb = string.IsNullOrWhiteSpace(r.v_Objeto) ? r.v_Dominio : r.v_Objeto;
                    sb.AppendLine($"- [{amb}] {r.v_Regla}");
                }
            }

            if (!string.IsNullOrWhiteSpace(intencion))
                sb.AppendLine($"\nINTENCION DETECTADA: {intencion}");

            sb.AppendLine("\nPREGUNTA:");
            sb.AppendLine(pregunta);
            return sb.ToString();
        }

        /// <summary>Anexa el error de un intento previo para la auto-correccion (SOLO el error, jamas filas de datos).</summary>
        public static string ConError(string userPromptBase, string sqlPrevio, string errorSql)
        {
            var sb = new StringBuilder(userPromptBase);
            sb.AppendLine("\n\n--- CORRECCION ---");
            sb.AppendLine("El SQL anterior fallo. Corrigelo (mismo formato JSON de salida).");
            sb.AppendLine("SQL anterior:");
            sb.AppendLine(sqlPrevio);
            sb.AppendLine("Error:");
            sb.AppendLine(errorSql);
            return sb.ToString();
        }
    }
}
