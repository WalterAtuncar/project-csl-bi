using System.Security.Claims;

namespace Contabilidad.Infrastructure
{
    public static class UserContext
    {
        /// <summary>Id del usuario autenticado (claim sub). 0 si no hay token.</summary>
        public static int UserId(this ClaimsPrincipal user)
        {
            var sub = user?.FindFirst("sub")?.Value
                   ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(sub, out var id) ? id : 0;
        }
    }
}
