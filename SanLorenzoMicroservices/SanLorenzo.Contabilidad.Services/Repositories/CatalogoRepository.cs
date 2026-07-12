using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    public class CatalogoRepository
    {
        private readonly Db _db;
        public CatalogoRepository(Db db) => _db = db;

        // ---- Centro de costo ----
        public IEnumerable<CentroCostoRow> CentroCostoList(bool soloActivos)
        {
            using var cn = _db.Open();
            return cn.Query<CentroCostoRow>("conta.sp_CentroCosto_List",
                new { SoloActivos = soloActivos }, commandType: CommandType.StoredProcedure);
        }
        public int CentroCostoInsert(CentroCostoCreateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_CentroCosto_Insert",
                new { r.IdPadre, r.Codigo, r.Nombre, r.Descripcion, r.IdTipoCaja, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }
        public int CentroCostoUpdate(CentroCostoUpdateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_CentroCosto_Update",
                new { r.IdCentroCosto, r.Nombre, r.Descripcion, r.IdTipoCaja, r.Activo, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }

        // ---- Tipo de gasto ----
        public IEnumerable<TipoGastoRow> TipoGastoList(bool soloActivos)
        {
            using var cn = _db.Open();
            return cn.Query<TipoGastoRow>("conta.sp_TipoGasto_List",
                new { SoloActivos = soloActivos }, commandType: CommandType.StoredProcedure);
        }
        public int TipoGastoInsert(TipoGastoCreateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_TipoGasto_Insert",
                new { r.IdPadre, r.Codigo, r.Nombre, r.SeccionFlujo, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }
        public int TipoGastoUpdate(TipoGastoUpdateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_TipoGasto_Update",
                new { r.IdTipoGasto, r.Nombre, r.SeccionFlujo, r.Activo, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }

        // ---- Entidad ----
        public IEnumerable<EntidadRow> EntidadList(bool soloActivos)
        {
            using var cn = _db.Open();
            return cn.Query<EntidadRow>("conta.sp_Entidad_List",
                new { SoloActivos = soloActivos }, commandType: CommandType.StoredProcedure);
        }
        public int EntidadInsert(EntidadCreateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Entidad_Insert",
                new { r.Nombre, r.Tipo, IdUsuarioAccion = idAccion }, commandType: CommandType.StoredProcedure);
        }
        public int EntidadUpdate(EntidadUpdateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_Entidad_Update",
                new { r.IdEntidad, r.Nombre, r.Tipo, r.Activo, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }

        // ---- Cuenta bancaria ----
        public IEnumerable<CuentaBancariaRow> CuentaList(bool soloActivos)
        {
            using var cn = _db.Open();
            return cn.Query<CuentaBancariaRow>("conta.sp_CuentaBancaria_List",
                new { SoloActivos = soloActivos }, commandType: CommandType.StoredProcedure);
        }
        public int CuentaInsert(CuentaBancariaCreateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_CuentaBancaria_Insert",
                new { r.Banco, r.NroCuenta, r.Moneda, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }
        public int CuentaUpdate(CuentaBancariaUpdateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_CuentaBancaria_Update",
                new { r.IdCuentaBancaria, r.Banco, r.NroCuenta, r.Moneda, r.Activo, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }

        // ---- SISOL participacion ----
        public IEnumerable<SisolParticipacionRow> SisolList()
        {
            using var cn = _db.Open();
            return cn.Query<SisolParticipacionRow>("conta.sp_SisolParticipacion_List", commandType: CommandType.StoredProcedure);
        }
        public int SisolInsert(SisolParticipacionCreateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_SisolParticipacion_Insert",
                new { r.PorcClinica, r.PorcHospital, r.VigenciaDesde, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }
        public int SisolUpdate(SisolParticipacionUpdateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            return cn.QuerySingle<int>("conta.sp_SisolParticipacion_Update",
                new { r.IdParticipacion, r.PorcClinica, r.PorcHospital, r.VigenciaDesde, IdUsuarioAccion = idAccion },
                commandType: CommandType.StoredProcedure);
        }

        // ---- Config ----
        public IEnumerable<ConfigRow> ConfigList()
        {
            using var cn = _db.Open();
            return cn.Query<ConfigRow>("conta.sp_Config_List", commandType: CommandType.StoredProcedure);
        }
        public void ConfigUpdate(ConfigUpdateRequest r, int idAccion)
        {
            using var cn = _db.Open();
            cn.Execute("conta.sp_Config_Update",
                new { r.Clave, r.Valor, IdUsuarioAccion = idAccion }, commandType: CommandType.StoredProcedure);
        }
    }
}
