using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.especialidades
{
    public class CreateEspecialidadResponse : EspecialidadResponse
    {
        public string Status { get; set; }
        public string Message { get; set; }
    }
}
