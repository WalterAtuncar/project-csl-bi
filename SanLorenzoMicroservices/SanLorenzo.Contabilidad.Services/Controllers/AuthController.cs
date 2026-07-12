using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Contabilidad.Infrastructure;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    [ApiController]
    [Route("api/conta/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AuthRepository _repo;
        private readonly JwtTokenService _jwt;
        private readonly LegacyAuthClient _legacy;
        public AuthController(AuthRepository repo, JwtTokenService jwt, LegacyAuthClient legacy)
        { _repo = repo; _jwt = jwt; _legacy = legacy; }

        private static List<string> SplitRoles(string csv)
            => (csv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries).Select(x => x.Trim()).ToList();

        /// <summary>Fija la contrasena del usuario 'sa' la primera vez (mientras no exista ninguno configurado).</summary>
        [HttpPost("bootstrap")]
        [AllowAnonymous]
        public IActionResult Bootstrap([FromBody] BootstrapRequest req)
        {
            if (_repo.CountUsuariosConfig() > 0)
                return BadRequest(new { message = "El sistema ya tiene usuarios configurados." });
            if (string.IsNullOrWhiteSpace(req?.Password) || req.Password.Length < 4)
                return BadRequest(new { message = "Password invalido (min 4 caracteres)." });

            var hash = PasswordHasher.Hash(req.Password);
            _repo.SetPasswordHash("sa", hash);
            return Ok(new { message = "Usuario 'sa' inicializado. Ya puede iniciar sesion." });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public IActionResult Login([FromBody] LoginRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Username))
                return BadRequest(new { message = "Credenciales requeridas." });

            var u = _repo.GetUsuario(req.Username);
            if (u == null || !u.b_Activo || !PasswordHasher.Verify(req.Password ?? "", u.v_PasswordHash))
                return Unauthorized(new { message = "Usuario o contrasena incorrectos." });

            var roles = (u.Roles ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries).ToList();
            _repo.RegistrarLogin(u.i_IdUsuario);
            var token = _jwt.Generate(u.i_IdUsuario, u.v_Username, u.v_NombreCompleto, roles);
            return Ok(new LoginResponse
            {
                Token = token, IdUsuario = u.i_IdUsuario, Username = u.v_Username,
                Nombre = u.v_NombreCompleto, Roles = roles
            });
        }

        /// <summary>
        /// Login unificado del BI. Resuelve LOCAL primero (breakglass 'sa' y usuarios locales);
        /// si no, valida las credenciales contra el sistema legacy y exige un vinculo activo
        /// (whitelist). Devuelve el JWT conta + el usuario legacy intacto para el userData del front.
        /// </summary>
        [HttpPost("login-bi")]
        [AllowAnonymous]
        public async Task<IActionResult> LoginBi([FromBody] LoginRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Username))
                return BadRequest(new { message = "Credenciales requeridas." });

            // 1) LOCAL primero (breakglass: funciona aunque el legacy este caido)
            var local = _repo.GetUsuario(req.Username);
            if (local != null && local.b_Activo && local.v_AuthOrigen == "LOCAL"
                && PasswordHasher.Verify(req.Password ?? "", local.v_PasswordHash))
            {
                var rolesLocal = SplitRoles(local.Roles);
                _repo.RegistrarLogin(local.i_IdUsuario);
                var tokenLocal = _jwt.Generate(local.i_IdUsuario, local.v_Username, local.v_NombreCompleto, rolesLocal);
                return Ok(new LoginBiResponse
                {
                    Token = tokenLocal, IdUsuario = local.i_IdUsuario, Username = local.v_Username,
                    Nombre = local.v_NombreCompleto, Roles = rolesLocal, LegacyUser = null
                });
            }

            // 2) LEGACY: validar credenciales contra el sistema desktop (server-to-server)
            LegacyLoginResult legacy;
            try { legacy = await _legacy.LoginAsync(req.Username, req.Password ?? ""); }
            catch { return StatusCode(503, new { message = "Sistema de autenticacion no disponible. Intente mas tarde." }); }

            if (legacy == null || !legacy.Ok || legacy.User == null)
                return Unauthorized(new { message = "Usuario o contrasena incorrectos." });

            // 3) Autorizacion BI: exigir vinculo activo (whitelist)
            var link = _repo.LoginBiLookup(legacy.User.i_SystemUserId);
            if (link == null)
                return StatusCode(403, new { message = "Credenciales validas, pero sin acceso al BI. Solicite acceso al administrador." });

            var roles = SplitRoles(link.Roles);
            _repo.RegistrarLogin(link.i_IdUsuario);
            var token = _jwt.Generate(link.i_IdUsuario, link.v_Username, link.v_NombreCompleto, roles);
            return Ok(new LoginBiResponse
            {
                Token = token, IdUsuario = link.i_IdUsuario, Username = link.v_Username,
                Nombre = link.v_NombreCompleto, Roles = roles, LegacyUser = legacy.User
            });
        }

        /// <summary>Busca usuarios del sistema legacy para cablearlos (solo SA). Minimo 3 caracteres.</summary>
        [HttpGet("legacy-usuarios")]
        [Authorize(Roles = "SA")]
        public IActionResult LegacyUsuarios([FromQuery] string filtro)
        {
            if (string.IsNullOrWhiteSpace(filtro) || filtro.Trim().Length < 3)
                return Ok(Array.Empty<LegacyUsuarioBusqueda>());
            return Ok(_repo.LegacyBuscar(filtro.Trim()));
        }

        /// <summary>Vincula un usuario del sistema legacy con rol(es) conta (solo SA).</summary>
        [HttpPost("vincular")]
        [Authorize(Roles = "SA")]
        public IActionResult Vincular([FromBody] VincularRequest req)
        {
            if (req == null || req.SystemUserId <= 0 || string.IsNullOrWhiteSpace(req.Roles))
                return BadRequest(new { message = "SystemUserId y roles requeridos." });
            return Ok(new { i_IdUsuario = _repo.Vincular(req, User.UserId()) });
        }

        /// <summary>Actualiza roles / activa-desactiva un usuario vinculado (solo SA).</summary>
        [HttpPut("vincular")]
        [Authorize(Roles = "SA")]
        public IActionResult VinculoUpdate([FromBody] VinculoUpdateRequest req)
            => Ok(new { i_IdUsuario = _repo.VinculoUpdate(req, User.UserId()) });

        [HttpGet("me")]
        [Authorize]
        public IActionResult Me() => Ok(new
        {
            IdUsuario = User.UserId(),
            Username = User.FindFirst("username")?.Value,
            Nombre = User.FindFirst("nombre")?.Value,
            Roles = User.Claims.Where(c => c.Type == System.Security.Claims.ClaimTypes.Role).Select(c => c.Value)
        });

        [HttpGet("roles")]
        [Authorize(Roles = "SA")]
        public IActionResult Roles() => Ok(_repo.ListRoles());

        [HttpGet("usuarios")]
        [Authorize(Roles = "SA")]
        public IActionResult Usuarios() => Ok(_repo.ListUsuarios());

        [HttpPost("usuarios")]
        [Authorize(Roles = "SA")]
        public IActionResult CrearUsuario([FromBody] UsuarioCreateRequest req)
        {
            if (string.IsNullOrWhiteSpace(req?.Username) || string.IsNullOrWhiteSpace(req?.Password))
                return BadRequest(new { message = "Username y password requeridos." });
            var hash = PasswordHasher.Hash(req.Password);
            var id = _repo.InsertUsuario(req, hash, User.UserId());
            return Ok(new { i_IdUsuario = id });
        }

        [HttpPut("usuarios")]
        [Authorize(Roles = "SA")]
        public IActionResult ActualizarUsuario([FromBody] UsuarioUpdateRequest req)
            => Ok(new { i_IdUsuario = _repo.UpdateUsuario(req, User.UserId()) });
    }
}
