using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.atencionmedica
{
    public class valorComponenteListResponse
    {
        public string ServicioId { get; set; }
        public string NombreComponente { get; set; }
        public string IdComponente { get; set; }
        public string NombreCampo { get; set; }
        public string IdCampo { get; set; }
        public string Valor { get; set; }
        public string ValorName { get; set; }
        public int i_GroupId { get; set; }
        public int? CategoryId { get; set; }
    }
}
