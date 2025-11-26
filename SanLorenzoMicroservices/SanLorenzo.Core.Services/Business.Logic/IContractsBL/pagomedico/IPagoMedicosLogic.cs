using Data.Model.Request.pagomedico;
using Data.Model.Response.pagomedico;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Business.Logic.IContractsBL.pagomedico
{
    public interface IPagoMedicosLogic
    {
        GenerarPagoMedicoResponse GenerarPagoMedicoCompleto(GenerarPagoMedicoRequest request);
        EliminarPagoMedicoResponse EliminarPagoMedicoCompleto(EliminarPagoMedicoRequest request);
        GetPagoMedicoCompletoByIdResponse GetPagoMedicoCompletoById(GetPagoMedicoByIdRequest request);
        List<ListarPagosMedicosResponse> ListarPagosMedicos(ListarPagosMedicosRequest request);
        PagoMedicoCompletoResponse PagoMedicoCompleto(PagoMedicoCompletoRequest request);
        OrganizationInfoResponse GetOrganizationInfo();
    }
} 