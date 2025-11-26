using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.reportes
{
    public class filtroServicioComponentePathRequest
    {
        public string pstrServiceId { get; set; }
        public string pstrComponentId { get; set; }
        public string pstrPath { get; set; }
    }
}
