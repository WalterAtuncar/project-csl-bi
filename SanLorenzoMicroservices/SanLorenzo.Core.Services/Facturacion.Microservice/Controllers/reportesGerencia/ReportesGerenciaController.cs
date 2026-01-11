using Business.Logic.IContractsBL.cobranza;
using Business.Logic.IContractsBL.gerencia;
using Data.Model;
using Data.Model.Entities.cobranza;
using Data.Model.Entities.organization;
using Data.Model.Entities.service;
using Data.Model.Request.atencionmedica;
using Data.Model.Request.gerencia;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Facturacion.Microservice.Controllers.reportesGerencia
{
    [Route("api/reportesGerencia")]
    [ApiController]
    public class ReportesGerenciaController : Controller
    {

        private ICobranzaLogic _gerencia;
        public ResponseDTO _ResponseDTO;
        public ReportesGerenciaController(ICobranzaLogic gerencia)
        {
            _gerencia = gerencia;
        }


        [HttpPost]
        [Route("GerenciaVentasAsistencialMS")]
        public IActionResult GerenciaVentasAsistencialMS([FromBody] FiltroBusquedaMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMS(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasOcupacionalMS")]
        public IActionResult GerenciaVentasOcupacionalMS([FromBody] FiltroBusquedaMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasOcupacionalMS(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasMTCMS")]
        public IActionResult GerenciaVentasMTCMS([FromBody] FiltroBusquedaMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasMTCMS(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasFarmaciaMS")]
        public IActionResult GerenciaVentasFarmaciaMS([FromBody] FiltroBusquedaMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasFarmaciaMS(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ListaLiquidacionNoStatus")]
        public IActionResult ListaLiquidacionNoStatus([FromBody] LiquidacionFiltrosRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.ListaLiquidacionNoStatus(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ListaLiquidacion_Liq_Fac_1")]
        public IActionResult ListaLiquidacion_Liq_Fac_1([FromBody] LiquidacionFiltrosRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.ListaLiquidacion_Liq_Fac_1(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ListaLiquidacion_Liq_Fac_2")]
        public IActionResult ListaLiquidacion_Liq_Fac_2([FromBody] LiquidacionFiltrosRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.ListaLiquidacion_Liq_Fac_2(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ListaLiquidacion_Liq_Fac_3")]
        public IActionResult ListaLiquidacion_Liq_Fac_3([FromBody] LiquidacionFiltrosRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.ListaLiquidacion_Liq_Fac_3(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ListaLiquidacion_Liq_2")]
        public IActionResult ListaLiquidacion_Liq_2([FromBody] LiquidacionFiltrosRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.ListaLiquidacion_Liq_2(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ListaLiquidacionByEmpresa")]
        public IActionResult ListaLiquidacionByEmpresa([FromBody] LiquidacionFiltrosEmpresaRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.ListaLiquidacionByEmpresa(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetEmpresaPorLiquidacion")]
        public IActionResult GetEmpresaPorLiquidacion([FromBody] LiquidacionFiltrosEmpresaFechas obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GetEmpresaPorLiquidacion(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetLiquidacionCuentasPorCobrar")]
        public IActionResult GetLiquidacionCuentasPorCobrar([FromBody] LiquidacionFiltrosEmpresaFechas obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GetLiquidacionCuentasPorCobrar(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetLiqPendFacturarDETALLE")]
        public IActionResult GetLiqPendFacturarDETALLE([FromBody] LiquidacionFiltrosEmpresaFechas obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GetLiqPendFacturarDETALLE(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetNoLiquidados")]
        public IActionResult GetNoLiquidados([FromBody] LiquidacionFiltrosEmpresaFechas obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GetNoLiquidados(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialMSSISOL")]
        public IActionResult GerenciaVentasAsistencialMSSISOL([FromBody] FiltroBusquedaMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMSSISOL(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
        [HttpPost]
        [Route("GerenciaVentasAsistencialMSSISOL_ENVIO")]
        public IActionResult GerenciaVentasAsistencialMSSISOL_ENVIO([FromBody] FiltroBusquedaMSRequestSISOL obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMSSISOL_ENVIO(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialMSSISOL_ENVIO_ANULADOS")]
        public IActionResult GerenciaVentasAsistencialMSSISOL_ENVIO_ANULADOS([FromBody] FiltroBusquedaMSRequestSISOL obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMSSISOL_ENVIO_ANULADOS(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        

        [HttpGet]
        [Route("ANULAR_VENTA_MAL_ENVIADA/{id}")]
        public IActionResult GetServicePersonData(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.ANULAR_VENTA_MAL_ENVIADA(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetCLMarca")]
        public IActionResult GetCLMarca([FromBody] string filtro)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GetCLMarca(filtro)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetCLProveedor")]
        public IActionResult GetCLProveedor([FromBody] string filtro)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GetCLProveedor(filtro)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }


        [HttpPost]
        [Route("GerenciaVentasAsistencialMSGLOBAL_ENVIO")]
        public IActionResult GerenciaVentasAsistencialMSGLOBAL_ENVIO([FromBody] FiltroBusquedaMSVentas obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMSGLOBAL_ENVIO(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialMSGLOBALT_ENVIO")]
        public IActionResult GerenciaVentasAsistencialMSGLOBALT_ENVIO([FromBody] FiltroBusquedaMSVentas obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMSGLOBALT_ENVIO(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialMSGLOBAL_ENVIO_MKT")]
        public IActionResult GerenciaVentasAsistencialMSGLOBAL_ENVIO_MKT([FromBody] FiltroBusquedaMSVentas obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMSGLOBAL_ENVIO_MKT(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialMSGLOBAL_EGRESOS")]
        public IActionResult GerenciaVentasAsistencialMSGLOBAL_EGRESOS([FromBody] FiltroBusquedaMSEgresos obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMSGLOBAL_EGRESOS(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialAll")]
        public IActionResult GerenciaVentasAsistencialAll([FromBody] FiltroBusquedaMSVentasAll obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialAll(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialMSSISOL_ENVIO_EGRESOS")]
        public IActionResult GerenciaVentasAsistencialMSSISOL_ENVIO_EGRESOS([FromBody] FiltroBusquedaMSRequestSISOL2 obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMSSISOL_ENVIO_EGRESOS(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialMS_NEW")]
        public IActionResult GerenciaVentasAsistencialMS_NEW([FromBody] FiltroBusquedaMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMS_NEW(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialMSSISOL_NEW")]
        public IActionResult GerenciaVentasAsistencialMSSISOL_NEW([FromBody] FiltroBusquedaMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMSSISOL_NEW(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasOcupacionalMS_NEW")]
        public IActionResult GerenciaVentasOcupacionalMS_NEW([FromBody] FiltroBusquedaMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasOcupacionalMS_NEW(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialMSGLOBAL_ListaVentas")]
        public IActionResult GerenciaVentasAsistencialMSGLOBAL_ListaVentas([FromBody] FiltroBusquedaMSVentas obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMSGLOBAL_ListaVentas(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialMSGLOBAL_ListaService")]
        public IActionResult GerenciaVentasAsistencialMSGLOBAL_ListaService([FromBody] FiltroBusquedaMSVentas obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMSGLOBAL_ListaService(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GerenciaVentasAsistencialMSGLOBAL_ListaService_Filtros")]
        public IActionResult GerenciaVentasAsistencialMSGLOBAL_ListaService_Filtros([FromBody] FiltroBusquedaMSVentas2 obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.GerenciaVentasAsistencialMSGLOBAL_ListaService_Filtros(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }


        [HttpPost]
        [Route("LaboratorioIndicadores_Cantidad")]
        public IActionResult LaboratorioIndicadores_Cantidad([FromBody] FiltroBusquedaFechasMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.LaboratorioIndicadores_Cantidad(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("LaboratorioIndicadores_MinaEmpresa")]
        public IActionResult LaboratorioIndicadores_MinaEmpresa([FromBody] FiltroBusquedaFechasMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.LaboratorioIndicadores_MinaEmpresa(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("LaboratorioIndicadores_GrupoyExamen")]
        public IActionResult LaboratorioIndicadores_GrupoyExamen([FromBody] FiltroBusquedaFechasMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.LaboratorioIndicadores_GrupoyExamen(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("LaboratorioIndicadores_ServicioDisgregado5")]
        public IActionResult LaboratorioIndicadores_ServicioDisgregado5([FromBody] FiltroBusquedaFechasMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.LaboratorioIndicadores_ServicioDisgregado5(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("LaboratorioIndicadores_OrdenesMedicos6")]
        public IActionResult LaboratorioIndicadores_OrdenesMedicos6([FromBody] FiltroBusquedaFechasMSRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _gerencia.LaboratorioIndicadores_OrdenesMedicos6(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }



    }
}
