using Data.Model.Entities;
using Repositories.IContractsRepo.calendar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Data.Access.ImplementationsRepo.calendar
{
    internal class ProductsRepository : Repository<products>, IProductsRepository
    {
        public ProductsRepository(string _connectionString) : base(_connectionString)
        {
        }
    }
}
