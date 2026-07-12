using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    public class CompraRepository
    {
        private readonly Db _db;
        public CompraRepository(Db db) => _db = db;

        public IEnumerable<CompraRow> List(string periodo, bool soloSinClasificar)
        {
            using var cn = _db.Open();
            return cn.Query<CompraRow>("conta.sp_Compra_List",
                new { Periodo = periodo, SoloSinClasificar = soloSinClasificar },
                commandType: CommandType.StoredProcedure);
        }

        public int Clasificar(int idCompra, int idCentroCosto, int idTipoGasto, int idUsuario)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Compra_Clasificar",
                new { IdCompra = idCompra, IdCentroCosto = idCentroCosto, IdTipoGasto = idTipoGasto, IdUsuario = idUsuario },
                commandType: CommandType.StoredProcedure);
        }

        public CompraClasificacionRow GetClasificacion(int idCompra)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<CompraClasificacionRow>("conta.sp_Compra_GetClasificacion",
                new { IdCompra = idCompra }, commandType: CommandType.StoredProcedure);
        }
    }
}
