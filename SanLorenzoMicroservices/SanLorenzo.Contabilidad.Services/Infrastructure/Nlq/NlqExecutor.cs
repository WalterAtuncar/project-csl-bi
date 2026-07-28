using System.Data;
using Dapper;
using Contabilidad.Models;

namespace Contabilidad.Infrastructure.Nlq
{
    public class NlqEjecucionResultado
    {
        public List<NlqColumnaDto> Columnas { get; set; } = new();
        public List<List<object>> Filas { get; set; } = new();
        public bool CapAlcanzado { get; set; }
    }

    /// <summary>
    /// Ejecuta un SQL YA VALIDADO bajo la conexion de solo-lectura (NlqReaderDb).
    /// Fuerza @cap (si el SQL lo referencia), aplica CommandTimeout y corta en CapFilas.
    /// Infiere el Formato de cada columna (money/pct/date/int/text) desde su nombre + tipo.
    /// </summary>
    public class NlqExecutor
    {
        private readonly NlqReaderDb _reader;

        public NlqExecutor(NlqReaderDb reader) => _reader = reader;

        public NlqEjecucionResultado Ejecutar(string sqlValidado, DynamicParameters extraParams = null)
        {
            int cap = _reader.CapFilas;
            var p = extraParams ?? new DynamicParameters();

            // El validador fuerza TOP (@cap): si el SQL lo referencia y no vino por params, se agrega.
            if (sqlValidado.IndexOf("@cap", StringComparison.OrdinalIgnoreCase) >= 0
                && !p.ParameterNames.Contains("cap"))
            {
                p.Add("@cap", cap);
            }

            var res = new NlqEjecucionResultado();

            using var cn = _reader.Open();
            using var reader = cn.ExecuteReader(new CommandDefinition(
                sqlValidado, p, commandType: CommandType.Text, commandTimeout: _reader.CommandTimeoutSeg));

            int fieldCount = reader.FieldCount;
            var formatos = new string[fieldCount];
            for (int i = 0; i < fieldCount; i++)
            {
                string nombre = reader.GetName(i);
                Type clr = reader.GetFieldType(i);
                string sqlTipo = SafeDataTypeName(reader, i);
                string formato = InferirFormato(nombre, clr);
                formatos[i] = formato;
                res.Columnas.Add(new NlqColumnaDto { Nombre = nombre, Tipo = sqlTipo, Formato = formato });
            }

            int leidas = 0;
            while (reader.Read())
            {
                if (leidas >= cap) { res.CapAlcanzado = true; break; }
                var fila = new List<object>(fieldCount);
                for (int i = 0; i < fieldCount; i++)
                {
                    object v = reader.GetValue(i);
                    fila.Add(v is DBNull ? null : v);
                }
                res.Filas.Add(fila);
                leidas++;
            }
            if (leidas >= cap) res.CapAlcanzado = true;

            return res;
        }

        private static string SafeDataTypeName(IDataReader reader, int i)
        {
            try { return reader.GetDataTypeName(i); }
            catch { return reader.GetFieldType(i)?.Name ?? "text"; }
        }

        // Palabras que marcan una cifra monetaria (subcadena, case-insensitive).
        private static readonly string[] Money =
            { "total", "importe", "ingreso", "gasto", "resultado", "neto", "monto", "saldo", "cobrado", "deuda" };

        /// <summary>
        /// Infiere el formato de presentacion: pct (margen/porc) &gt; money (nombres de dinero, si es numerico) &gt;
        /// date (datetime) &gt; int (enteros) &gt; text.
        /// </summary>
        public static string InferirFormato(string nombre, Type clr)
        {
            string n = (nombre ?? "").ToLowerInvariant();
            bool esNumerico = clr == typeof(decimal) || clr == typeof(double) || clr == typeof(float);
            bool esEntero = clr == typeof(int) || clr == typeof(long) || clr == typeof(short)
                            || clr == typeof(byte) || clr == typeof(sbyte);

            // Porcentaje: gana sobre money aunque el nombre tambien parezca dinero.
            if (n.Contains("margen") || n.Contains("porc") || n.Contains("pct") || n.Contains("%"))
                return "pct";

            if (esNumerico)
            {
                foreach (var m in Money) if (n.Contains(m)) return "money";
                return "text"; // decimal sin nombre de dinero -> no asumir moneda
            }

            if (clr == typeof(DateTime) || clr == typeof(DateTimeOffset)) return "date";
            if (esEntero) return "int";
            return "text";
        }
    }
}
