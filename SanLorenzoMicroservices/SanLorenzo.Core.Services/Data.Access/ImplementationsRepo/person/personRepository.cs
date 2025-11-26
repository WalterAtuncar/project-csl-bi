using Repositories.IContractsRepo.person;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Access.ImplementationsRepo.person
{
    public class personRepository : Repository<Data.Model.Entities.person.person>, IPersonRepository
    {
        public personRepository(string _connectionString) : base(_connectionString)
        {
        }
    }
}
