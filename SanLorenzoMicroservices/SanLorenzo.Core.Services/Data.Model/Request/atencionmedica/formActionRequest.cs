using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.atencionmedica
{
    public class formActionRequest
    {
        public int pintNodeId { get; set; }
        public int pintRoleId { get; set; }
        public int pintSystemUserId { get; set; }
        public string pstrFormCode { get; set; }

    }
}
