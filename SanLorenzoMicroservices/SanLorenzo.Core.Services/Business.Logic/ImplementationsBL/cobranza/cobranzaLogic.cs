using Business.Logic.IContractsBL.cobranza;
using Data.Model.Request.atencionmedica;
using Data.Model.Request.gerencia;
using Data.Model.Response.cobranza;
using Data.Model.Response.gerencia;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnitOfWork;

namespace Business.Logic.ImplementationsBL.cobranza
{
    public class cobranzaLogic : ICobranzaLogic
    {
        private IUnitOfWork _unitOfWork;

        public cobranzaLogic(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public Data.Model.Entities.cobranza.cobranza GetById(string id)
        {
            return _unitOfWork.ICobranza.GetById(id);
        }        

        public IEnumerable<Data.Model.Entities.cobranza.cobranza> GetList()
        {
            return _unitOfWork.ICobranza.GetList();
        }

        public int Insert(Data.Model.Entities.cobranza.cobranza obj)
        {
            return _unitOfWork.ICobranza.Insert(obj);
        }

        public bool Update(Data.Model.Entities.cobranza.cobranza obj)
        {
            return _unitOfWork.ICobranza.Update(obj);
        }

        public bool Delete(Data.Model.Entities.cobranza.cobranza obj)
        {
            return _unitOfWork.ICobranza.Delete(obj);
        }

        public IEnumerable<cobranzaDetalleResponse> GetCobranzaDetalleByIdVenta(string id)
        {
            return _unitOfWork.ICobranza.GetCobranzaDetalleByIdVenta(id);
        }

        object ICobranzaLogic.GetCobranzaDetalleByIdVenta(string id)
        {
            throw new NotImplementedException();
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMS(FiltroBusquedaMSRequest obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMS(obj);
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasOcupacionalMS(FiltroBusquedaMSRequest obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasOcupacionalMS(obj);
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasMTCMS(FiltroBusquedaMSRequest obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasMTCMS(obj);
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasFarmaciaMS(FiltroBusquedaMSRequest obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasFarmaciaMS(obj);
        }

        public IEnumerable<LiquidacionResponse> ListaLiquidacionNoStatus(LiquidacionFiltrosRequest obj)
        {
            return _unitOfWork.ICobranza.ListaLiquidacionNoStatus(obj);
        }

        public IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_Fac_1(LiquidacionFiltrosRequest obj)
        {
            return _unitOfWork.ICobranza.ListaLiquidacion_Liq_Fac_1(obj);
        }

        public IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_Fac_2(LiquidacionFiltrosRequest obj)
        {
            return _unitOfWork.ICobranza.ListaLiquidacion_Liq_Fac_2(obj);
        }

        public IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_Fac_3(LiquidacionFiltrosRequest obj)
        {
            return _unitOfWork.ICobranza.ListaLiquidacion_Liq_Fac_3(obj);
        }

        public IEnumerable<LiquidacionResponse> ListaLiquidacion_Liq_2(LiquidacionFiltrosRequest obj)
        {
            return _unitOfWork.ICobranza.ListaLiquidacion_Liq_2(obj);
        }

        public IEnumerable<LiquidacionEmpresaResponse> ListaLiquidacionByEmpresa(LiquidacionFiltrosEmpresaRequest obj)
        {
            return _unitOfWork.ICobranza.ListaLiquidacionByEmpresa(obj);
        }

        public IEnumerable<LiquidacionEmpresaList> GetEmpresaPorLiquidacion(LiquidacionFiltrosEmpresaFechas obj)
        {
            return _unitOfWork.ICobranza.GetEmpresaPorLiquidacion(obj);
        }

        public IEnumerable<LiquidacionEmpresaResponse> GetLiquidacionCuentasPorCobrar(LiquidacionFiltrosEmpresaFechas obj)
        {
            return _unitOfWork.ICobranza.GetLiquidacionCuentasPorCobrar(obj);
        }

        public IEnumerable<LiquidacionesConsolidadoResponse> GetLiqPendFacturarDETALLE(LiquidacionFiltrosEmpresaFechas obj)
        {
            return _unitOfWork.ICobranza.GetLiqPendFacturarDETALLE(obj);
        }

        public IEnumerable<LiquidacionResponse> GetNoLiquidados(LiquidacionFiltrosEmpresaFechas obj)
        {
            return _unitOfWork.ICobranza.GetNoLiquidados(obj);
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMSSISOL(FiltroBusquedaMSRequest obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMSSISOL(obj);
        }

        public IEnumerable<mdlExternoSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO(FiltroBusquedaMSRequestSISOL obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMSSISOL_ENVIO(obj);
        }

        public IEnumerable<mdlExternoSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO_ANULADOS(FiltroBusquedaMSRequestSISOL obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMSSISOL_ENVIO_ANULADOS(obj);
        }

        public object ANULAR_VENTA_MAL_ENVIADA(string id)
        {
            return _unitOfWork.ICobranza.ANULAR_VENTA_MAL_ENVIADA(id);
        }

        public IEnumerable<MarcaResponse> GetCLMarca(string filtro)
        {
            return _unitOfWork.ICobranza.GetCLMarca(filtro);
        }

        public IEnumerable<ProveedorResponse> GetCLProveedor(string filtro)
        {
            return _unitOfWork.ICobranza.GetCLProveedor(filtro);
        }

        public IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ENVIO(FiltroBusquedaMSVentas obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMSSISOL_ENVIO(obj);
        }

        public IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBALT_ENVIO(FiltroBusquedaMSVentas obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMSGLOBALT_ENVIO(obj);
        }

        public IEnumerable<mdlExternoVentasSanLorenzoMKTGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ENVIO_MKT(FiltroBusquedaMSVentas obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMSGLOBAL_ENVIO_MKT(obj);
        }

        public IEnumerable<mdlExternoSanLorenzoGlobEgresos> GerenciaVentasAsistencialMSGLOBAL_EGRESOS(FiltroBusquedaMSEgresos obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMSGLOBAL_EGRESOS(obj);
        }

        public IEnumerable<mdlExternoVentasSanLorenzoGlobResponseAll> GerenciaVentasAsistencialAll(FiltroBusquedaMSVentasAll obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialAll(obj);
        }

        public IEnumerable<mdlExternoSanLorenzoGlobResponse> GerenciaVentasAsistencialMSSISOL_ENVIO_EGRESOS(FiltroBusquedaMSRequestSISOL2 obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMSSISOL_ENVIO_EGRESOS(obj);

        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMS_NEW(FiltroBusquedaMSRequest obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMS_NEW(obj);
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMSSISOL_NEW(FiltroBusquedaMSRequest obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMSSISOL_NEW(obj);
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasOcupacionalMS_NEW(FiltroBusquedaMSRequest obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasOcupacionalMS_NEW(obj);
        }

        public IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ListaVentas(FiltroBusquedaMSVentas obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMSGLOBAL_ListaVentas(obj);
        }

        public IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ListaService(FiltroBusquedaMSVentas obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMSGLOBAL_ListaService(obj);
        }

        public IEnumerable<IndicadoresLaboratorioResponse1> LaboratorioIndicadores_Cantidad(FiltroBusquedaFechasMSRequest obj)
        {
            return _unitOfWork.ICobranza.LaboratorioIndicadores_Cantidad(obj);
        }

        public IEnumerable<IndicadoresLaboratorioResponse2> LaboratorioIndicadores_MinaEmpresa(FiltroBusquedaFechasMSRequest obj)
        {
            return _unitOfWork.ICobranza.LaboratorioIndicadores_MinaEmpresa(obj);
        }

        public IEnumerable<IndicadoresLaboratorioResponse34> LaboratorioIndicadores_GrupoyExamen(FiltroBusquedaFechasMSRequest obj)
        {
            return _unitOfWork.ICobranza.LaboratorioIndicadores_GrupoyExamen(obj);
        }

        public IEnumerable<IndicadoresLaboratorioResponse5> LaboratorioIndicadores_ServicioDisgregado5(FiltroBusquedaFechasMSRequest obj)
        {
            return _unitOfWork.ICobranza.LaboratorioIndicadores_ServicioDisgregado5(obj);
        }

        public IEnumerable<IndicadoresLaboratorioResponse6> LaboratorioIndicadores_OrdenesMedicos6(FiltroBusquedaFechasMSRequest obj)
        {
            return _unitOfWork.ICobranza.LaboratorioIndicadores_OrdenesMedicos6(obj);
        }

        public IEnumerable<mdlExternoVentasSanLorenzoGlobResponse> GerenciaVentasAsistencialMSGLOBAL_ListaService_Filtros(FiltroBusquedaMSVentas2 obj)
        {
            return _unitOfWork.ICobranza.GerenciaVentasAsistencialMSGLOBAL_ListaService_Filtros(obj);
        }
    }
}
