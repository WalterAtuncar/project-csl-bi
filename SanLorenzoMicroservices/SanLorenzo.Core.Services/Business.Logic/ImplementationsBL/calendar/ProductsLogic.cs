using Business.Logic.IContractsBL.calendar;
using Data.Model.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnitOfWork;

namespace Business.Logic.ImplementationsBL.calendar
{
    public class ProductsLogic : IProductsLogic
    {
        private IUnitOfWork _unitOfWork;

        public ProductsLogic(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public products GetById(int id)
        {
            return null;// _unitOfWork.IProducts.GetById(id);
        }

        public IEnumerable<products> GetList()
        {
            return _unitOfWork.IProducts.GetList();
        }

        public int Insert(products obj)
        {
            return _unitOfWork.IProducts.Insert(obj);
        }

        public bool Update(products obj)
        {
            return _unitOfWork.IProducts.Update(obj);
        }

        public bool Delete(products obj)
        {
            return _unitOfWork.IProducts.Delete(obj);
        }
    }
}
