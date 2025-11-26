using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class organizationDtoResponse
    {
        public string v_Name { get; set; }
        public string v_Address { get; set; }
        public byte[] b_Image { get; set; }
        public string v_PhoneNumber { get; set; }
        public string v_Mail { get; set; }
    }
}
