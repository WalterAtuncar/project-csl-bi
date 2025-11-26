using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.login
{
    public class UserLogin
    {
        public int? NodeId { get; set; }
        public string User { get; set; }
        public string Password { get; set; }
    }
}
