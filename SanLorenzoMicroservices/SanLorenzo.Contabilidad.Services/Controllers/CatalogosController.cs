using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Contabilidad.Infrastructure;
using Contabilidad.Models;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    [ApiController]
    [Route("api/conta")]
    [Authorize]
    public class CatalogosController : ControllerBase
    {
        private readonly CatalogoRepository _repo;
        public CatalogosController(CatalogoRepository repo) => _repo = repo;

        private const string ESCRITURA = "SA,CONTABILIDAD";

        // ---- Centros de costo ----
        [HttpGet("centros-costo")]
        public IActionResult CentrosCosto([FromQuery] bool soloActivos = false) => Ok(_repo.CentroCostoList(soloActivos));

        [HttpPost("centros-costo")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult CentroCostoCrear([FromBody] CentroCostoCreateRequest r) => Ok(new { i_IdCentroCosto = _repo.CentroCostoInsert(r, User.UserId()) });

        [HttpPut("centros-costo")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult CentroCostoActualizar([FromBody] CentroCostoUpdateRequest r) => Ok(new { i_IdCentroCosto = _repo.CentroCostoUpdate(r, User.UserId()) });

        // ---- Tipos de gasto ----
        [HttpGet("tipos-gasto")]
        public IActionResult TiposGasto([FromQuery] bool soloActivos = false) => Ok(_repo.TipoGastoList(soloActivos));

        [HttpPost("tipos-gasto")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult TipoGastoCrear([FromBody] TipoGastoCreateRequest r) => Ok(new { i_IdTipoGasto = _repo.TipoGastoInsert(r, User.UserId()) });

        [HttpPut("tipos-gasto")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult TipoGastoActualizar([FromBody] TipoGastoUpdateRequest r) => Ok(new { i_IdTipoGasto = _repo.TipoGastoUpdate(r, User.UserId()) });

        // ---- Entidades ----
        [HttpGet("entidades")]
        public IActionResult Entidades([FromQuery] bool soloActivos = false) => Ok(_repo.EntidadList(soloActivos));

        [HttpPost("entidades")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult EntidadCrear([FromBody] EntidadCreateRequest r) => Ok(new { i_IdEntidad = _repo.EntidadInsert(r, User.UserId()) });

        [HttpPut("entidades")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult EntidadActualizar([FromBody] EntidadUpdateRequest r) => Ok(new { i_IdEntidad = _repo.EntidadUpdate(r, User.UserId()) });

        // ---- Proveedores (catalogo, solo lectura) ----
        [HttpGet("proveedores")]
        public IActionResult Proveedores([FromQuery] bool soloActivos = true) => Ok(_repo.Proveedores(soloActivos));

        // ---- Cuentas bancarias ----
        [HttpGet("cuentas-bancarias")]
        public IActionResult Cuentas([FromQuery] bool soloActivos = false) => Ok(_repo.CuentaList(soloActivos));

        [HttpPost("cuentas-bancarias")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult CuentaCrear([FromBody] CuentaBancariaCreateRequest r) => Ok(new { i_IdCuentaBancaria = _repo.CuentaInsert(r, User.UserId()) });

        [HttpPut("cuentas-bancarias")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult CuentaActualizar([FromBody] CuentaBancariaUpdateRequest r) => Ok(new { i_IdCuentaBancaria = _repo.CuentaUpdate(r, User.UserId()) });

        // ---- SISOL participacion ----
        [HttpGet("sisol/participacion")]
        public IActionResult SisolParticipacion() => Ok(_repo.SisolList());

        [HttpPost("sisol/participacion")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult SisolParticipacionCrear([FromBody] SisolParticipacionCreateRequest r) => Ok(new { i_IdParticipacion = _repo.SisolInsert(r, User.UserId()) });

        [HttpPut("sisol/participacion")]
        [Authorize(Roles = ESCRITURA)]
        public IActionResult SisolActualizar([FromBody] SisolParticipacionUpdateRequest r) => Ok(new { i_IdParticipacion = _repo.SisolUpdate(r, User.UserId()) });

        // ---- Config ----
        [HttpGet("config")]
        public IActionResult Config() => Ok(_repo.ConfigList());

        [HttpPut("config")]
        [Authorize(Roles = "SA")]
        public IActionResult ConfigActualizar([FromBody] ConfigUpdateRequest r) { _repo.ConfigUpdate(r, User.UserId()); return Ok(new { ok = true }); }
    }
}
