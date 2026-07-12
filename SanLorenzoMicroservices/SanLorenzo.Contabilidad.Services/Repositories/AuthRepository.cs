using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    public class AuthRepository
    {
        private readonly Db _db;
        public AuthRepository(Db db) => _db = db;

        public UsuarioAuthRow GetUsuario(string username)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<UsuarioAuthRow>("conta.sp_Auth_GetUsuario",
                new { Username = username }, commandType: CommandType.StoredProcedure);
        }

        public int SetPasswordHash(string username, string hash)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Usuario_SetPasswordHash",
                new { Username = username, Hash = hash }, commandType: CommandType.StoredProcedure);
        }

        public void RegistrarLogin(int idUsuario)
        {
            using var cn = _db.Open();
            cn.Execute("conta.sp_Auth_RegistrarLogin", new { IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
        }

        public int CountUsuariosConfig()
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Usuario_CountActivos", commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<UsuarioRow> ListUsuarios()
        {
            using var cn = _db.Open();
            return cn.Query<UsuarioRow>("conta.sp_Usuario_List", commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<dynamic> ListRoles()
        {
            using var cn = _db.Open();
            return cn.Query("conta.sp_Rol_List", commandType: CommandType.StoredProcedure);
        }

        public int InsertUsuario(UsuarioCreateRequest r, string hash, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Usuario_Insert",
                new { r.Username, PasswordHash = hash, r.NombreCompleto, r.Roles, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }

        public int UpdateUsuario(UsuarioUpdateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Usuario_Update",
                new { r.IdUsuario, r.NombreCompleto, r.Activo, r.Roles, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }

        // ---------- Login unificado BI ----------
        public LoginBiLookupRow LoginBiLookup(int systemUserIdLegacy)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<LoginBiLookupRow>("conta.sp_Auth_LoginBiLookup",
                new { SystemUserIdLegacy = systemUserIdLegacy }, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<LegacyUsuarioBusqueda> LegacyBuscar(string filtro)
        {
            using var cn = _db.Open();
            return cn.Query<LegacyUsuarioBusqueda>("conta.sp_Auth_LegacyBuscar",
                new { Filtro = filtro }, commandType: CommandType.StoredProcedure);
        }

        public int Vincular(VincularRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Auth_Vincular",
                new { r.SystemUserId, r.Username, r.Nombre, r.Roles, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }

        public int VinculoUpdate(VinculoUpdateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Auth_VinculoUpdate",
                new { r.IdUsuario, r.Roles, r.Activo, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }
    }
}
