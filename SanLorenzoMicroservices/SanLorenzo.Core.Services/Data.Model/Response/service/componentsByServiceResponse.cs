using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.service
{
    public class componentsByServiceResponse
    {
        public string v_ComponentId { get; set; }
        public string v_ComponentName { get; set; }
        public int i_ServiceComponentStatusId { get; set; }
        public string v_ServiceComponentStatusName { get; set; }
        public DateTime d_StartDate { get; set; }
        public DateTime d_EndDate { get; set; }
        public int i_QueueStatusId { get; set; }
        public string v_QueueStatusName { get; set; }
        public int ServiceStatusId { get; set; }
        public string v_Motive { get; set; }
        public int i_CategoryId { get; set; }
        public string v_CategoryName { get; set; }
        public string v_ServiceId { get; set; }
        public string v_ServiceComponentId { get; set; }
        public float r_Price { get; set; }
        public decimal d_SaldoPaciente { get; set; }
        public decimal d_SaldoAseguradora { get; set; }
    }
}
