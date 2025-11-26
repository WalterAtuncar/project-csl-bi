using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public  class obtenerIdsImporacionResponse
    {
        public string ServicioId { get; set; }
        public string ServicioComponentId { get; set; }
        public string ComponentId { get; set; }
        public string PersonId { get; set; }
        public string Paciente { get; set; }
        public string DNI { get; set; }
        public int CategoriaId { get; set; }
        public int i_UIIndex { get; set; }
    }
}
