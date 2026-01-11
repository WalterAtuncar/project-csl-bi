using Data.Model.Entities.organization;
using Data.Model.Request.atencionmedica;
using Data.Model.Request.gerencia;
using Data.Model.Response.cobranza;
using Data.Model.Response.gerencia;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Business.Logic.IContractsBL.cobranza
{
    public interface ICobranzaLogic
    {
        bool Update(Data.Model.Entities.cobranza.cobranza obj);
        int Insert(Data.Model.Entities.cobranza.cobranza obj);
        IEnumerable<Data.Model.Entities.cobranza.cobranza> GetList();
        Data.Model.Entities.cobranza.cobranza GetById(string id);
        bool Delete(Data.Model.Entities.cobranza.cobranza obj);
        object GetCobranzaDetalleByIdVenta(string id);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMS(FiltroBusquedaMSRequest obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasOcupacionalMS(FiltroBusquedaMSRequest obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasMTCMS(FiltroBusquedaMSRequest obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasFarmaciaMS(FiltroBusquedaMSRequest obj);
        IEnumerable<LiquidacionResponse> ListaLiquidacionNoStatus(LiquidacionFiltrosRequest obj);
        IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_Fac_1(LiquidacionFiltrosRequest obj);
        IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_Fac_2(LiquidacionFiltrosRequest obj);
        IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_Fac_3(LiquidacionFiltrosRequest obj);
        IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_2(LiquidacionFiltrosRequest obj);
        IEnumerable<LiquidacionEmpresaResponse> ListaLiquidacionByEmpresa(LiquidacionFiltrosEmpresaRequest obj);
        IEnumerable<LiquidacionEmpresaList> GetEmpresaPorLiquidacion(LiquidacionFiltrosEmpresaFechas obj);
        IEnumerable<LiquidacionEmpresaResponse> GetLiquidacionCuentasPorCobrar(LiquidacionFiltrosEmpresaFechas obj);
        IEnumerable<LiquidacionesConsolidadoResponse> GetLiqPendFacturarDETALLE(LiquidacionFiltrosEmpresaFechas obj);
        IEnumerable<LiquidacionResponse> GetNoLiquidados(LiquidacionFiltrosEmpresaFechas obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMSSISOL(FiltroBusquedaMSRequest obj);
        IEnumerable<mdlExternoSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO(FiltroBusquedaMSRequestSISOL obj);
        IEnumerable<mdlExternoSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO_ANULADOS(FiltroBusquedaMSRequestSISOL obj);
        object ANULAR_VENTA_MAL_ENVIADA(string id);
        IEnumerable<MarcaResponse> GetCLMarca(string filtro);
        IEnumerable<ProveedorResponse> GetCLProveedor(string filtro);
        IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ENVIO(FiltroBusquedaMSVentas obj);
        IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBALT_ENVIO(FiltroBusquedaMSVentas obj);
        IEnumerable<mdlExternoVentasSanLorenzoMKTGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ENVIO_MKT(FiltroBusquedaMSVentas obj);
        IEnumerable<mdlExternoSanLorenzoGlobEgresos> GerenciaVentasAsistencialMSGLOBAL_EGRESOS(FiltroBusquedaMSEgresos obj);
        IEnumerable<mdlExternoVentasSanLorenzoGlobResponseAll> GerenciaVentasAsistencialAll(FiltroBusquedaMSVentasAll obj);
        IEnumerable<mdlExternoSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO_EGRESOS(FiltroBusquedaMSRequestSISOL2 obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMS_NEW(FiltroBusquedaMSRequest obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMSSISOL_NEW(FiltroBusquedaMSRequest obj);
        IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasOcupacionalMS_NEW(FiltroBusquedaMSRequest obj);
        IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ListaVentas(FiltroBusquedaMSVentas obj);
        IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ListaService(FiltroBusquedaMSVentas obj);
        IEnumerable<IndicadoresLaboratorioResponse1> LaboratorioIndicadores_Cantidad(FiltroBusquedaFechasMSRequest obj);
        IEnumerable<IndicadoresLaboratorioResponse2> LaboratorioIndicadores_MinaEmpresa(FiltroBusquedaFechasMSRequest obj);
        IEnumerable<IndicadoresLaboratorioResponse34> LaboratorioIndicadores_GrupoyExamen(FiltroBusquedaFechasMSRequest obj);
        IEnumerable<IndicadoresLaboratorioResponse5> LaboratorioIndicadores_ServicioDisgregado5(FiltroBusquedaFechasMSRequest obj);
        IEnumerable<IndicadoresLaboratorioResponse6> LaboratorioIndicadores_OrdenesMedicos6(FiltroBusquedaFechasMSRequest obj);
        IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ListaService_Filtros(FiltroBusquedaMSVentas2 obj);

    }
}
