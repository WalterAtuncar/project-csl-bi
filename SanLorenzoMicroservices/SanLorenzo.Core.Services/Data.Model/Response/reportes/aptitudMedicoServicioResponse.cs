using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class aptitudMedicoServicioResponse
    {
        public string v_ServiceId { get; set; }
        public int? i_UpdateUserOccupationalMedicaltId { get; set; }
        public string v_UserName { get; set; }
        public int? i_AptitudeStatusId { get; set; }
        public string v_Value1 { get; set; }
        public string v_PersonId { get; set; }
        public int? i_SystemUserId { get; set; }
        public string v_FirstName { get; set; }
        public string v_FirstLastName { get; set; }
        public string v_SecondLastName { get; set; }
        public byte[] b_PersonImage { get; set; }
        public byte[] b_RubricImage { get; set; }
        public byte[] b_FingerPrintImage { get; set; }
        public string v_ProfessionalCode { get; set; }
    }
}
