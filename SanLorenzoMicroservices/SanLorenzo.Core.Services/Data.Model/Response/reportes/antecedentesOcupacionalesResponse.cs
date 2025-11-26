using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class antecedentesOcupacionalesResponse
    {
        public string Historia { get; set; }
        public DateTime? F_Inicio { get; set; }
        public DateTime? F_Fin { get; set; }
        public string Empresa { get; set; }
        public string Puesto { get; set; }
        public string Operacion { get; set; }
        public string Categorias { get; set; }
        public int EPP { get; set; }
    }
}
