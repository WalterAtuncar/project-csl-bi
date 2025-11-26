using Dapper;
using Data.Model.Entities.person;
using Data.Model.Request.login;
using Data.Model.Response;
using Data.Model.Response.reportes;
using Repositories.IContractsRepo.person;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Access.ImplementationsRepo.person
{
    public class systemUserRepository : Repository<systemuser>, ISystemUserRepository
    {
        public systemUserRepository(string _connectionString) : base(_connectionString)
        {
        }

        public LoginResponse login(UserLogin userLogin)
        {
            var paramneters = new DynamicParameters();

            paramneters.Add("@NodeId", userLogin.NodeId ?? 9);
            paramneters.Add("@User", userLogin.User);
            paramneters.Add("@Password", userLogin.Password);

            using (var connection = new SqlConnection(_connectionString))
            {
                return (LoginResponse)connection.Query<LoginResponse>("[dbo].[sp_LoginSystem]", paramneters, commandType: System.Data.CommandType.StoredProcedure).FirstOrDefault();
            }
        }
    }
}
