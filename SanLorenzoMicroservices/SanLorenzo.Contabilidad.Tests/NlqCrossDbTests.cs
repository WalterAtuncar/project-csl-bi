using System.Collections.Generic;
using Contabilidad.Infrastructure.Nlq;
using Contabilidad.Models;
using Xunit;

namespace Contabilidad.Tests
{
    /// <summary>
    /// FASE C: naming cross-DB de 3 partes. El allowlist construido desde el catalogo (con v_Base)
    /// acepta [Base].[Schema].[Objeto]; el validador acepta JOINs de tablas crudas clinicas de
    /// SigesoftDesarrollo_2, y rechaza un objeto clinico NO activo. La suite adversarial no se relaja.
    /// </summary>
    public class NlqCrossDbTests
    {
        private static readonly NlqValidator V = new NlqValidator();

        private static NlqTablaListaRow T(string b, string s, string o)
            => new NlqTablaListaRow { v_Base = b, v_Schema = s, v_Objeto = o };

        // Catalogo activo: 2 vistas financieras (BD principal) + 3 tablas crudas clinicas (SigesoftDesarrollo_2).
        private static readonly List<NlqTablaListaRow> Catalogo = new()
        {
            T("20505310072", "conta", "v_nlq_ventas"),
            T("20505310072", "conta", "v_nlq_caja"),
            T("SigesoftDesarrollo_2", "dbo", "service"),
            T("SigesoftDesarrollo_2", "dbo", "diagnosticrepository"),
            T("SigesoftDesarrollo_2", "dbo", "diseases"),
        };

        private static System.Collections.Generic.ISet<string> Allow() => NlqService.ConstruirAllowlist(Catalogo);

        [Fact]
        public void Allowlist_incluye_3_partes_de_sigesoft()
        {
            var al = Allow();
            Assert.Contains("[SigesoftDesarrollo_2].[dbo].[service]", al);
            Assert.Contains("SigesoftDesarrollo_2.dbo.service", al);
            Assert.Contains("dbo.service", al);
            Assert.Contains("service", al);
            // financiero 3 partes tambien
            Assert.Contains("[20505310072].[conta].[v_nlq_ventas]", al);
        }

        [Fact]
        public void Valida_join_de_dos_tablas_clinicas_en_3_partes()
        {
            var sql =
                "SELECT s.v_ServiceId, d.v_DiseasesId " +
                "FROM [SigesoftDesarrollo_2].[dbo].[service] s " +
                "JOIN [SigesoftDesarrollo_2].[dbo].[diagnosticrepository] d ON d.v_ServiceId = s.v_ServiceId " +
                "WHERE s.i_IsDeleted = 0 AND s.i_ServiceStatusId = 3";
            var r = V.Validar(sql, Allow(), cap: 5000);
            Assert.True(r.Ok, r.Motivo);
            Assert.Contains("TOP (@cap)", r.SqlNormalizado);
        }

        [Fact]
        public void Valida_join_de_tres_objetos_clinicos()
        {
            var sql =
                "SELECT dr.v_DiseasesId, di.v_DiseasesName, s.d_ServiceDate " +
                "FROM [SigesoftDesarrollo_2].[dbo].[diagnosticrepository] dr " +
                "JOIN [SigesoftDesarrollo_2].[dbo].[service] s ON s.v_ServiceId = dr.v_ServiceId " +
                "JOIN [SigesoftDesarrollo_2].[dbo].[diseases] di ON di.v_DiseasesId = dr.v_DiseasesId " +
                "WHERE s.i_IsDeleted = 0 AND dr.i_FinalQualificationId IN (2,3)";
            var r = V.Validar(sql, Allow(), cap: 5000);
            Assert.True(r.Ok, r.Motivo);
        }

        [Fact]
        public void Rechaza_objeto_clinico_no_activo_en_3_partes()
        {
            // 'systemuser' existe en SigesoftDesarrollo_2 pero NO esta en el catalogo activo.
            var sql =
                "SELECT s.v_ServiceId, u.v_UserName " +
                "FROM [SigesoftDesarrollo_2].[dbo].[service] s " +
                "JOIN [SigesoftDesarrollo_2].[dbo].[systemuser] u ON u.i_SystemUserId = s.i_InsertUserId";
            var r = V.Validar(sql, Allow(), cap: 5000);
            Assert.False(r.Ok);
            Assert.Contains("no permitido", r.Motivo);
        }

        [Fact]
        public void Rechaza_join_a_tabla_de_otra_bd_no_catalogada()
        {
            // Cross-DB a una BD que no esta en el catalogo -> rechazo por allowlist.
            var sql =
                "SELECT s.v_ServiceId FROM [SigesoftDesarrollo_2].[dbo].[service] s " +
                "JOIN [OtraBD].[dbo].[service] o ON o.v_ServiceId = s.v_ServiceId";
            var r = V.Validar(sql, Allow(), cap: 5000);
            Assert.False(r.Ok);
        }

        [Fact]
        public void Acepta_vista_financiera_en_3_partes()
        {
            var sql = "SELECT Serie, SUM(Total) AS Total FROM [20505310072].[conta].[v_nlq_ventas] GROUP BY Serie";
            var r = V.Validar(sql, Allow(), cap: 5000);
            Assert.True(r.Ok, r.Motivo);
        }

        [Fact]
        public void Dml_sobre_tabla_cruda_3_partes_sigue_rechazado()
        {
            // La apertura cross-DB NO relaja la barrera SELECT-only.
            var sql = "SELECT 1 FROM [SigesoftDesarrollo_2].[dbo].[service]; DROP TABLE [SigesoftDesarrollo_2].[dbo].[service]";
            var r = V.Validar(sql, Allow(), cap: 5000);
            Assert.False(r.Ok);
        }
    }
}
