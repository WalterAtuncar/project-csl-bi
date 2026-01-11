using System.Collections.Generic;
using Data.Model.Request.caja;
using Data.Model.Response.caja;


namespace Business.Logic.IContractsBL.caja
{
    public interface ICajaLogic
    {
        IEnumerable<CajaMayorCabeceraResponse> GetListCabecera(GetListCabeceraRequest request);
        IEnumerable<CajaMayorCabeceraResponse> GetCierresPorRango(GetCierresPorRangoRequest request);
        CajaMayorCabeceraResponse GetCabecera(GetCabeceraRequest request);
        CajaMayorCabeceraResponse CierreCreateUpdate(CierreCreateUpdateRequest request);
        IEnumerable<CajaMayorResumenTipoResponse> ResumenTipos(ResumenTiposRequest request);
        IEnumerable<CajaMayorResumenMensualTipoResponse> ResumenMensualPorTipo(ResumenMensualPorTipoRequest request);
        CajaMayorTotalesResponse RecalcularTotales(RecalcularTotalesRequest request);
        CajaMayorResumenTipoResponse UpdateSaldoInicialTipoCaja(UpdateSaldoInicialTipoCajaRequest request);
        CajaMayorCabeceraResponse Cerrar(CerrarRequest request);
        CajaMayorCabeceraResponse Confirmar(ConfirmarRequest request);
        IEnumerable<CajaMayorMovimientoDbResponse> GenerarEgresosDesdeVentas(GenerarEgresosDesdeVentasRequest request);
        IEnumerable<CajaMayorMovimientoDbResponse> GenerarIngresosDesdeCobranzas(GenerarIngresosDesdeCobranzasRequest request);
        IEnumerable<CajaMayorMovimientoResponse> GetMovimientos(GetMovimientosRequest request);
        CajaMayorMovimientoDbResponse InsertMovimientoManual(InsertMovimientoManualRequest request);
        IEnumerable<TipoCajaResponse> GetTiposCaja(bool includeInactive);
        IEnumerable<EstadoCierreResponse> GetEstadosCierre();
        CajaMayorCierreExistsResponse CajaMayorCierreExists(CheckCierreExistsRequest request);
        DeleteCajaMayorCierreResponse DeleteCajaMayorCierrePhysical(DeleteCierreRequest request);
        IEnumerable<ProveedorResponse> BuscarProveedores(BuscarProveedoresRequest request);
        ProveedorResponse CrearProveedor(CrearProveedorRequest request);
        RegistroComprasResponse InsertRegistroCompras(InsertRegistroComprasRequest request);
        RegistroComprasResponse GetRegistroComprasById(GetRegistroComprasByIdRequest request);
        RegistroComprasResponse PagarRegistroCompras(UpdateRegistroComprasPagoRequest request);
        RegistroComprasResponse DeleteRegistroCompras(DeleteRegistroComprasRequest request);
        IEnumerable<CategoriaEgresoResponse> GetCategoriaEgresos(int groupId);
    IEnumerable<FlujoCajaConsolidadoResponse> FlujoCajaConsolidado(FlujoCajaConsolidadoRequest request);
    IEnumerable<FlujoCajaDetalladoResponse> FlujoCajaDetallado(FlujoCajaDetalladoRequest request);
        (IEnumerable<RegistroComprasListItemResponse> data, int totalRows) ListRegistroCompras(RegistroComprasListRequest request);
        object RecalcularIncremental(RecalcularIncrementalRequest request);
        IEnumerable<Data.Model.Response.gerencia.PagoMedicoCabecera> PagoMedicoPorConsultorio(Data.Model.Request.gerencia.PagoMedicoPorConsultorioRequest obj);
    }
}
