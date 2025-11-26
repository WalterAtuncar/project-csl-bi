using Business.Logic.IContractsBL.caja;
using Data.Model.Request.caja;
using Data.Model.Response.caja;
using System.Collections.Generic;
using UnitOfWork;

namespace Business.Logic.ImplementationsBL.caja
{
    public class CajaLogic : ICajaLogic
    {
        private IUnitOfWork _unitOfWork;

        public CajaLogic(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        // ================================================
        // CAJA MAYOR
        // ================================================

        public CreateCajaMayorResponse CreateCajaMayor(CreateCajaMayorRequest request)
        {
            return _unitOfWork.ICaja.CreateCajaMayor(request);
        }

        public CreateCajaMayorResponse UpdateCajaMayor(UpdateCajaMayorRequest request)
        {
            return _unitOfWork.ICaja.UpdateCajaMayor(request);
        }

        public List<CajaMayorListResponse> GetCajaMayorList(GetCajaMayorListRequest request)
        {
            return _unitOfWork.ICaja.GetCajaMayorList(request);
        }

        public CajaMayorDetalleResponse GetCajaMayorDetalle(int idCajaMayor)
        {
            return _unitOfWork.ICaja.GetCajaMayorDetalle(idCajaMayor);
        }

        public CerrarCajaMayorResponse CerrarCajaMayor(CerrarCajaMayorRequest request)
        {
            return _unitOfWork.ICaja.CerrarCajaMayor(request);
        }

        public DeleteCajaMayorResponse DeleteCajaMayor(DeleteCajaMayorRequest request)
        {
            return _unitOfWork.ICaja.DeleteCajaMayor(request);
        }

        public CreateCajaMayorResponse InsertCajaMayorDetalle(InsertCajaMayorDetalleRequest request)
        {
            return _unitOfWork.ICaja.InsertCajaMayorDetalle(request);
        }

        // ================================================
        // INGRESOS MENSUALES
        // ================================================

        public CreateIngresoMensualResponse CreateIngresoMensual(CreateIngresoMensualRequest request)
        {
            return _unitOfWork.ICaja.CreateIngresoMensual(request);
        }

        public List<IngresoMensualListResponse> GetIngresoMensualList(GetIngresoMensualListRequest request)
        {
            return _unitOfWork.ICaja.GetIngresoMensualList(request);
        }

        public UpdateIngresoMensualResponse UpdateIngresoMensual(UpdateIngresoMensualRequest request)
        {
            return _unitOfWork.ICaja.UpdateIngresoMensual(request);
        }

        public DeleteIngresoMensualResponse DeleteIngresoMensual(DeleteIngresoMensualRequest request)
        {
            return _unitOfWork.ICaja.DeleteIngresoMensual(request);
        }

        // ================================================
        // EGRESOS MENSUALES
        // ================================================

        public CreateEgresoMensualResponse CreateEgresoMensual(CreateEgresoMensualRequest request)
        {
            return _unitOfWork.ICaja.CreateEgresoMensual(request);
        }

        public List<EgresoMensualListResponse> GetEgresoMensualList(GetEgresoMensualListRequest request)
        {
            return _unitOfWork.ICaja.GetEgresoMensualList(request);
        }

        public UpdateEgresoMensualResponse UpdateEgresoMensual(UpdateEgresoMensualRequest request)
        {
            return _unitOfWork.ICaja.UpdateEgresoMensual(request);
        }

        public DeleteEgresoMensualResponse DeleteEgresoMensual(DeleteEgresoMensualRequest request)
        {
            return _unitOfWork.ICaja.DeleteEgresoMensual(request);
        }

        // ================================================
        // TIPOS DE CAJA
        // ================================================

        public CreateTipoCajaResponse CreateTipoCaja(CreateTipoCajaRequest request)
        {
            return _unitOfWork.ICaja.CreateTipoCaja(request);
        }

        public List<TipoCajaResponse> GetTiposCaja(GetTiposCajaRequest request)
        {
            return _unitOfWork.ICaja.GetTiposCaja(request);
        }

        public UpdateTipoCajaResponse UpdateTipoCaja(UpdateTipoCajaRequest request)
        {
            return _unitOfWork.ICaja.UpdateTipoCaja(request);
        }

        public DeleteTipoCajaResponse DeleteTipoCaja(DeleteTipoCajaRequest request)
        {
            return _unitOfWork.ICaja.DeleteTipoCaja(request);
        }

        // ================================================
        // TIPOS DE INGRESO MENSUAL
        // ================================================

        public CreateTipoIngresoMensualResponse CreateTipoIngresoMensual(CreateTipoIngresoMensualRequest request)
        {
            return _unitOfWork.ICaja.CreateTipoIngresoMensual(request);
        }

        public List<TipoIngresoMensualResponse> GetTiposIngresoMensual(GetTiposIngresoMensualRequest request)
        {
            return _unitOfWork.ICaja.GetTiposIngresoMensual(request);
        }

        public UpdateTipoIngresoMensualResponse UpdateTipoIngresoMensual(UpdateTipoIngresoMensualRequest request)
        {
            return _unitOfWork.ICaja.UpdateTipoIngresoMensual(request);
        }

        public DeleteTipoIngresoMensualResponse DeleteTipoIngresoMensual(DeleteTipoIngresoMensualRequest request)
        {
            return _unitOfWork.ICaja.DeleteTipoIngresoMensual(request);
        }

        // ================================================
        // TIPOS DE EGRESO MENSUAL
        // ================================================

        public CreateTipoEgresoMensualResponse CreateTipoEgresoMensual(CreateTipoEgresoMensualRequest request)
        {
            return _unitOfWork.ICaja.CreateTipoEgresoMensual(request);
        }

        public List<TipoEgresoMensualResponse> GetTiposEgresoMensual(GetTiposEgresoMensualRequest request)
        {
            return _unitOfWork.ICaja.GetTiposEgresoMensual(request);
        }

        public UpdateTipoEgresoMensualResponse UpdateTipoEgresoMensual(UpdateTipoEgresoMensualRequest request)
        {
            return _unitOfWork.ICaja.UpdateTipoEgresoMensual(request);
        }

        public DeleteTipoEgresoMensualResponse DeleteTipoEgresoMensual(DeleteTipoEgresoMensualRequest request)
        {
            return _unitOfWork.ICaja.DeleteTipoEgresoMensual(request);
        }

        // ================================================
        // SALDO CAJA
        // ================================================

        public List<SaldoCajaResponse> GetSaldoCaja(GetSaldoCajaRequest request)
        {
            return _unitOfWork.ICaja.GetSaldoCaja(request);
        }
    }
}
