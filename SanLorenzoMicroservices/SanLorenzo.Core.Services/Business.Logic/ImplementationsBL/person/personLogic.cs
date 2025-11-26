using Business.Logic.IContractsBL.person;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnitOfWork;

namespace Business.Logic.ImplementationsBL.person
{
    public class personLogic : IPersonLogic
    {
        private IUnitOfWork _unitOfWork;

        public personLogic(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }       

        public Data.Model.Entities.person.person GetById(string id)
        {
            return _unitOfWork.IPerson.GetById(id);
        }

        public IEnumerable<Data.Model.Entities.person.person> GetList()
        {
            return _unitOfWork.IPerson.GetList();
        }

        public int Insert(Data.Model.Entities.person.person obj)
        {
            return _unitOfWork.IPerson.Insert(obj);
        }

        public bool Update(Data.Model.Entities.person.person obj)
        {
            return _unitOfWork.IPerson.Update(obj);
        }

        public bool Delete(Data.Model.Entities.person.person obj)
        {
            return _unitOfWork.IPerson.Delete(obj);
        }
    }
}
