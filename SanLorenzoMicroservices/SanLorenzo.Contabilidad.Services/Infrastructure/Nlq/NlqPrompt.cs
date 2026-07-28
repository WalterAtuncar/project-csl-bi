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
                "2. Usa EXCLUSIVAMENTE los objetos que se te entregan abajo. No inventes tablas ni columnas.\n" +
                "3. Los objetos pueden ser VISTAS (financiero: ventas/caja/rentabilidad, ya PRE-UNIDAS con sus reglas " +
                "adentro; usalas directo) o TABLAS CRUDAS (clinico: service, diagnosticrepository, etc., relacionadas por FK). " +
                "Para las TABLAS CRUDAS compone los JOINs entre los objetos provistos siguiendo el grafo de FK " +
                "(cada columna trae 'FK->ref' en el bloque de esquema) y usa ALIAS de tabla.\n" +
                "4. NAMING (critico, cross-DB): usa el nombre COMPLETO de 3 partes de cada objeto EXACTAMENTE como aparece " +
                "en el bloque de esquema: [Base].[Schema].[Objeto], p.ej. [SigesoftDesarrollo_2].[dbo].[service] o " +
                "[20505310072].[conta].[v_nlq_ventas]. NUNCA uses 2 partes. El ejecutor corre en la BD principal pero con " +
                "3 partes resuelve ambas bases de datos.\n" +
                "5. Nunca SELECT *; lista columnas explicitas y con alias legibles.\n" +
                "6. Limita el resultado (TOP N razonable). SQL Server 2012: sin OPENJSON/STRING_SPLIT/TRIM/CONCAT_WS/EOMONTH " +
                "si no es imprescindible; usa sintaxis 2012.\n" +
                "7. Aplica SIEMPRE las REGLAS DE NEGOCIO que se te dan (financieras y clinicas: i_IsDeleted=0, atencion " +
                "culminada i_ServiceStatusId=3, dx valido i_FinalQualificationId IN (2,3), medico real = " +
                "servicecomponent.i_MedicoTratanteId, morbilidad DISTINCT (v_ServiceId,v_DiseasesId), join a " +
                "servicecomponent acotado por d_InsertDate).\n" +
                "7a. FECHA/PERIODO clinico: SIEMPRE se filtra por service.d_ServiceDate. Si la tabla base (p.ej. " +
                "diagnosticrepository, receta) no la tiene, UNE a service y filtra por s.d_ServiceDate. NUNCA uses " +
                "d_InsertDate como periodo (d_InsertDate solo sirve para acotar el join a servicecomponent por rendimiento).\n" +
                "7b. NOMBRES LEGIBLES, no IDs internos: si una dimension tiene su NOMBRE/descripcion en una tabla o columna " +
                "del esquema, UNELA y muestra el NOMBRE. Ej.: diagnostico -> une diseases (v_Name) y cie10 (codigo + descripcion); " +
                "consultorio/etiqueta -> systemparameter.v_Value1; persona/medico -> person (nombres); empresa -> organization.v_Name. " +
                "NUNCA devuelvas como resultado final un ID interno tipo 'N009-...' cuando existe su nombre.\n" +
                "8. Si se te entregan VARIAS vistas y la pregunta relaciona dos universos (p.ej. facturado vs cobrado), " +
                "devuelve UN solo SELECT con AMBAS metricas lado a lado usando subconsultas escalares. " +
                "OJO: ventas es NETO facturado y caja es BRUTO cobrado (universos distintos, no directamente comparables); " +
                "aun asi devuelve AMBOS numeros. Si no puedes responder con exactitud con los objetos dados, devuelve el " +
                "resultado util mas cercano y usa una confianza moderada (no artificialmente alta).\n" +
                "Responde SOLO el JSON del esquema pedido: {sql, tablasUsadas[], confianza (0..1), chartSugerido (bar|line|pie|scatter|kpi|tabla)}.";
        }

        public static string SystemRetrieval()
        {
            return
                "Eres un selector de tablas. Dada una pregunta de negocio y un catalogo de objetos con su ESQUELETO " +
                "relacional (nombre de 3 partes + PK + FK), eliges SOLO los objetos del catalogo relevantes para responderla. " +
                "No inventes objetos fuera del catalogo.\n" +
                "Si la pregunta necesita datos que viven en tablas RELACIONADAS, incluye TODAS las tablas del JOIN " +
                "necesario SIGUIENDO EL GRAFO DE FK (cada objeto lista sus FK como 'col->ref'); no devuelvas una sola " +
                "tabla si para responder hay que unir varias. En particular: (a) SIEMPRE incluye la tabla que aporta el " +
                "NOMBRE de lo que se pide (diagnosticos -> diseases + cie10; etiquetas/consultorio -> systemparameter; " +
                "personas/medicos -> person; empresas -> organization) porque la respuesta debe traer NOMBRES, no IDs " +
                "internos; y (b) incluye service cuando haya periodo/fecha (la fecha clinica vive en service.d_ServiceDate).\n" +
                "Si la pregunta involucra MAS DE UN dominio o universo (p.ej. 'facturado/ventas' y 'cobrado/caja'), incluye " +
                "TODOS los objetos relevantes; ante la duda entre incluir u omitir un objeto relacionado, incluyelo. " +
                "Responde SOLO el JSON: {objetos: string[] (nombres exactos del catalogo), intencion: string, entidades: object}.";
        }

        /// <summary>User prompt del retriever: esqueleto relacional (nombre 3 partes + PK + FK) + pregunta.</summary>
        public static string UsuarioRetrieval(IEnumerable<NlqEsqueletoRow> esqueleto, string pregunta)
        {
            var sb = new StringBuilder();
            sb.AppendLine("CATALOGO (objetos activos con su esqueleto relacional):");
            foreach (var t in esqueleto)
            {
                string linea = $"- {t.v_Base}.{t.v_Schema}.{t.v_Objeto} [{t.v_Dominio}]: {t.v_Descripcion} | PK: {t.PKs}";
                if (!string.IsNullOrWhiteSpace(t.FKs)) linea += $" | FK: {t.FKs}";
                sb.AppendLine(linea);
            }
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
                // Encabezado con nombre COMPLETO de 3 partes (cross-DB): [Base].[Schema].[Objeto].
                sb.AppendLine($"\n{tipo} [{t.v_Base}].[{t.v_Schema}].[{t.v_Objeto}] [{t.v_Dominio}] - {t.v_Descripcion}");
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
