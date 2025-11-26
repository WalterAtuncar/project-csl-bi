using Business.Logic.IContractsBL.especialidades;
using Data.Model.Request.especialidades;
using Data.Model.Response.especialidades;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnitOfWork;

namespace Business.Logic.ImplementationsBL.especialidades
{
    public class EspecialidadesLogic : IEspecialidadesLogic
    {
        private IUnitOfWork _unitOfWork;

        public EspecialidadesLogic(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public CreateEspecialidadResponse CreateEspecialidad(CreateEspecialidadRequest request)
        {
            return _unitOfWork.IEspecialidades.CreateEspecialidad(request);
        }

        public List<EspecialidadResponse> GetAllEspecialidades(bool includeDeleted)
        {
            return _unitOfWork.IEspecialidades.GetAllEspecialidades(includeDeleted);
        }

        public GetEspecialidadByIdResponse GetEspecialidadById(int id)
        {
            return _unitOfWork.IEspecialidades.GetEspecialidadById(id);
        }

        public UpdateEspecialidadResponse UpdateEspecialidad(int id, UpdateEspecialidadRequest request)
        {
            return _unitOfWork.IEspecialidades.UpdateEspecialidad(id, request);
        }

        public DeleteEspecialidadResponse DeleteEspecialidad(int id, int userId)
        {
            return _unitOfWork.IEspecialidades.DeleteEspecialidad(id, userId);
        }

        public UpdatePorcentajeResponse UpdatePorcentajePago(int id, UpdatePorcentajeRequest request)
        {
            return _unitOfWork.IEspecialidades.UpdatePorcentajePago(id, request);
        }

        public List<EspecialidadResponse> SearchEspecialidades(SearchEspecialidadesRequest request)
        {
            return _unitOfWork.IEspecialidades.SearchEspecialidades(request);
        }

        public List<ProfesionalDto> BuscarProfesionales(BuscarProfesionalesRequest request)
        {
            return _unitOfWork.IEspecialidades.BuscarProfesionales(request);
        }
    }
} 