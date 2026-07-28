using System.Collections.Generic;
using Contabilidad.Infrastructure.Nlq;
using Xunit;

namespace Contabilidad.Tests
{
    /// <summary>
    /// GATE F4 (§4.7 del PLAN_NLQ_CONTA): suite adversarial del validador.
    /// TODAS las cadenas maliciosas deben ser rechazadas; un SELECT / WITH...SELECT legitimo
    /// contra objetos del allowlist debe pasar (y traer TOP (@cap) forzado).
    /// </summary>
    public class NlqValidatorTests
    {
        private static readonly NlqValidator V = new NlqValidator();

        // Allowlist del catalogo activo v1 (ventas + caja + una tabla cruda 3-partes numerica bracketed).
        private static readonly ISet<string> Allow = new HashSet<string>
        {
            "conta.v_nlq_ventas",
            "conta.v_nlq_caja",
            "20505310072.dbo.venta"
        };

        public static IEnumerable<object[]> Maliciosas() => new List<object[]>
        {
            // --- statements apilados ---
            new object[] { "stacked-drop",        "SELECT 1; DROP TABLE conta.v_nlq_ventas" },
            new object[] { "stacked-doble-punto",  "SELECT Serie FROM conta.v_nlq_ventas;;SELECT 2" },
            // --- DML/DDL oculto en comentario ---
            new object[] { "dml-en-bloque",        "SELECT 1 /* DROP TABLE conta.v_nlq_ventas */ FROM conta.v_nlq_ventas" },
            new object[] { "dml-en-linea",         "SELECT 1 --DROP TABLE conta.v_nlq_ventas\nFROM conta.v_nlq_ventas" },
            // --- SELECT ... INTO ---
            new object[] { "select-into",          "SELECT Serie INTO dumped FROM conta.v_nlq_ventas" },
            // --- WITH x AS(...) INSERT/UPDATE ---
            new object[] { "with-insert",          "WITH x AS (SELECT 1 AS a) INSERT INTO conta.v_nlq_ventas SELECT * FROM x" },
            new object[] { "with-update",          "WITH x AS (SELECT 1) UPDATE conta.v_nlq_ventas SET Total=1" },
            new object[] { "with-delete",          "WITH x AS (SELECT 1) DELETE FROM conta.v_nlq_ventas" },
            new object[] { "with-merge",           "WITH x AS (SELECT 1 AS a) MERGE conta.v_nlq_ventas AS t USING x AS s ON t.a=s.a WHEN MATCHED THEN DELETE" },
            // --- EXEC / sp_ / xp_cmdshell ---
            new object[] { "exec-directo",         "EXEC sp_who" },
            new object[] { "exec-sp-executesql",   "SELECT 1 FROM conta.v_nlq_ventas; EXEC sp_executesql N'DROP TABLE conta.v_nlq_ventas'" },
            new object[] { "xp-cmdshell",          "SELECT 1 FROM conta.v_nlq_ventas WHERE 1=1; EXEC xp_cmdshell 'dir'" },
            new object[] { "sp-prefijo",           "SELECT * FROM conta.v_nlq_ventas WHERE a IN (SELECT sp_help())" },
            // --- GRANT / REVOKE / DENY ---
            new object[] { "grant",                "GRANT SELECT ON conta.v_nlq_ventas TO public" },
            new object[] { "revoke",               "REVOKE SELECT ON conta.v_nlq_ventas FROM public" },
            // --- TRUNCATE / ALTER / CREATE ---
            new object[] { "truncate",             "TRUNCATE TABLE conta.v_nlq_ventas" },
            new object[] { "alter",                "ALTER TABLE conta.v_nlq_ventas ADD col INT" },
            new object[] { "create",               "CREATE TABLE t (a INT)" },
            // --- objeto fuera del allowlist / schema confusion / temp ---
            new object[] { "objeto-fuera",         "SELECT v_Password FROM dbo.systemuser" },
            new object[] { "schema-confusion",     "SELECT Serie FROM otras.v_nlq_ventas" },
            new object[] { "temp-table",           "SELECT * FROM #tmp" },
            new object[] { "comma-join-oculto",    "SELECT a.Serie FROM conta.v_nlq_ventas a, dbo.systemuser b" },
            // --- WAITFOR (DoS) ---
            new object[] { "waitfor-delay",        "SELECT 1 FROM conta.v_nlq_ventas; WAITFOR DELAY '00:00:10'" },
            new object[] { "waitfor-time",         "WAITFOR TIME '23:59'" },
            // --- separador de batch GO ---
            new object[] { "batch-go",             "SELECT 1 FROM conta.v_nlq_ventas\nGO\nSELECT 2 FROM conta.v_nlq_ventas" },
            // --- trucos de whitespace / unicode alrededor de keywords ---
            new object[] { "zero-width-drop",      "SELECT 1; DR​OP TABLE conta.v_nlq_ventas" },
            new object[] { "fullwidth-drop",       "SELECT 1 FROM conta.v_nlq_ventas; ＤＲＯＰ TABLE conta.v_nlq_ventas" },
            new object[] { "tab-newline-drop",     "SELECT 1;\tDROP\nTABLE conta.v_nlq_ventas" },
            new object[] { "comment-split-kw",     "SEL/**/ECT 1 FROM conta.v_nlq_ventas" },
            // --- OPENROWSET / OPENQUERY ---
            new object[] { "openrowset",           "SELECT * FROM OPENROWSET('SQLNCLI','Server=x;','SELECT 1')" },
            // --- no arranca con SELECT/WITH ---
            new object[] { "no-select",            "TABLE conta.v_nlq_ventas" },
        };

        [Theory]
        [MemberData(nameof(Maliciosas))]
        public void Rechaza_cadenas_maliciosas(string etiqueta, string sql)
        {
            var r = V.Validar(sql, Allow, cap: 5000);
            Assert.False(r.Ok, $"[{etiqueta}] deberia ser RECHAZADA pero paso. SqlNormalizado='{r.SqlNormalizado}'");
            Assert.False(string.IsNullOrWhiteSpace(r.Motivo), $"[{etiqueta}] debe traer un motivo de rechazo.");
        }

        [Fact]
        public void Rechaza_union_a_columna_sensible()
        {
            var sens = new HashSet<string> { "v_Password" };
            var sql = "SELECT Serie FROM conta.v_nlq_ventas UNION SELECT v_Password FROM conta.v_nlq_ventas";
            var r = V.Validar(sql, Allow, cap: 5000, columnasSensibles: sens);
            Assert.False(r.Ok);
            Assert.Contains("sensible", r.Motivo);
        }

        // ---------- Legitimas: deben PASAR ----------

        [Fact]
        public void Acepta_select_simple_y_fuerza_top()
        {
            var sql = "SELECT Serie, SUM(Total) AS Total FROM conta.v_nlq_ventas GROUP BY Serie";
            var r = V.Validar(sql, Allow, cap: 5000);
            Assert.True(r.Ok, r.Motivo);
            Assert.Contains("TOP (@cap)", r.SqlNormalizado);
            Assert.StartsWith("SELECT TOP (@cap)", r.SqlNormalizado);
        }

        [Fact]
        public void Acepta_cte_with_select()
        {
            var sql = "WITH v AS (SELECT Serie, Total FROM conta.v_nlq_caja) SELECT Serie, SUM(Total) AS Total FROM v GROUP BY Serie";
            var r = V.Validar(sql, Allow, cap: 5000);
            Assert.True(r.Ok, r.Motivo);
            Assert.Contains("TOP (@cap)", r.SqlNormalizado);
        }

        [Fact]
        public void Acepta_distinct_y_pone_top_despues_del_distinct()
        {
            var sql = "SELECT DISTINCT Unidad FROM conta.v_nlq_ventas";
            var r = V.Validar(sql, Allow, cap: 5000);
            Assert.True(r.Ok, r.Motivo);
            int iDist = r.SqlNormalizado.ToUpperInvariant().IndexOf("DISTINCT");
            int iTop = r.SqlNormalizado.IndexOf("TOP (@cap)");
            Assert.True(iDist >= 0 && iTop > iDist, $"TOP debe ir tras DISTINCT: '{r.SqlNormalizado}'");
        }

        [Fact]
        public void No_duplica_top_si_ya_existe()
        {
            var sql = "SELECT TOP 100 Serie FROM conta.v_nlq_ventas ORDER BY Serie";
            var r = V.Validar(sql, Allow, cap: 5000);
            Assert.True(r.Ok, r.Motivo);
            Assert.DoesNotContain("@cap", r.SqlNormalizado);
        }

        [Fact]
        public void Acepta_tabla_cruda_bracketed_3_partes()
        {
            var sql = "SELECT d_FechaEmision FROM [20505310072].dbo.venta";
            var r = V.Validar(sql, Allow, cap: 5000);
            Assert.True(r.Ok, r.Motivo);
        }

        [Fact]
        public void Columna_con_substring_de_keyword_no_falsea_rechazo()
        {
            // i_InsertaIdUsuario contiene "Insert" pero NO es la palabra INSERT (sin frontera).
            var sql = "SELECT i_InsertaIdUsuario, Fecha FROM conta.v_nlq_ventas WHERE i_Eliminado = 0";
            var r = V.Validar(sql, Allow, cap: 5000);
            Assert.True(r.Ok, r.Motivo);
        }

        [Fact]
        public void Permite_punto_y_coma_final()
        {
            var sql = "SELECT Serie FROM conta.v_nlq_ventas;";
            var r = V.Validar(sql, Allow, cap: 5000);
            Assert.True(r.Ok, r.Motivo);
            Assert.DoesNotContain(";", r.SqlNormalizado);
        }
    }
}
