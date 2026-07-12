using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    public class CajaRepository
    {
        private readonly Db _db;
        public CajaRepository(Db db) => _db = db;

        public IEnumerable<CajaIngresoRow> Ingresos(DateTime desde, DateTime hasta)
        {
            using var cn = _db.Open();
            return cn.Query<CajaIngresoRow>("conta.sp_Caja_Ingresos",
                new { Desde = desde, Hasta = hasta }, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<CajaEgresoRow> Egresos(DateTime desde, DateTime hasta)
        {
            using var cn = _db.Open();
            return cn.Query<CajaEgresoRow>("conta.sp_Caja_Egresos",
                new { Desde = desde, Hasta = hasta }, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<CajaDiaRow> Diaria(short anio, byte mes)
        {
            using var cn = _db.Open();
            return cn.Query<CajaDiaRow>("conta.sp_Caja_Diaria",
                new { Anio = anio, Mes = mes }, commandType: CommandType.StoredProcedure);
        }

        public FlujoConsolidadoResponse FlujoConsolidado(short anio)
        {
            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_Caja_FlujoConsolidado",
                new { Anio = anio }, commandType: CommandType.StoredProcedure);
            return new FlujoConsolidadoResponse
            {
                Resumen = multi.Read<FlujoMesRow>().AsList(),
                IngresosPorUnidad = multi.Read<FlujoIngresoUnidadRow>().AsList(),
                EgresosPorSeccion = multi.Read<FlujoEgresoSeccionRow>().AsList(),
            };
        }

        public dynamic CerrarMes(short anio, byte mes, int idUsuario)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault("conta.sp_Caja_CerrarMes",
                new { Anio = anio, Mes = mes, IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
        }

        public int ReabrirMes(short anio, byte mes, int idUsuario)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Caja_ReabrirMes",
                new { Anio = anio, Mes = mes, IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
        }

        public void SetApertura(AperturaRequest r, int idUsuario)
        {
            using var cn = _db.Open();
            cn.Execute("conta.sp_SaldoCaja_SetApertura",
                new { r.Anio, r.Mes, r.SaldoInicial, r.MontoInicialNeto, IdUsuario = idUsuario },
                commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<SaldoBancoRow> SaldosBanco(short anio, byte mes)
        {
            using var cn = _db.Open();
            return cn.Query<SaldoBancoRow>("conta.sp_SaldoBanco_List",
                new { Anio = anio, Mes = mes }, commandType: CommandType.StoredProcedure);
        }

        public void SaldoBancoUpsert(SaldoBancoUpsertRequest r, int idUsuario)
        {
            using var cn = _db.Open();
            cn.Execute("conta.sp_SaldoBanco_Upsert",
                new { r.Anio, r.Mes, r.IdCuentaBancaria, r.SaldoSoles, r.SaldoDolares, IdUsuario = idUsuario },
                commandType: CommandType.StoredProcedure);
        }
    }
}
