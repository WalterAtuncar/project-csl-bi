using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    /// <summary>
    /// Pagina Dashboard (tabs Gerencial y Contable). Solo lectura: toda la logica vive en los SP
    /// conta.sp_Dashboard_*. Aqui solo se mapea (Dapper, CommandType.StoredProcedure). Los SP
    /// multi-RS se leen con QueryMultiple, POR POSICION en el orden del contrato (ver Dtos.cs).
    /// </summary>
    public class DashboardRepository
    {
        private readonly Db _db;
        public DashboardRepository(Db db) => _db = db;

        // ---- Catalogo de checkboxes (conta.sp_Dashboard_TiposCaja, sin params) ----
        public List<DashTipoCajaRow> TiposCaja()
        {
            using var cn = _db.Open();
            return cn.Query<DashTipoCajaRow>(
                "conta.sp_Dashboard_TiposCaja",
                commandType: CommandType.StoredProcedure, commandTimeout: 60).AsList();
        }

        // ---- TAB 1: Gerencial (conta.sp_Dashboard_Gerencial, multi-RS RS0..RS9 por posicion) ----
        public DashGerencialData Gerencial(DateTime desde, DateTime hasta, string tiposCaja)
        {
            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_Dashboard_Gerencial", new
            {
                Desde = desde,
                Hasta = hasta,
                TiposCaja = tiposCaja   // CSV tal cual; NULL = TODOS
            }, commandType: CommandType.StoredProcedure, commandTimeout: 60);

            return new DashGerencialData
            {
                Kpis            = multi.ReadFirstOrDefault<DashGerencialKpisRow>(), // RS0
                TendenciaMensual = multi.Read<DashTendenciaMensualRow>().AsList(),  // RS1
                SerieDiaria     = multi.Read<DashSerieDiariaRow>().AsList(),        // RS2
                MixUnidad       = multi.Read<DashMixUnidadRow>().AsList(),          // RS3
                MixMensual      = multi.Read<DashMixMensualRow>().AsList(),         // RS4
                MediosPago      = multi.Read<DashMediosPagoRow>().AsList(),         // RS5
                Waterfall       = multi.Read<DashWaterfallRow>().AsList(),          // RS6
                TopEgresos      = multi.Read<DashTopEgresosRow>().AsList(),         // RS7
                CxcUnidad       = multi.Read<DashCxcUnidadRow>().AsList(),          // RS8
                HeatmapCobranza = multi.Read<DashHeatmapCobranzaRow>().AsList(),    // RS9
            };
        }

        // ---- TAB 2: Contable (conta.sp_Dashboard_Contable, multi-RS RS0..RS11 por posicion) ----
        public DashContableData Contable(DateTime desde, DateTime hasta, string tiposCaja)
        {
            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_Dashboard_Contable", new
            {
                Desde = desde,
                Hasta = hasta,
                TiposCaja = tiposCaja   // CSV tal cual; NULL = TODOS
            }, commandType: CommandType.StoredProcedure, commandTimeout: 60);

            return new DashContableData
            {
                Kpis                 = multi.ReadFirstOrDefault<DashContableKpisRow>(),  // RS0
                IngresosVsEgresos    = multi.Read<DashIngresosVsEgresosRow>().AsList(),  // RS1
                CobranzasMedioMes    = multi.Read<DashCobranzasMedioMesRow>().AsList(),  // RS2
                ComposicionGastos    = multi.Read<DashComposicionGastosRow>().AsList(),  // RS3
                EvolucionCxc         = multi.Read<DashEvolucionCxcRow>().AsList(),       // RS4
                CxcUnidad            = multi.Read<DashCxcUnidadRow>().AsList(),          // RS5
                CxpAging             = multi.Read<DashCxpAgingRow>().AsList(),           // RS6
                IgvMensual           = multi.Read<DashIgvMensualRow>().AsList(),         // RS7
                PlanillaMes          = multi.Read<DashPlanillaMesRow>().AsList(),        // RS8
                SaldosBancarios      = multi.Read<DashSaldoBancarioRow>().AsList(),      // RS9
                HonorariosConsultorio = multi.Read<DashHonorarioConsultorioRow>().AsList(), // RS10
                SisolLiquidaciones   = multi.Read<DashSisolLiquidacionRow>().AsList(),   // RS11
            };
        }
    }
}
