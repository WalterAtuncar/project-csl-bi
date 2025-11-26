using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.atencionmedica
{
    public class keyValueDtoResponse
    {
        public string Id { get; set; }
        public string Value1 { get; set; }
        public string Value2 { get; set; }

        public int IdI { get; set; }

        public int GrupoId { get; set; }

        public string Field { get; set; }
        public int ParentId { get; set; }

    }
}
