using System.Data.SqlClient;
using Microsoft.Extensions.Options;

namespace Contabilidad.Infrastructure
{
    /// <summary>
    /// Proveedor de conexion de SOLO LECTURA para ejecutar el SQL generado por la IA.
    /// Usa ConnectionStrings:conta_nlq_reader (login conta_nlq_reader, db_datareader-only), que vive
    /// en appsettings.Local.json / servidor. Es la SEGUNDA barrera (defensa en profundidad) tras el
    /// validador: aunque el validador fallara, la BD rechaza toda mutacion por permisos.
    ///
    /// La cadena PUEDE no existir todavia (el login lo aplica el PO en F3). En ese caso NO se falla al
    /// arrancar: se lanza un error claro solo al intentar EJECUTAR.
    /// </summary>
    public class NlqReaderDb
    {
        private readonly string _cs;
        private readonly NlqOptions _opt;

        public NlqReaderDb(IConfiguration cfg, IOptions<NlqOptions> opt)
        {
            _cs = cfg.GetConnectionString("conta_nlq_reader");
            _opt = opt.Value;
        }

        public int CommandTimeoutSeg => _opt.CommandTimeoutSeg > 0 ? _opt.CommandTimeoutSeg : 30;
        public int CapFilas => _opt.CapFilas > 0 ? _opt.CapFilas : 5000;

        public SqlConnection Open()
        {
            if (string.IsNullOrWhiteSpace(_cs))
                throw new ContaBusinessException(
                    "El conector de solo-lectura (ConnectionStrings:conta_nlq_reader) no esta configurado. " +
                    "El modulo de consultas requiere el login reader (appsettings.Local.json / servidor).");
            var cn = new SqlConnection(_cs);
            cn.Open();
            return cn;
        }
    }
}
