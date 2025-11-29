using Business.Logic.IContractsBL.caja;
using System.Collections.Generic;
using UnitOfWork;
using Data.Model.Request.caja;
using Data.Model.Response.caja;

namespace Business.Logic.ImplementationsBL.caja
{
    public class CajaLogic : ICajaLogic
    {
        private IUnitOfWork _unitOfWork;

        public CajaLogic(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public IEnumerable<CajaMayorCabeceraResponse> GetListCabecera(GetListCabeceraRequest request)
            => _unitOfWork.ICaja.GetListCabecera(request);

        public IEnumerable<CajaMayorCabeceraResponse> GetCierresPorRango(GetCierresPorRangoRequest request)
            => _unitOfWork.ICaja.GetCierresPorRango(request);

        public CajaMayorCabeceraResponse GetCabecera(GetCabeceraRequest request)
            => _unitOfWork.ICaja.GetCabecera(request);

        public CajaMayorCabeceraResponse CierreCreateUpdate(CierreCreateUpdateRequest request)
            => _unitOfWork.ICaja.CierreCreateUpdate(request);

        public IEnumerable<CajaMayorResumenTipoResponse> ResumenTipos(ResumenTiposRequest request)
            => _unitOfWork.ICaja.ResumenTipos(request);

        public IEnumerable<CajaMayorResumenMensualTipoResponse> ResumenMensualPorTipo(ResumenMensualPorTipoRequest request)
            => _unitOfWork.ICaja.ResumenMensualPorTipo(request);

        public CajaMayorTotalesResponse RecalcularTotales(RecalcularTotalesRequest request)
            => _unitOfWork.ICaja.RecalcularTotales(request);

        public CajaMayorResumenTipoResponse UpdateSaldoInicialTipoCaja(UpdateSaldoInicialTipoCajaRequest request)
            => _unitOfWork.ICaja.UpdateSaldoInicialTipoCaja(request);

        public CajaMayorCabeceraResponse Cerrar(CerrarRequest request)
            => _unitOfWork.ICaja.Cerrar(request);

        public CajaMayorCabeceraResponse Confirmar(ConfirmarRequest request)
            => _unitOfWork.ICaja.Confirmar(request);

        public IEnumerable<CajaMayorMovimientoDbResponse> GenerarEgresosDesdeVentas(GenerarEgresosDesdeVentasRequest request)
            => _unitOfWork.ICaja.GenerarEgresosDesdeVentas(request);

        public IEnumerable<CajaMayorMovimientoDbResponse> GenerarIngresosDesdeCobranzas(GenerarIngresosDesdeCobranzasRequest request)
            => _unitOfWork.ICaja.GenerarIngresosDesdeCobranzas(request);

        public IEnumerable<CajaMayorMovimientoResponse> GetMovimientos(GetMovimientosRequest request)
            => _unitOfWork.ICaja.GetMovimientos(request);

        public CajaMayorMovimientoDbResponse InsertMovimientoManual(InsertMovimientoManualRequest request)
            => _unitOfWork.ICaja.InsertMovimientoManual(request);

        public IEnumerable<TipoCajaResponse> GetTiposCaja(bool includeInactive)
            => _unitOfWork.ICaja.GetTiposCaja(includeInactive);

        public IEnumerable<EstadoCierreResponse> GetEstadosCierre()
            => new List<EstadoCierreResponse>
            {
                new EstadoCierreResponse { IdEstado = 1, Nombre = "Abierta" },
                new EstadoCierreResponse { IdEstado = 2, Nombre = "Cerrada" },
                new EstadoCierreResponse { IdEstado = 3, Nombre = "Confirmada" }
            };

        public CajaMayorCierreExistsResponse CajaMayorCierreExists(CheckCierreExistsRequest request)
            => _unitOfWork.ICaja.CajaMayorCierreExists(request);

        public DeleteCajaMayorCierreResponse DeleteCajaMayorCierrePhysical(DeleteCierreRequest request)
            => _unitOfWork.ICaja.DeleteCajaMayorCierrePhysical(request);

        public IEnumerable<ProveedorResponse> BuscarProveedores(BuscarProveedoresRequest request)
            => _unitOfWork.ICaja.BuscarProveedores(request);

        public ProveedorResponse CrearProveedor(CrearProveedorRequest request)
            => _unitOfWork.ICaja.CrearProveedor(request);

        public RegistroComprasResponse InsertRegistroCompras(InsertRegistroComprasRequest request)
            => _unitOfWork.ICaja.InsertRegistroCompras(request);
    }
}
