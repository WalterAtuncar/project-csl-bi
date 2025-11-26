using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class serviceComponentsReportCResponse
    {
        public string v_ComponentId { get; set; }
        public string v_ComponentName { get; set; }
        public string v_ServiceComponentId { get; set; }
        public string v_CreationUser { get; set; }
        public string v_UpdateUser { get; set; }
        public DateTime? d_CreationDate { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public int i_IsDeleted { get; set; }
        public int? i_CategoryId { get; set; }
        public string v_CategoryName { get; set; }
        public int i_ServiceComponentStatusId { get; set; }
        public byte[] FirmaMedico { get; set; }
        public string v_ComponentFieldsId { get; set; }
    }
}
