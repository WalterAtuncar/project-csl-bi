using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    /// <summary>
    /// Modulo Epidemiologia. Solo lectura cross-DB a SigesoftDesarrollo_2 via SPs conta.
    /// Toda la logica vive en los SP; aqui solo se mapea (Dapper, CommandType.StoredProcedure).
    /// </summary>
    public class EpidemiologiaRepository
    {
        private readonly Db _db;
        public EpidemiologiaRepository(Db db) => _db = db;

        // ---- TAB 1: Ficha Individual EPI (un resultset: 25 col + TotalFilas) ----
        public (int TotalFilas, List<EpiFichaRow> Items) Ficha(
            DateTime desde, DateTime hasta, string ambito,
            int page, int pageSize, bool soloConDx, bool incluirDescartados, string red,
            int commandTimeout = 60)
        {
            using var cn = _db.Open();
            var items = cn.Query<EpiFichaRow>("conta.sp_Epidemiologia_FichaIndividual", new
            {
                Desde = desde,
                Hasta = hasta,
                Ambito = ambito,
                Page = page,
                PageSize = pageSize,
                SoloConDiagnostico = soloConDx,
                IncluirDescartados = incluirDescartados,
                Red = red
            }, commandType: CommandType.StoredProcedure, commandTimeout: commandTimeout).AsList();

            var total = items.Count > 0 ? items[0].TotalFilas : 0;
            return (total, items);
        }

        // ---- TAB 2: Dashboard Epidemiologico (multi-RS RS0..RS10, leido por posicion) ----
        public EpiDashboardData Dashboard(
            DateTime desde, DateTime hasta, string ambito, bool incluirDescartados, int topN)
        {
            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_Epidemiologia_Dashboard", new
            {
                Desde = desde,
                Hasta = hasta,
                Ambito = ambito,
                IncluirDescartados = incluirDescartados,
                TopN = topN
            }, commandType: CommandType.StoredProcedure, commandTimeout: 60);

            return new EpiDashboardData
            {
                Kpis           = multi.ReadFirstOrDefault<EpiKpisRow>(),        // RS0
                PorConsultorio = multi.Read<EpiPorConsultorioRow>().AsList(),   // RS1
                TopMorbilidad  = multi.Read<EpiMorbilidadRow>().AsList(),       // RS2
                PorCapitulo    = multi.Read<EpiCapituloRow>().AsList(),         // RS3
                Piramide       = multi.Read<EpiPiramideRow>().AsList(),         // RS4
                MorbilidadSexo = multi.Read<EpiMorbilidadSexoRow>().AsList(),   // RS5
                Heatmap        = multi.Read<EpiHeatmapRow>().AsList(),          // RS6
                Tendencia      = multi.Read<EpiTendenciaRow>().AsList(),        // RS7
                Medicos        = multi.Read<EpiMedicoRow>().AsList(),           // RS8
                Comorbilidad   = multi.Read<EpiComorbilidadRow>().AsList(),     // RS9
                Geografia      = multi.Read<EpiGeografiaRow>().AsList(),        // RS10
            };
        }

        // ---- TAB 2: Canal endemico (un resultset, lazy) ----
        public List<EpiCanalEndemicoRow> CanalEndemico(
            int anio, int? hastaSemana, string ambito, int? capitulo, string cie10)
        {
            using var cn = _db.Open();
            return cn.Query<EpiCanalEndemicoRow>("conta.sp_Epidemiologia_CanalEndemico", new
            {
                Anio = anio,
                HastaSemana = hastaSemana,
                Ambito = ambito,
                Capitulo = capitulo,
                Cie10 = cie10
            }, commandType: CommandType.StoredProcedure, commandTimeout: 60).AsList();
        }
    }
}
