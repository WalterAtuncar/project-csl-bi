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
        public AuthController(AuthRepository repo, JwtTokenService jwt) { _repo = repo; _jwt = jwt; }

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
