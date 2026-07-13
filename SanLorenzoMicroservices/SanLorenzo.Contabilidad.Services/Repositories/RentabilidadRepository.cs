using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    public class RentabilidadRepository
    {
        private readonly Db _db;
        public RentabilidadRepository(Db db) => _db = db;

        public RentabilidadGeneralRow General(short anio, byte mes, bool incluirCredito)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<RentabilidadGeneralRow>("conta.sp_Rentabilidad_General",
                new { Anio = anio, Mes = mes, IncluirCredito = incluirCredito }, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<RentabilidadUnidadRow> PorUnidad(short anio, byte mes, bool incluirCredito)
        {
            using var cn = _db.Open();
            return cn.Query<RentabilidadUnidadRow>("conta.sp_Rentabilidad_PorUnidad",
                new { Anio = anio, Mes = mes, IncluirCredito = incluirCredito }, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<RentabilidadGastoRow> Gastos(short anio, byte mes)
        {
            using var cn = _db.Open();
            return cn.Query<RentabilidadGastoRow>("conta.sp_Rentabilidad_Gastos",
                new { Anio = anio, Mes = mes }, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<RentabilidadIngresoRow> Ingresos(short anio, byte mes)
        {
            using var cn = _db.Open();
            return cn.Query<RentabilidadIngresoRow>("conta.sp_Rentabilidad_Ingresos",
                new { Anio = anio, Mes = mes }, commandType: CommandType.StoredProcedure);
        }

        public ComparativaResponse Comparativa(short anio, bool incluirCredito)
        {
            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_Rentabilidad_Comparativa",
                new { Anio = anio, IncluirCredito = incluirCredito }, commandType: CommandType.StoredProcedure);
            return new ComparativaResponse
            {
                Mensual = multi.Read<ComparativaMesRow>().AsList(),
                Trimestral = multi.Read<ComparativaPeriodoRow>().AsList(),
                Semestral = multi.Read<ComparativaPeriodoRow>().AsList(),
            };
        }

        public RentabilidadConsultorioResponse PorConsultorio(short anio, byte mes, bool incluirCredito)
        {
            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_Rentabilidad_PorConsultorio",
                new { Anio = anio, Mes = mes, IncluirCredito = incluirCredito }, commandType: CommandType.StoredProcedure);
            return new RentabilidadConsultorioResponse
            {
                Filas = multi.Read<RentabilidadConsultorioRow>().AsList(),
                SinClasificar = multi.Read<RentabilidadConsultorioDiagRow>().AsList(),
            };
        }
    }
}
