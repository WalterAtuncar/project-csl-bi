using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    /// <summary>
    /// Acceso a los 12 SPs de catalogo/guardadas/cache/log del modulo NLQ (schema conta, conexion normal).
    /// La EJECUCION del SQL generado por la IA NO pasa por aqui: va por NlqExecutor bajo el login reader.
    /// Dapper mapea por nombre EXACTO de columna; char(64) viene rellenado -> se guarda/consulta con 64 chars.
    /// </summary>
    public class NlqRepository
    {
        private readonly Db _db;
        public NlqRepository(Db db) => _db = db;

        // ---- Catalogo ----
        public List<NlqTablaListaRow> CatalogoLista()
        {
            using var cn = _db.Open();
            return cn.Query<NlqTablaListaRow>("conta.sp_Nlq_CatalogoLista",
                commandType: CommandType.StoredProcedure).AsList();
        }

        /// <summary>Esqueleto relacional (objeto + PKs + FKs) de los objetos activos, para el retriever.</summary>
        public List<NlqEsqueletoRow> CatalogoEsqueleto()
        {
            using var cn = _db.Open();
            return cn.Query<NlqEsqueletoRow>("conta.sp_Nlq_CatalogoEsqueleto",
                commandType: CommandType.StoredProcedure).AsList();
        }

        public NlqCatalogoDetalle CatalogoDetalle(string objetosCsv)
        {
            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_Nlq_CatalogoDetalle",
                new { Objetos = objetosCsv }, commandType: CommandType.StoredProcedure);
            return new NlqCatalogoDetalle
            {
                Tablas = multi.Read<NlqTablaDetRow>().AsList(),
                Columnas = multi.Read<NlqColumnaDetRow>().AsList(),
                Reglas = multi.Read<NlqReglaRow>().AsList()
            };
        }

        public int CatalogoUpsert(string @base, string schema, string objeto, string tipoObjeto,
            string dominio, bool activa, string descripcion)
        {
            using var cn = _db.Open();
            return cn.QuerySingle<int>("conta.sp_Nlq_CatalogoUpsert", new
            {
                Base = @base,
                Schema = schema,
                Objeto = objeto,
                TipoObjeto = tipoObjeto,
                Dominio = dominio,
                Activa = activa,
                Descripcion = descripcion
            }, commandType: CommandType.StoredProcedure);
        }

        // ---- Guardadas ----
        public int GuardarConsulta(NlqGuardarDto d, string fingerprint, int idUsuario, string rol)
        {
            using var cn = _db.Open();
            return cn.QuerySingle<int>("conta.sp_Nlq_GuardarConsulta", new
            {
                d.Nombre,
                d.Descripcion,
                d.Sql,
                d.ChartTipo,
                d.ChartConfig,
                d.Params,
                FingerprintEsquema = fingerprint,
                IdUsuario = idUsuario,
                Rol = rol
            }, commandType: CommandType.StoredProcedure);
        }

        public List<NlqGuardadaRow> ListarGuardadas(int idUsuario, bool esSA)
        {
            using var cn = _db.Open();
            return cn.Query<NlqGuardadaRow>("conta.sp_Nlq_ListarGuardadas",
                new { IdUsuario = idUsuario, EsSA = esSA }, commandType: CommandType.StoredProcedure).AsList();
        }

        public NlqGuardadaFullRow ObtenerGuardada(int id)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<NlqGuardadaFullRow>("conta.sp_Nlq_ObtenerGuardada",
                new { Id = id }, commandType: CommandType.StoredProcedure);
        }

        public int BorrarGuardada(int id, int idUsuario, bool esSA)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Nlq_BorrarGuardada",
                new { Id = id, IdUsuario = idUsuario, EsSA = esSA }, commandType: CommandType.StoredProcedure);
        }

        public int ActualizarChart(int id, int idUsuario, bool esSA, string chartTipo)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Nlq_ActualizarChart",
                new { Id = id, IdUsuario = idUsuario, EsSA = esSA, ChartTipo = chartTipo },
                commandType: CommandType.StoredProcedure);
        }

        // ---- Cache semantico ----
        public NlqCacheSemRow CacheSemGet(string hash)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<NlqCacheSemRow>("conta.sp_Nlq_CacheSemGet",
                new { Hash = hash }, commandType: CommandType.StoredProcedure);
        }

        public void CacheSemPut(string claveNorm, string hash, string sql)
        {
            using var cn = _db.Open();
            cn.Execute("conta.sp_Nlq_CacheSemPut",
                new { ClaveNorm = claveNorm, Hash = hash, Sql = sql }, commandType: CommandType.StoredProcedure);
        }

        // ---- Cache resultado ----
        public NlqCacheResRow CacheResGet(string hashSql, string asOf)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<NlqCacheResRow>("conta.sp_Nlq_CacheResGet",
                new { HashSql = hashSql, AsOf = asOf }, commandType: CommandType.StoredProcedure);
        }

        public void CacheResPut(string hashSql, string asOf, string payload, int ttlMin)
        {
            using var cn = _db.Open();
            cn.Execute("conta.sp_Nlq_CacheResPut",
                new { HashSql = hashSql, AsOf = asOf, Payload = payload, TtlMin = ttlMin },
                commandType: CommandType.StoredProcedure);
        }

        // ---- Log ----
        public long LogInsert(string pregunta, string sql, int tokensIn, int tokensOut, int ms, int filas,
            string fuente, bool error, string errorTexto, int idUsuario)
        {
            using var cn = _db.Open();
            return cn.QuerySingle<long>("conta.sp_Nlq_LogInsert", new
            {
                Pregunta = pregunta,
                Sql = sql,
                TokensIn = tokensIn,
                TokensOut = tokensOut,
                Ms = ms,
                Filas = filas,
                Fuente = fuente,
                Error = error,
                ErrorTexto = errorTexto,
                IdUsuario = idUsuario
            }, commandType: CommandType.StoredProcedure);
        }
    }
}
