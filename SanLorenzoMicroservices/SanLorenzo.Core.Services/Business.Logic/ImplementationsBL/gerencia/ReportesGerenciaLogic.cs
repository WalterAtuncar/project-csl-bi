using Business.Logic.IContractsBL.gerencia;
using Data.Model.Request.atencionmedica;
using Data.Model.Response.gerencia;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnitOfWork;

namespace Business.Logic.ImplementationsBL.gerencia
{
    public class ReportesGerenciaLogic : IReportesGerenciaLogic
    {
        private IUnitOfWork _unitOfWork;
        public ReportesGerenciaLogic(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public bool Delete(Data.Model.Entities.service.service entity)
        {
            throw new NotImplementedException();
        }

        public IEnumerable<GerenciaVentasDetalleResponse> GerenciaVentasAsistencialMS(FiltroBusquedaMSRequest obj)
        {
            return _unitOfWork.IReportesGerencia.GerenciaVentasAsistencialMS(obj);
        }

        public Data.Model.Entities.service.service GetById(string id)
        {
            throw new NotImplementedException();
        }

        public IEnumerable<Data.Model.Entities.service.service> GetList()
        {
            throw new NotImplementedException();
        }

        public int Insert(Data.Model.Entities.service.service entity)
        {
            throw new NotImplementedException();
        }

        public bool Update(Data.Model.Entities.service.service entity)
        {
            throw new NotImplementedException();
        }
    }
}
