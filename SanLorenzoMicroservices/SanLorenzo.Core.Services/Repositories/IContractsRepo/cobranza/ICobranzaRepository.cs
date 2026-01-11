using Data.Model.Request.atencionmedica;
using Data.Model.Request.gerencia;
using Data.Model.Response.cobranza;
using Data.Model.Response.gerencia;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Repositories.IContractsRepo.cobranza
{
    public interface ICobranzaRepository : IRepository<Data.Model.Entities.cobranza.cobranza>
    {
        object ANULAR_VENTA_MAL_ENVIADA(string id);
        IEnumerable<mdlExternoVentasSanLorenzoGlobResponseAll> GerenciaVentasAsistencialAll(FiltroBusquedaMSVentasAll obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMS(FiltroBusquedaMSRequest obj);
        IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBALT_ENVIO(FiltroBusquedaMSVentas obj);
        IEnumerable<mdlExternoSanLorenzoGlobEgresos> GerenciaVentasAsistencialMSGLOBAL_EGRESOS(FiltroBusquedaMSEgresos obj);
        IEnumerable<mdlExternoVentasSanLorenzoMKTGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ENVIO_MKT(FiltroBusquedaMSVentas obj);
        IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ListaService(FiltroBusquedaMSVentas obj);
        IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ListaService_Filtros(FiltroBusquedaMSVentas2 obj);
        IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ListaVentas(FiltroBusquedaMSVentas obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMSSISOL(FiltroBusquedaMSRequest obj);
        IEnumerable<mdlExternoSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO(FiltroBusquedaMSRequestSISOL obj);
        IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO(FiltroBusquedaMSVentas obj);
        IEnumerable<mdlExternoSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO_ANULADOS(FiltroBusquedaMSRequestSISOL obj);
        IEnumerable<mdlExternoSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO_EGRESOS(FiltroBusquedaMSRequestSISOL2 obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMSSISOL_NEW(FiltroBusquedaMSRequest obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMS_NEW(FiltroBusquedaMSRequest obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasFarmaciaMS(FiltroBusquedaMSRequest obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasMTCMS(FiltroBusquedaMSRequest obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasOcupacionalMS(FiltroBusquedaMSRequest obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasOcupacionalMS_NEW(FiltroBusquedaMSRequest obj);
        IEnumerable<MarcaResponse> GetCLMarca(string filtro);
        IEnumerable<ProveedorResponse> GetCLProveedor(string filtro);
        IEnumerable<cobranzaDetalleResponse> GetCobranzaDetalleByIdVenta(string id);
        IEnumerable<LiquidacionEmpresaList> GetEmpresaPorLiquidacion(LiquidacionFiltrosEmpresaFechas obj);
        IEnumerable<LiquidacionesConsolidadoResponse> GetLiqPendFacturarDETALLE(LiquidacionFiltrosEmpresaFechas obj);
        IEnumerable<LiquidacionEmpresaResponse> GetLiquidacionCuentasPorCobrar(LiquidacionFiltrosEmpresaFechas obj);
        IEnumerable<LiquidacionResponse> GetNoLiquidados(LiquidacionFiltrosEmpresaFechas obj);
        IEnumerable<IndicadoresLaboratorioResponse1> LaboratorioIndicadores_Cantidad(FiltroBusquedaFechasMSRequest obj);
        IEnumerable<IndicadoresLaboratorioResponse34> LaboratorioIndicadores_GrupoyExamen(FiltroBusquedaFechasMSRequest obj);
        IEnumerable<IndicadoresLaboratorioResponse2> LaboratorioIndicadores_MinaEmpresa(FiltroBusquedaFechasMSRequest obj);
        IEnumerable<IndicadoresLaboratorioResponse6> LaboratorioIndicadores_OrdenesMedicos6(FiltroBusquedaFechasMSRequest obj);
        IEnumerable<IndicadoresLaboratorioResponse5> LaboratorioIndicadores_ServicioDisgregado5(FiltroBusquedaFechasMSRequest obj);
        IEnumerable<LiquidacionEmpresaResponse> ListaLiquidacionByEmpresa(LiquidacionFiltrosEmpresaRequest obj);
        IEnumerable<LiquidacionResponse> ListaLiquidacionNoStatus(LiquidacionFiltrosRequest obj);
        IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_2(LiquidacionFiltrosRequest obj);
        IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_Fac_1(LiquidacionFiltrosRequest obj);
        IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_Fac_2(LiquidacionFiltrosRequest obj);
        IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_Fac_3(LiquidacionFiltrosRequest obj);

    }
}
