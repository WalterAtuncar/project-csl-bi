using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    public class EgresoRepository
    {
        private readonly Db _db;
        public EgresoRepository(Db db) => _db = db;

        public int Insert(EgresoCreateRequest r, int idUsuario)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Egreso_Insert", new
            {
                r.IdProveedor, r.IdEntidad, r.FechaDocumento, r.TipoDocumento, r.SerieNumero,
                r.IdCentroCosto, r.IdTipoGasto, r.Condicion, r.Moneda, r.TipoCambio,
                r.MontoBruto, r.IGV, r.Glosa, r.IdCompra, IdUsuario = idUsuario
            }, commandType: CommandType.StoredProcedure);
        }

        public int Update(EgresoUpdateRequest r, int idUsuario)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Egreso_Update", new
            {
                r.IdEgreso, r.IdProveedor, r.IdEntidad, r.FechaDocumento, r.TipoDocumento, r.SerieNumero,
                r.IdCentroCosto, r.IdTipoGasto, r.Condicion, r.Moneda, r.TipoCambio,
                r.MontoBruto, r.IGV, r.Glosa, IdUsuario = idUsuario
            }, commandType: CommandType.StoredProcedure);
        }

        public int Pagar(EgresoPagarRequest r, int idUsuario)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Egreso_Pagar", new
            {
                r.IdEgreso, r.FechaPago, r.IdFormaPago, r.IdCuentaBancaria, IdUsuario = idUsuario
            }, commandType: CommandType.StoredProcedure);
        }

        public int Anular(EgresoAnularRequest r, int idUsuario)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Egreso_Anular",
                new { r.IdEgreso, r.Motivo, IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
        }

        public EgresoRow Get(int idEgreso)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<EgresoRow>("conta.sp_Egreso_Get",
                new { IdEgreso = idEgreso }, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<EgresoRow> List(DateTime? fdocDesde, DateTime? fdocHasta, DateTime? fpagoDesde, DateTime? fpagoHasta,
            string estado, int? idCentroCosto, int? idTipoGasto, int? idProveedor, int page, int pageSize)
        {
            using var cn = _db.Open();
            return cn.Query<EgresoRow>("conta.sp_Egreso_List", new
            {
                FechaDocDesde = fdocDesde, FechaDocHasta = fdocHasta,
                FechaPagoDesde = fpagoDesde, FechaPagoHasta = fpagoHasta,
                Estado = estado, IdCentroCosto = idCentroCosto, IdTipoGasto = idTipoGasto,
                IdProveedor = idProveedor, Page = page, PageSize = pageSize
            }, commandType: CommandType.StoredProcedure);
        }

        public EgresoCargaResultado CargaMasiva(List<EgresoCargaFila> filas, int idUsuario)
        {
            var tabla = new DataTable();
            tabla.Columns.Add("v_RucOEntidad", typeof(string));
            tabla.Columns.Add("t_FechaDocumento", typeof(DateTime));
            tabla.Columns.Add("v_TipoDocumento", typeof(string));
            tabla.Columns.Add("v_SerieNumero", typeof(string));
            tabla.Columns.Add("v_CodCentroCosto", typeof(string));
            tabla.Columns.Add("v_CodTipoGasto", typeof(string));
            tabla.Columns.Add("v_Condicion", typeof(string));
            tabla.Columns.Add("v_Moneda", typeof(string));
            tabla.Columns.Add("d_TipoCambio", typeof(decimal));
            tabla.Columns.Add("d_MontoBruto", typeof(decimal));
            tabla.Columns.Add("d_IGV", typeof(decimal));
            tabla.Columns.Add("v_Glosa", typeof(string));

            foreach (var f in filas)
                tabla.Rows.Add(
                    (object)f.RucOEntidad ?? DBNull.Value,
                    (object)f.FechaDocumento ?? DBNull.Value,
                    (object)f.TipoDocumento ?? DBNull.Value,
                    (object)f.SerieNumero ?? DBNull.Value,
                    (object)f.CodCentroCosto ?? DBNull.Value,
                    (object)f.CodTipoGasto ?? DBNull.Value,
                    (object)f.Condicion ?? DBNull.Value,
                    (object)f.Moneda ?? DBNull.Value,
                    (object)f.TipoCambio ?? DBNull.Value,
                    (object)f.MontoBruto ?? DBNull.Value,
                    (object)f.IGV ?? DBNull.Value,
                    (object)f.Glosa ?? DBNull.Value);

            var p = new DynamicParameters();
            p.Add("@Filas", tabla.AsTableValuedParameter("conta.tvp_egreso"));
            p.Add("@IdUsuario", idUsuario);

            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_Egreso_CargaMasiva", p, commandType: CommandType.StoredProcedure);
            var resumen = multi.ReadFirst();
            var res = new EgresoCargaResultado
            {
                Insertadas = (int)resumen.insertadas,
                ConError = (int)resumen.conError
            };
            res.Errores = multi.Read<EgresoCargaError>().AsList();
            return res;
        }

        // ---- Costos de personal ----
        public void CostoPersonalUpsert(CostoPersonalUpsertRequest r, int idUsuario)
        {
            using var cn = _db.Open();
            cn.Execute("conta.sp_CostoPersonal_Upsert", new
            {
                r.Anio, r.Mes, r.IdCentroCosto, r.Concepto, r.Monto, IdUsuario = idUsuario
            }, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<CostoPersonalRow> CostoPersonalList(short anio, byte mes)
        {
            using var cn = _db.Open();
            return cn.Query<CostoPersonalRow>("conta.sp_CostoPersonal_List",
                new { Anio = anio, Mes = mes }, commandType: CommandType.StoredProcedure);
        }

        public int CostoPersonalPagar(CostoPersonalPagarRequest r, int idUsuario)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_CostoPersonal_Pagar", new
            {
                r.Anio, r.Mes, r.IdCentroCosto, r.FechaPago, IdUsuario = idUsuario
            }, commandType: CommandType.StoredProcedure);
        }
    }
}
