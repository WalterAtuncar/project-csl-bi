using Business.Logic.IContractsBL.person;
using Data.Model.Entities.person;
using System.Security.Cryptography;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnitOfWork;
using Data.Model.Response;
using Data.Model.Request.login;

namespace Business.Logic.ImplementationsBL.person
{
    public class systemUserLogic : ISystemUserLogic
    {
        private IUnitOfWork _unitOfWork;
        public systemUserLogic(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }
        public bool Delete(systemuser obj)
        {
            return _unitOfWork.ISystemUser.Delete(obj);
        }

        public systemuser GetById(string id)
        {
            return _unitOfWork.ISystemUser.GetById(id);
        }

        public IEnumerable<systemuser> GetList()
        {
            return _unitOfWork.ISystemUser.GetList();
        }

        public int Insert(systemuser obj)
        {
            return _unitOfWork.ISystemUser.Insert(obj);
        }

        public bool Update(systemuser obj)
        {
            return _unitOfWork.ISystemUser.Update(obj);
        }
        public LoginResponse login(UserLogin userLogin)
        {
            userLogin.Password = Encrypt(userLogin.Password);
            var response = _unitOfWork.ISystemUser.login(userLogin);
            if (response != null)
            {
                return response;
            }
            else 
            {
                throw new Exception("Login incorrecto.");
            }
        }

        private static string Encrypt(string pData)
        {
            UnicodeEncoding parser = new UnicodeEncoding();
            byte[] _original = parser.GetBytes(pData);
            MD5CryptoServiceProvider Hash = new MD5CryptoServiceProvider();
            byte[] _encrypt = Hash.ComputeHash(_original);
            return Convert.ToBase64String(_encrypt);
        }

       
    }
}
