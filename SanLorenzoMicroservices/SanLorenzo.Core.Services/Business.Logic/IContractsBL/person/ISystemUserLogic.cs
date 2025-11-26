using Data.Model.Entities.person;
using Data.Model.Request.login;
using Data.Model.Response;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Business.Logic.IContractsBL.person
{
    public interface ISystemUserLogic
    {
        bool Update(systemuser obj);
        int Insert(systemuser obj);
        IEnumerable<systemuser> GetList();
        systemuser GetById(string id);
        bool Delete(systemuser obj);
        LoginResponse login(UserLogin userLogin);
    }
}
