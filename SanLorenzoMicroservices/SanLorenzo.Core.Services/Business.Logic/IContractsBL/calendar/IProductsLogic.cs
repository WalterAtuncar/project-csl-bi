using Data.Model.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Business.Logic.IContractsBL.calendar
{
    public interface IProductsLogic
    {
        bool Update(products obj);
        int Insert(products obj);
        IEnumerable<products> GetList();
        products GetById(int id);
        bool Delete(products obj);
    }
}
