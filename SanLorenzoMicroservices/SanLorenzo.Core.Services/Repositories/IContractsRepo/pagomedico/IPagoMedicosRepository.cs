using Data.Model.Request.pagomedico;
using Data.Model.Response.pagomedico;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Repositories.IContractsRepo.pagomedico
{
    public interface IPagoMedicosRepository : IRepository<GenerarPagoMedicoRequest>
    {
        GenerarPagoMedicoResponse GenerarPagoMedicoCompleto(GenerarPagoMedicoRequest request);
        EliminarPagoMedicoResponse EliminarPagoMedicoCompleto(EliminarPagoMedicoRequest request);
        GetPagoMedicoCompletoByIdResponse GetPagoMedicoCompletoById(GetPagoMedicoByIdRequest request);
        List<ListarPagosMedicosResponse> ListarPagosMedicos(ListarPagosMedicosRequest request);
        PagoMedicoCompletoResponse PagoMedicoCompleto(PagoMedicoCompletoRequest request);
        OrganizationInfoResponse GetOrganizationInfo();
    }
} 