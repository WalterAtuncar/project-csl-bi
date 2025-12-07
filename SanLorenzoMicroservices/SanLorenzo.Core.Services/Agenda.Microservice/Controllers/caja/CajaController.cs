using Business.Logic.IContractsBL.caja;
using Data.Model;
using Data.Model.Request.caja;
using Data.Model.Response.caja;
using Microsoft.AspNetCore.Mvc;

namespace Agenda.Microservice.Controllers.caja
{
    [Route("api/[controller]")]
    [ApiController]
    [Produces("application/json")]
    [Consumes("application/json")]
    public class CajaController : ControllerBase
    {
        private ICajaLogic _cajaLogic;
        public ResponseDTO _ResponseDTO;

        public CajaController(ICajaLogic cajaLogic)
        {
            _cajaLogic = cajaLogic;
        }

        [HttpGet("caja-mayor-cierre/exists")]
        [ProducesResponseType(typeof(CajaMayorCierreExistsResponse), StatusCodes.Status200OK)]
        public IActionResult CajaMayorCierreExists([FromQuery] int anio, [FromQuery] int mes)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new CheckCierreExistsRequest { Anio = anio, Mes = mes };
                var response = _cajaLogic.CajaMayorCierreExists(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet("caja-mayor-cierre")]
        [ProducesResponseType(typeof(IEnumerable<CajaMayorCabeceraResponse>), StatusCodes.Status200OK)]
        public IActionResult GetListCabecera([FromQuery] string anio, [FromQuery] string mes, [FromQuery] byte? estadoCierre, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new GetListCabeceraRequest { Anio = anio, Mes = mes, EstadoCierre = estadoCierre, Page = page, PageSize = pageSize };
                var response = _cajaLogic.GetListCabecera(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet("caja-mayor-cierre/rango")]
        [ProducesResponseType(typeof(IEnumerable<CajaMayorCabeceraResponse>), StatusCodes.Status200OK)]
        public IActionResult GetCierresPorRango([FromQuery] int periodoDesde, [FromQuery] int periodoHasta, [FromQuery] byte? estadoCierre, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new GetCierresPorRangoRequest { PeriodoDesde = periodoDesde, PeriodoHasta = periodoHasta, EstadoCierre = estadoCierre, Page = page, PageSize = pageSize };
                var response = _cajaLogic.GetCierresPorRango(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet("caja-mayor-cierre/rango/resumen-mensual-por-tipo")]
        [ProducesResponseType(typeof(IEnumerable<CajaMayorResumenMensualTipoResponse>), StatusCodes.Status200OK)]
        public IActionResult GetResumenMensualPorTipo([FromQuery] int periodoDesde, [FromQuery] int periodoHasta, [FromQuery] int? idTipoCaja, [FromQuery] byte? estadoCierre, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new ResumenMensualPorTipoRequest { PeriodoDesde = periodoDesde, PeriodoHasta = periodoHasta, IdTipoCaja = idTipoCaja, EstadoCierre = estadoCierre, Page = page, PageSize = pageSize };
                var response = _cajaLogic.ResumenMensualPorTipo(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet("caja-mayor-cierre/{id}")]
        [ProducesResponseType(typeof(CajaMayorCabeceraResponse), StatusCodes.Status200OK)]
        public IActionResult GetCabecera([FromRoute] int id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new GetCabeceraRequest { IdCajaMayorCierre = id };
                var response = _cajaLogic.GetCabecera(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("caja-mayor-cierre")]
        [ProducesResponseType(typeof(CajaMayorCabeceraResponse), StatusCodes.Status200OK)]
        public IActionResult CierreCreateUpdate([FromBody] CierreCreateUpdateRequest request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.CierreCreateUpdate(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("caja-mayor-cierre/{id}/cerrar")]
        [ProducesResponseType(typeof(CajaMayorCabeceraResponse), StatusCodes.Status200OK)]
        public IActionResult Cerrar([FromRoute] int id, [FromBody] CerrarRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new CerrarRequest { IdCajaMayorCierre = id, ActualizaIdUsuario = body.ActualizaIdUsuario };
                var response = _cajaLogic.Cerrar(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("caja-mayor-cierre/{id}/confirmar")]
        [ProducesResponseType(typeof(CajaMayorCabeceraResponse), StatusCodes.Status200OK)]
        public IActionResult Confirmar([FromRoute] int id, [FromBody] ConfirmarRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new ConfirmarRequest { IdCajaMayorCierre = id, ActualizaIdUsuario = body.ActualizaIdUsuario };
                var response = _cajaLogic.Confirmar(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpDelete("caja-mayor-cierre/{id}")]
        [ProducesResponseType(typeof(DeleteCajaMayorCierreResponse), StatusCodes.Status200OK)]
        public IActionResult DeleteCajaMayorCierre([FromRoute] int id, [FromBody] DeleteCierreRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new DeleteCierreRequest { IdCajaMayorCierre = id, EliminaIdUsuario = body.EliminaIdUsuario };
                var response = _cajaLogic.DeleteCajaMayorCierrePhysical(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("caja-mayor-cierre/{id}/resumen-tipos")]
        [ProducesResponseType(typeof(IEnumerable<CajaMayorResumenTipoResponse>), StatusCodes.Status200OK)]
        public IActionResult ResumenTipos([FromRoute] int id, [FromBody] ResumenTiposRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new ResumenTiposRequest { IdCajaMayorCierre = id, ActualizaIdUsuario = body.ActualizaIdUsuario };
                var response = _cajaLogic.ResumenTipos(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("caja-mayor-cierre/{id}/recalcular-totales")]
        [ProducesResponseType(typeof(CajaMayorTotalesResponse), StatusCodes.Status200OK)]
        public IActionResult RecalcularTotales([FromRoute] int id, [FromBody] RecalcularTotalesRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new RecalcularTotalesRequest { IdCajaMayorCierre = id, ActualizaIdUsuario = body.ActualizaIdUsuario };
                var response = _cajaLogic.RecalcularTotales(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("caja-mayor-cierre/{id}/saldo-inicial")]
        [ProducesResponseType(typeof(CajaMayorResumenTipoResponse), StatusCodes.Status200OK)]
        public IActionResult UpdateSaldoInicialTipoCaja([FromRoute] int id, [FromBody] UpdateSaldoInicialTipoCajaRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new UpdateSaldoInicialTipoCajaRequest { IdCajaMayorCierre = id, IdTipoCaja = body.IdTipoCaja, SaldoInicial = body.SaldoInicial, ActualizaIdUsuario = body.ActualizaIdUsuario };
                var response = _cajaLogic.UpdateSaldoInicialTipoCaja(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("caja-mayor-cierre/{id}/generar-egresos-desde-ventas")]
        [ProducesResponseType(typeof(IEnumerable<CajaMayorMovimientoDbResponse>), StatusCodes.Status200OK)]
        public IActionResult GenerarEgresosDesdeVentas([FromRoute] int id, [FromBody] GenerarEgresosDesdeVentasRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new GenerarEgresosDesdeVentasRequest { IdCajaMayorCierre = id, InsertaIdUsuario = body.InsertaIdUsuario, DefaultIdTipoCaja = body.DefaultIdTipoCaja };
                var response = _cajaLogic.GenerarEgresosDesdeVentas(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("caja-mayor-cierre/{id}/generar-ingresos-desde-cobranzas")]
        [ProducesResponseType(typeof(IEnumerable<CajaMayorMovimientoDbResponse>), StatusCodes.Status200OK)]
        public IActionResult GenerarIngresosDesdeCobranzas([FromRoute] int id, [FromBody] GenerarIngresosDesdeCobranzasRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new GenerarIngresosDesdeCobranzasRequest { IdCajaMayorCierre = id, InsertaIdUsuario = body.InsertaIdUsuario, DefaultIdTipoCaja = body.DefaultIdTipoCaja };
                var response = _cajaLogic.GenerarIngresosDesdeCobranzas(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet("caja-mayor-cierre/{id}/movimientos")]
        [ProducesResponseType(typeof(IEnumerable<CajaMayorMovimientoResponse>), StatusCodes.Status200OK)]
        public IActionResult GetMovimientos([FromRoute] int id, [FromQuery] int? idCajaMayorCierre, [FromQuery] int? idTipoCaja, [FromQuery] string? tipoMovimiento, [FromQuery] string? origen, [FromQuery] DateTime? fechaDesde, [FromQuery] DateTime? fechaHasta, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] bool? sinPaginacion = null)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var cierreId = idCajaMayorCierre ?? id;
                var request = new GetMovimientosRequest { IdCajaMayorCierre = cierreId, IdTipoCaja = idTipoCaja, TipoMovimiento = tipoMovimiento, Origen = origen, FechaDesde = fechaDesde, FechaHasta = fechaHasta, Page = page, PageSize = pageSize, SinPaginacion = sinPaginacion };
                var response = _cajaLogic.GetMovimientos(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("caja-mayor-cierre/{id}/movimientos/manual")]
        [ProducesResponseType(typeof(CajaMayorMovimientoDbResponse), StatusCodes.Status200OK)]
        public IActionResult InsertMovimientoManual([FromRoute] int id, [FromBody] InsertMovimientoManualRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new InsertMovimientoManualRequest
                {
                    IdCajaMayorCierre = id,
                    IdTipoCaja = body.IdTipoCaja,
                    TipoMovimiento = body.TipoMovimiento,
                    // Nuevos campos
                    ConceptoMovimiento = body.ConceptoMovimiento,
                    Subtotal = body.Subtotal,
                    IGV = body.IGV,
                    Origen = string.IsNullOrWhiteSpace(body.Origen) ? "manual" : body.Origen,
                    Total = body.Total,
                    FechaRegistro = body.FechaRegistro,
                    Observaciones = body.Observaciones,
                    CodigoDocumento = body.CodigoDocumento,
                    SerieDocumento = body.SerieDocumento,
                    NumeroDocumento = body.NumeroDocumento,
                    IdVenta = body.IdVenta,
                    InsertaIdUsuario = body.InsertaIdUsuario
                };
                var response = _cajaLogic.InsertMovimientoManual(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet("caja-mayor/tipos-caja")]
        [ProducesResponseType(typeof(IEnumerable<TipoCajaResponse>), StatusCodes.Status200OK)]
        public IActionResult GetTiposCaja([FromQuery] bool includeInactive = false)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.GetTiposCaja(includeInactive);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet("caja-mayor/categorias-egreso")]
        [ProducesResponseType(typeof(IEnumerable<CategoriaEgresoResponse>), StatusCodes.Status200OK)]
        public IActionResult GetCategoriasEgreso([FromQuery] int groupId)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.GetCategoriaEgresos(groupId);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("caja-mayor/flujos-consolidado")]
        [ProducesResponseType(typeof(IEnumerable<FlujoCajaConsolidadoResponse>), StatusCodes.Status200OK)]
        public IActionResult FlujoCajaConsolidado([FromBody] FlujoCajaConsolidadoRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.FlujoCajaConsolidado(body);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("caja-mayor/flujos-detallado")]
        [ProducesResponseType(typeof(IEnumerable<FlujoCajaDetalladoResponse>), StatusCodes.Status200OK)]
        public IActionResult FlujoCajaDetallado([FromBody] FlujoCajaDetalladoRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.FlujoCajaDetallado(body);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet("caja-mayor/registro-compras")]
        [ProducesResponseType(typeof(IEnumerable<RegistroComprasListItemResponse>), StatusCodes.Status200OK)]
        public IActionResult ListRegistroCompras([FromQuery] int? periodo, [FromQuery] DateTime? fechaInicial, [FromQuery] DateTime? fechaFinal, [FromQuery] string? tipoComprobante, [FromQuery] int? idProveedor, [FromQuery] int? idTipoCaja, [FromQuery] string? estado, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new RegistroComprasListRequest { Periodo = periodo, FechaInicial = fechaInicial, FechaFinal = fechaFinal, TipoComprobante = tipoComprobante, IdProveedor = idProveedor, IdTipoCaja = idTipoCaja, Estado = estado, Page = page, PageSize = pageSize };
                var (data, totalRows) = _cajaLogic.ListRegistroCompras(request);
                
                // Crear objeto paginado con los parámetros de la petición
                var objPaginated = new { Page = page, PageSize = pageSize };
                return Ok(_ResponseDTO.Success(_ResponseDTO, data, objPaginated, totalRows));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet("caja-mayor/registro-compras/{id}")]
        [ProducesResponseType(typeof(RegistroComprasResponse), StatusCodes.Status200OK)]
        public IActionResult GetRegistroComprasById([FromRoute] int id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var req = new GetRegistroComprasByIdRequest { IdRegistroCompra = id };
                var resp = _cajaLogic.GetRegistroComprasById(req);
                return Ok(_ResponseDTO.Success(_ResponseDTO, resp));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        public class PagarRegistroComprasBody { public DateTime? FechaPago { get; set; } public string? Estado { get; set; } public string? Serie { get; set; } public string? Numero { get; set; } public int? ActualizaIdUsuario { get; set; } }

        [HttpPost("caja-mayor/registro-compras/{id}/pagar")]
        [ProducesResponseType(typeof(RegistroComprasResponse), StatusCodes.Status200OK)]
        public IActionResult PagarRegistroCompras([FromRoute] int id, [FromBody] PagarRegistroComprasBody body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var req = new UpdateRegistroComprasPagoRequest { IdRegistroCompra = id, FechaPago = body.FechaPago, Estado = body.Estado, Serie = body.Serie, Numero = body.Numero, ActualizaIdUsuario = body.ActualizaIdUsuario };
                var resp = _cajaLogic.PagarRegistroCompras(req);
                return Ok(_ResponseDTO.Success(_ResponseDTO, resp));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        public class DeleteRegistroComprasBody { public int IdCajaMayorCierre { get; set; } public int EliminaIdUsuario { get; set; } }

        [HttpDelete("caja-mayor/registro-compras/{id}")]
        [ProducesResponseType(typeof(RegistroComprasResponse), StatusCodes.Status200OK)]
        public IActionResult DeleteRegistroCompras([FromRoute] int id, [FromBody] DeleteRegistroComprasBody body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var req = new DeleteRegistroComprasRequest { IdRegistroCompra = id, IdCajaMayorCierre = body.IdCajaMayorCierre, EliminaIdUsuario = body.EliminaIdUsuario };
                var resp = _cajaLogic.DeleteRegistroCompras(req);
                return Ok(_ResponseDTO.Success(_ResponseDTO, resp));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        public class RecalcularIncrementalBody { public int? DefaultIdTipoCaja { get; set; } public bool? Preview { get; set; } }

        [HttpPost("caja-mayor-cierre/{id}/recalcular-incremental")]
        public IActionResult RecalcularIncremental([FromRoute] int id, [FromBody] RecalcularIncrementalBody body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var req = new RecalcularIncrementalRequest { IdCajaMayorCierre = id, DefaultIdTipoCaja = body?.DefaultIdTipoCaja ?? 1, Preview = body?.Preview ?? false };
                var resp = _cajaLogic.RecalcularIncremental(req);
                return Ok(_ResponseDTO.Success(_ResponseDTO, resp));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet("caja-mayor-cierre/estados")]
        [ProducesResponseType(typeof(IEnumerable<EstadoCierreResponse>), StatusCodes.Status200OK)]
        public IActionResult GetEstadosCierre()
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.GetEstadosCierre();
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet("proveedores/buscar")]
        [ProducesResponseType(typeof(IEnumerable<ProveedorResponse>), StatusCodes.Status200OK)]
        public IActionResult BuscarProveedores([FromQuery] string termino)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var request = new BuscarProveedoresRequest { Termino = termino };
                var response = _cajaLogic.BuscarProveedores(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("proveedores")]
        [ProducesResponseType(typeof(ProveedorResponse), StatusCodes.Status200OK)]
        public IActionResult CrearProveedor([FromBody] CrearProveedorRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.CrearProveedor(body);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost("caja-mayor-cierre/{id}/registro-compras")]
        [ProducesResponseType(typeof(RegistroComprasResponse), StatusCodes.Status200OK)]
        public IActionResult InsertRegistroCompras([FromRoute] int id, [FromBody] InsertRegistroComprasRequest body)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _cajaLogic.InsertRegistroCompras(body);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
    }
}
