using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Business.Logic.IContractsBL.person
{
    public interface IPersonLogic
    {
        bool Update(Data.Model.Entities.person.person obj);
        int Insert(Data.Model.Entities.person.person obj);
        IEnumerable<Data.Model.Entities.person.person> GetList();
        Data.Model.Entities.person.person GetById(string id);
        bool Delete(Data.Model.Entities.person.person obj);
    }
}
