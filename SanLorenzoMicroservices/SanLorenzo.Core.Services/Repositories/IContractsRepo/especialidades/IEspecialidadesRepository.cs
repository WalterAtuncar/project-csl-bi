using Data.Model.Request.especialidades;
using Data.Model.Response.especialidades;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Repositories.IContractsRepo.especialidades
{
    public interface IEspecialidadesRepository : IRepository<CreateEspecialidadRequest>
    {
        CreateEspecialidadResponse CreateEspecialidad(CreateEspecialidadRequest request);
        List<EspecialidadResponse> GetAllEspecialidades(bool includeDeleted);
        GetEspecialidadByIdResponse GetEspecialidadById(int id);
        UpdateEspecialidadResponse UpdateEspecialidad(int id, UpdateEspecialidadRequest request);
        DeleteEspecialidadResponse DeleteEspecialidad(int id, int userId);
        UpdatePorcentajeResponse UpdatePorcentajePago(int id, UpdatePorcentajeRequest request);
        List<EspecialidadResponse> SearchEspecialidades(SearchEspecialidadesRequest request);
        List<ProfesionalDto> BuscarProfesionales(BuscarProfesionalesRequest request);
    }
} 