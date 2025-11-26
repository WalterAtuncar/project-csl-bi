using Business.Logic.IContractsBL.pagomedico;
using Data.Model.Request.pagomedico;
using Data.Model.Response.pagomedico;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnitOfWork;

namespace Business.Logic.ImplementationsBL.pagomedico
{
    public class PagoMedicosLogic : IPagoMedicosLogic
    {
        private IUnitOfWork _unitOfWork;

        public PagoMedicosLogic(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public GenerarPagoMedicoResponse GenerarPagoMedicoCompleto(GenerarPagoMedicoRequest request)
        {
            return _unitOfWork.IPagoMedicos.GenerarPagoMedicoCompleto(request);
        }

        public EliminarPagoMedicoResponse EliminarPagoMedicoCompleto(EliminarPagoMedicoRequest request)
        {
            return _unitOfWork.IPagoMedicos.EliminarPagoMedicoCompleto(request);
        }

        public GetPagoMedicoCompletoByIdResponse GetPagoMedicoCompletoById(GetPagoMedicoByIdRequest request)
        {
            return _unitOfWork.IPagoMedicos.GetPagoMedicoCompletoById(request);
        }

        public List<ListarPagosMedicosResponse> ListarPagosMedicos(ListarPagosMedicosRequest request)
        {
            return _unitOfWork.IPagoMedicos.ListarPagosMedicos(request);
        }

        public PagoMedicoCompletoResponse PagoMedicoCompleto(PagoMedicoCompletoRequest request)
        {
            return _unitOfWork.IPagoMedicos.PagoMedicoCompleto(request);
        }

        public OrganizationInfoResponse GetOrganizationInfo()
        {
            return _unitOfWork.IPagoMedicos.GetOrganizationInfo();
        }
    }
} 