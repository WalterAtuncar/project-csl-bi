using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class serviceComponentConclusionesDxServiceidReport_todosResponse
    {
        public int i_Item { get; set; }
        public string v_DiagnosticRepositoryId { get; set; }
        public string v_ServiceId { get; set; }
        public string v_ComponentId { get; set; }
        public string v_DiseasesId { get; set; }
        public string v_DiseasesName { get; set; }
        public string v_ComponentName { get; set; }
        public string v_PreQualificationName { get; set; }
        public string v_FinalQualificationName { get; set; }
        public string v_DiagnosticTypeName { get; set; }
        public string v_ComponentFieldsId { get; set; }
        public string v_Dx_CIE10 { get; set; }
        public int i_DiagnosticTypeId { get; set; }
        public int i_FinalQualificationId { get; set; }
        public int i_CategoryId { get; set; }
        public string Categoria { get; set; }
    }
}
