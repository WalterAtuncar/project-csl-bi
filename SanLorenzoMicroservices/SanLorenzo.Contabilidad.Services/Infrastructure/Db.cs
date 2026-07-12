using System.Data;
using System.Data.SqlClient;

namespace Contabilidad.Infrastructure
{
    /// <summary>Fabrica de conexiones al schema conta (BD 20505310072).</summary>
    public class Db
    {
        private readonly string _cs;
        public Db(IConfiguration cfg) => _cs = cfg.GetConnectionString("conta");
        public IDbConnection Open() => new SqlConnection(_cs);
    }
}
