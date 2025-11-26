using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.organization
{
    public class OrdenReporte
    {
        [ExplicitKey]
        public string v_OrdenReporteId { get; set; }
        public string v_OrganizationId { get; set; }
        public string v_NombreReporte { get; set; }
        public string v_ComponenteId { get; set; }
        public int? i_Orden { get; set; }
        public string v_NombreCrystal { get; set; }
        public int? i_NombreCrystalId { get; set; }
        public string v_ComentaryUpdate { get; set; }
    }
}
