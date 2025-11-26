using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class historyReportResponse
    {
        public string v_HistoryId { get; set; }
        public DateTime? d_StartDate { get; set; }
        public DateTime? d_EndDate { get; set; }
        public string v_Organization { get; set; }
        public string v_TypeActivity { get; set; }
        public int i_GeografixcaHeight { get; set; }
        public string v_workstation { get; set; }
        public DateTime? d_CreationDate { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public byte[] b_FingerPrintImage { get; set; }
        public byte[] b_RubricImage { get; set; }
        public string t_RubricImageText { get; set; }
        public string v_TypeOperationName { get; set; }
    }
}
