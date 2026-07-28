using System;
using System.Collections.Generic;
using Contabilidad.Infrastructure.Nlq;
using Contabilidad.Models;
using Xunit;

namespace Contabilidad.Tests
{
    /// <summary>Piezas del pipeline testeables SIN red/BD: Formato, cache semantico, fingerprint, chart.</summary>
    public class NlqPipelineTests
    {
        // ---------- Inferencia de Formato (NlqExecutor) ----------
        [Theory]
        [InlineData("Total", typeof(decimal), "money")]
        [InlineData("IngresosNetos", typeof(decimal), "money")]
        [InlineData("Gastos", typeof(double), "money")]
        [InlineData("Resultado", typeof(decimal), "money")]
        [InlineData("SaldoBanco", typeof(decimal), "money")]
        [InlineData("MargenBruto", typeof(decimal), "pct")]
        [InlineData("PorcCobrado", typeof(decimal), "pct")]
        [InlineData("Fecha", typeof(DateTime), "date")]
        [InlineData("NroDocumentos", typeof(int), "int")]
        [InlineData("Cantidad", typeof(long), "int")]
        [InlineData("Serie", typeof(string), "text")]
        [InlineData("TipoCambio", typeof(decimal), "text")]   // decimal sin nombre de dinero -> text
        public void Infiere_formato_de_columna(string nombre, Type clr, string esperado)
        {
            Assert.Equal(esperado, NlqExecutor.InferirFormato(nombre, clr));
        }

        // ---------- Normalizacion del cache semantico ----------
        [Fact]
        public void Cache_enero_y_febrero_no_colisionan()
        {
            string a = NlqCache.NormalizarPlantilla("ventas de enero 2026");
            string b = NlqCache.NormalizarPlantilla("ventas de febrero 2026");
            Assert.NotEqual(a, b);
            Assert.NotEqual(NlqCache.Sha256Hex(a), NlqCache.Sha256Hex(b));
        }

        [Fact]
        public void Cache_normaliza_tildes_mayusculas_y_espacios()
        {
            string a = NlqCache.NormalizarPlantilla("Ventas de ENERO 2026");
            string b = NlqCache.NormalizarPlantilla("  ventas   de   enero   2026 ");
            Assert.Equal(a, b);
            Assert.Equal(NlqCache.Sha256Hex(a), NlqCache.Sha256Hex(b));
        }

        [Fact]
        public void Cache_distintos_anios_no_colisionan()
        {
            Assert.NotEqual(
                NlqCache.NormalizarPlantilla("ingresos de marzo 2025"),
                NlqCache.NormalizarPlantilla("ingresos de marzo 2026"));
        }

        [Fact]
        public void Sha256_tiene_64_chars_hex()
        {
            string h = NlqCache.Sha256Hex("hola");
            Assert.Equal(64, h.Length);
            Assert.Matches("^[0-9a-f]{64}$", h);
        }

        // ---------- Fingerprint del esquema ----------
        private static NlqTablaListaRow T(string b, string s, string o)
            => new NlqTablaListaRow { v_Base = b, v_Schema = s, v_Objeto = o };

        [Fact]
        public void Fingerprint_es_estable_e_independiente_del_orden()
        {
            var a = new List<NlqTablaListaRow> { T("20505310072", "conta", "v_nlq_ventas"), T("20505310072", "conta", "v_nlq_caja") };
            var b = new List<NlqTablaListaRow> { T("20505310072", "conta", "v_nlq_caja"), T("20505310072", "conta", "v_nlq_ventas") };
            Assert.Equal(NlqService.CalcularFingerprint(a), NlqService.CalcularFingerprint(b));
        }

        [Fact]
        public void Fingerprint_cambia_al_agregar_objeto()
        {
            var a = new List<NlqTablaListaRow> { T("20505310072", "conta", "v_nlq_ventas") };
            var b = new List<NlqTablaListaRow> { T("20505310072", "conta", "v_nlq_ventas"), T("20505310072", "conta", "v_nlq_caja") };
            Assert.NotEqual(NlqService.CalcularFingerprint(a), NlqService.CalcularFingerprint(b));
        }

        [Fact]
        public void Allowlist_usa_schema_objeto()
        {
            var cat = new List<NlqTablaListaRow> { T("20505310072", "conta", "v_nlq_ventas") };
            var al = NlqService.ConstruirAllowlist(cat);
            Assert.Contains("conta.v_nlq_ventas", al);
        }

        // ---------- Chart determinista ----------
        private static NlqColumnaDto C(string nombre, string fmt) => new NlqColumnaDto { Nombre = nombre, Formato = fmt };
        private static List<List<object>> Filas(int n)
        {
            var f = new List<List<object>>();
            for (int i = 0; i < n; i++) f.Add(new List<object> { i });
            return f;
        }

        [Fact]
        public void Chart_kpi_para_un_solo_valor()
        {
            var cols = new List<NlqColumnaDto> { C("Total", "money") };
            Assert.Equal("kpi", NlqService.InferirChart(cols, Filas(1)));
        }

        [Fact]
        public void Chart_line_para_fecha_mas_numerica()
        {
            var cols = new List<NlqColumnaDto> { C("Fecha", "date"), C("Total", "money") };
            Assert.Equal("line", NlqService.InferirChart(cols, Filas(10)));
        }

        [Fact]
        public void Chart_bar_para_texto_mas_numerica()
        {
            var cols = new List<NlqColumnaDto> { C("Serie", "text"), C("Total", "money") };
            Assert.Equal("bar", NlqService.InferirChart(cols, Filas(6)));
        }

        [Fact]
        public void Chart_scatter_para_dos_numericas()
        {
            var cols = new List<NlqColumnaDto> { C("X", "int"), C("Y", "money") };
            Assert.Equal("scatter", NlqService.InferirChart(cols, Filas(20)));
        }

        [Fact]
        public void Chart_tabla_por_defecto()
        {
            var cols = new List<NlqColumnaDto> { C("A", "text"), C("B", "text"), C("C", "text") };
            Assert.Equal("tabla", NlqService.InferirChart(cols, Filas(5)));
        }
    }
}
