using System.Net.Http.Json;
using System.Text.Json;
using Contabilidad.Models;

namespace Contabilidad.Infrastructure
{
    /// <summary>Resultado de validar credenciales contra el sistema legacy (/Auth/Login).</summary>
    public class LegacyLoginResult
    {
        public bool Ok { get; set; }
        public LegacyUser User { get; set; }
    }

    /// <summary>
    /// Cliente server-to-server para autenticar contra el API legacy del BI. El legacy no emite
    /// token; devuelve la identidad (objModel) que reutilizamos para poblar el userData del front.
    /// La contrasena solo transita: nunca se almacena ni se loguea.
    /// </summary>
    public class LegacyAuthClient
    {
        private readonly HttpClient _http;
        private readonly int _nodeId;
        private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

        public LegacyAuthClient(HttpClient http, IConfiguration cfg)
        {
            _http = http;
            _nodeId = cfg.GetValue<int?>("Legacy:NodeId") ?? 9;
        }

        // Envoltura ResponseDTO del legacy: { status, description, objModel, token, objPaginated }
        private class LegacyEnvelope
        {
            public int status { get; set; }
            public string description { get; set; }
            public LegacyUser objModel { get; set; }
            public string token { get; set; }
        }

        /// <summary>
        /// Devuelve Ok=true + User si las credenciales son validas (status=1). Ok=false si son
        /// invalidas. Lanza (para que el controller responda 503) si el legacy no esta disponible.
        /// </summary>
        public async Task<LegacyLoginResult> LoginAsync(string user, string password)
        {
            var payload = new { nodeId = _nodeId, user, password };

            // Ruta relativa sin '/' inicial; BaseAddress termina en '/api/' (ver Program.cs).
            using var resp = await _http.PostAsJsonAsync("Auth/Login", payload);

            if (!resp.IsSuccessStatusCode)
            {
                if ((int)resp.StatusCode >= 500)
                    throw new HttpRequestException($"Legacy no disponible ({(int)resp.StatusCode}).");
                return new LegacyLoginResult { Ok = false }; // 400/401 => credenciales invalidas
            }

            var env = await resp.Content.ReadFromJsonAsync<LegacyEnvelope>(JsonOpts);
            if (env == null || env.status != 1 || env.objModel == null || env.objModel.i_SystemUserId <= 0)
                return new LegacyLoginResult { Ok = false };

            return new LegacyLoginResult { Ok = true, User = env.objModel };
        }
    }
}
