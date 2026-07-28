using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Infrastructure.Nlq
{
    /// <summary>
    /// Cache semantico (pregunta normalizada -> SQL) y cache de resultados (hash SQL -> payload).
    /// La normalizacion PRESERVA los valores que distinguen consultas (mes, anio, fecha) para que
    /// "ventas de enero" y "ventas de febrero" NO colisionen (mismo formato de pregunta, distinto valor).
    /// </summary>
    public class NlqCache
    {
        private readonly NlqRepository _repo;
        private readonly NlqOptions _opt;

        public NlqCache(NlqRepository repo, IOptions<NlqOptions> opt)
        {
            _repo = repo;
            _opt = opt.Value;
        }

        private static readonly string[] Meses =
        {
            "enero","febrero","marzo","abril","mayo","junio",
            "julio","agosto","septiembre","setiembre","octubre","noviembre","diciembre"
        };

        /// <summary>
        /// Plantilla normalizada de la pregunta: minusculas, sin tildes, espacios colapsados, y los
        /// tokens de mes/anio/fecha canonizados a &lt;mes:N&gt;/&lt;anio:YYYY&gt;/&lt;fecha:...&gt; CONSERVANDO el valor.
        /// </summary>
        public static string NormalizarPlantilla(string pregunta)
        {
            if (string.IsNullOrWhiteSpace(pregunta)) return "";
            string s = QuitarTildes(pregunta).ToLowerInvariant();

            // Fechas explicitas (dd/mm/yyyy o yyyy-mm-dd) -> token con el valor.
            s = Regex.Replace(s, @"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\b", m => " <fecha:" + m.Value.Replace(" ", "") + "> ");

            // Meses por nombre -> <mes:N> (setiembre y septiembre = 9).
            foreach (var mes in Meses)
                s = Regex.Replace(s, @"\b" + mes + @"\b", " <mes:" + MesNumero(mes) + "> ");

            // Anios 20xx -> <anio:YYYY> (conserva el valor).
            s = Regex.Replace(s, @"\b(20\d{2})\b", " <anio:$1> ");

            // Colapsa espacios.
            s = Regex.Replace(s, @"\s+", " ").Trim();
            return s;
        }

        private static int MesNumero(string mes)
        {
            switch (mes)
            {
                case "enero": return 1;
                case "febrero": return 2;
                case "marzo": return 3;
                case "abril": return 4;
                case "mayo": return 5;
                case "junio": return 6;
                case "julio": return 7;
                case "agosto": return 8;
                case "septiembre": return 9;
                case "setiembre": return 9;
                case "octubre": return 10;
                case "noviembre": return 11;
                case "diciembre": return 12;
                default: return 0;
            }
        }

        private static string QuitarTildes(string s)
        {
            string d = s.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(d.Length);
            foreach (char ch in d)
                if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                    sb.Append(ch);
            return sb.ToString().Normalize(NormalizationForm.FormC);
        }

        /// <summary>SHA-256 en hex minusculas (64 chars).</summary>
        public static string Sha256Hex(string s)
        {
            using var sha = SHA256.Create();
            byte[] h = sha.ComputeHash(Encoding.UTF8.GetBytes(s ?? ""));
            var sb = new StringBuilder(64);
            foreach (byte b in h) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        // ---- Cache semantico ----
        public string BuscarSemantico(string pregunta)
        {
            string hash = Sha256Hex(NormalizarPlantilla(pregunta));
            var row = _repo.CacheSemGet(hash);
            return row?.v_Sql;
        }

        public void GuardarSemantico(string pregunta, string sql)
        {
            string clave = NormalizarPlantilla(pregunta);
            _repo.CacheSemPut(clave, Sha256Hex(clave), sql);
        }

        // ---- Cache resultado ----
        public NlqCacheResRow BuscarResultado(string sqlFinal, string paramsCanonico = "")
        {
            string hash = Sha256Hex((sqlFinal ?? "") + "|" + (paramsCanonico ?? ""));
            return _repo.CacheResGet(hash, "v1");
        }

        public void GuardarResultado(string sqlFinal, string payloadJson, string paramsCanonico = "")
        {
            string hash = Sha256Hex((sqlFinal ?? "") + "|" + (paramsCanonico ?? ""));
            _repo.CacheResPut(hash, "v1", payloadJson, _opt.CacheResultadoTtlMin);
        }
    }
}
