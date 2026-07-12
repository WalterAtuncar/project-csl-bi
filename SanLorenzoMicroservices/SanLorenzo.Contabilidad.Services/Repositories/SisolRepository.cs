using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    public class SisolRepository
    {
        private readonly Db _db;
        public SisolRepository(Db db) => _db = db;

        public IEnumerable<SisolLiquidacionRow> List(short anio)
        {
            using var cn = _db.Open();
            return cn.Query<SisolLiquidacionRow>("conta.sp_Sisol_List",
                new { Anio = anio }, commandType: CommandType.StoredProcedure);
        }

        public SisolDetalle Get(short anio, byte mes)
        {
            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_Sisol_Get",
                new { Anio = anio, Mes = mes }, commandType: CommandType.StoredProcedure);
            return new SisolDetalle
            {
                Liquidacion = multi.ReadFirstOrDefault<SisolLiquidacionRow>(),
                Especialistas = multi.Read<SisolEspecialistaRow>().AsList(),
            };
        }

        public int Calcular(SisolCalcularRequest r, int idUsuario)
        {
            var tabla = new DataTable();
            tabla.Columns.Add("v_IdMedico", typeof(string));
            tabla.Columns.Add("v_NombreMedico", typeof(string));
            tabla.Columns.Add("d_Porcentaje", typeof(decimal));
            foreach (var e in r.Especialistas ?? new())
                tabla.Rows.Add((object)e.IdMedico ?? DBNull.Value, (object)e.NombreMedico ?? DBNull.Value, e.Porcentaje);

            var p = new DynamicParameters();
            p.Add("@Anio", r.Anio);
            p.Add("@Mes", r.Mes);
            p.Add("@Especialistas", tabla.AsTableValuedParameter("conta.tvp_sisol_especialista"));
            p.Add("@IdUsuario", idUsuario);

            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Sisol_Calcular", p, commandType: CommandType.StoredProcedure);
        }

        public int Pagar(int idLiquidacion, DateTime fechaPago, int idUsuario)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Sisol_Pagar",
                new { IdLiquidacion = idLiquidacion, FechaPago = fechaPago, IdUsuario = idUsuario },
                commandType: CommandType.StoredProcedure);
        }
    }
}
