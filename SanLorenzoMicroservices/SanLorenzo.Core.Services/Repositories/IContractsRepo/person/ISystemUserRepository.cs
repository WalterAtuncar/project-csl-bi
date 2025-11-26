using Data.Model.Entities.person;
using Data.Model.Request.login;
using Data.Model.Response;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Repositories.IContractsRepo.person
{
    public interface ISystemUserRepository : IRepository<systemuser>
    {
        LoginResponse login(UserLogin userLogin);
    }
}
