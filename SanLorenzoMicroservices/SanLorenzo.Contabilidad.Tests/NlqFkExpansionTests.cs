using System.Collections.Generic;
using System.Linq;
using Contabilidad.Infrastructure.Nlq;
using Contabilidad.Models;
using Xunit;

namespace Contabilidad.Tests
{
    /// <summary>
    /// FASE C fix: expansion determinista por FK (1 SALTO) tras el retriever.
    /// diagnosticrepository -> +service (fecha) +diseases (nombre); sin recursion; vistas no expanden.
    /// </summary>
    public class NlqFkExpansionTests
    {
        private static NlqEsqueletoRow E(string obj, string dominio, string fks)
            => new NlqEsqueletoRow { v_Base = "SigesoftDesarrollo_2", v_Schema = "dbo", v_Objeto = obj, v_Dominio = dominio, PKs = "id", FKs = fks };

        // A->B->C : cadena para probar que NO hay recursion.
        private static readonly List<NlqEsqueletoRow> Cadena = new()
        {
            E("A", "clinico", "aid->dbo.B.bid"),
            E("B", "clinico", "bid->dbo.C.cid"),
            E("C", "clinico", null),
        };

        [Fact]
        public void Un_salto_agrega_B_pero_no_C()
        {
            var r = NlqService.ExpandirPorFk(new[] { "A" }, Cadena);
            Assert.Contains("A", r);
            Assert.Contains("B", r);
            Assert.DoesNotContain("C", r);      // 1 salto: no recursivo
            Assert.Equal(2, r.Count);
        }

        [Fact]
        public void Objeto_sin_fk_no_expande()
        {
            var r = NlqService.ExpandirPorFk(new[] { "C" }, Cadena);
            Assert.Single(r);
            Assert.Equal("C", r[0]);
        }

        // Escenario real: diagnosticrepository referencia service (fecha) y diseases (nombre).
        private static readonly List<NlqEsqueletoRow> Clinico = new()
        {
            E("diagnosticrepository", "clinico", "v_ServiceId->dbo.service.v_ServiceId, v_DiseasesId->dbo.diseases.v_DiseasesId, i_MedicoId->dbo.systemuser.i_SystemUserId"),
            E("service", "clinico", "v_PersonId->dbo.person.v_PersonId"),
            E("diseases", "clinico", null),
            // systemuser NO esta activo (no aparece en el esqueleto)
        };

        [Fact]
        public void Diagnostico_agrega_service_y_diseases_no_systemuser()
        {
            var r = NlqService.ExpandirPorFk(new[] { "diagnosticrepository" }, Clinico);
            Assert.Contains("diagnosticrepository", r);
            Assert.Contains("service", r);
            Assert.Contains("diseases", r);
            Assert.DoesNotContain("systemuser", r);   // FK a tabla NO activa -> no se agrega
            // 1 salto: NO expande service->person
            Assert.DoesNotContain("person", r);
            Assert.Equal(3, r.Count);
        }

        [Fact]
        public void Vista_financiera_sin_fk_no_expande()
        {
            var vistas = new List<NlqEsqueletoRow>
            {
                new NlqEsqueletoRow { v_Base = "20505310072", v_Schema = "conta", v_Objeto = "v_nlq_ventas", v_Dominio = "ventas", PKs = null, FKs = null },
                new NlqEsqueletoRow { v_Base = "20505310072", v_Schema = "conta", v_Objeto = "v_nlq_caja", v_Dominio = "caja", PKs = null, FKs = null },
            };
            var r = NlqService.ExpandirPorFk(new[] { "v_nlq_ventas" }, vistas);
            Assert.Single(r);
            Assert.Equal("v_nlq_ventas", r[0]);
        }

        [Fact]
        public void Preserva_base_y_dedup_case_insensitive()
        {
            // Si el retriever ya trajo service, no se duplica al expandir desde diagnosticrepository.
            var r = NlqService.ExpandirPorFk(new[] { "diagnosticrepository", "SERVICE" }, Clinico);
            Assert.Equal(new[] { "diagnosticrepository", "SERVICE", "diseases" }, r.ToArray());
        }
    }
}
