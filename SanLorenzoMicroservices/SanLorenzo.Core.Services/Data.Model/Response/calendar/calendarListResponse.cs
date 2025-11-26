using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.calendar
{
    public class calendarListResponse
    {
        public string v_ServiceId { get; set; }
        public DateTime d_DateTimeCalendar { get; set; }
        public string v_Pacient { get; set; }
        public string v_NumberDocument { get; set; }
        public string v_LineStatusName { get; set; }
        public string v_ServiceStatusName { get; set; }
        public DateTime? d_SalidaCM { get; set; }
        public string v_AptitudeStatusName { get; set; }
        public string v_ServiceTypeName { get; set; }
        public string v_ServiceName { get; set; }
        public string v_NewContinuationName { get; set; }
        public string v_EsoTypeName { get; set; }
        public int i_ServiceTypeId { get; set; }
        public string v_CalendarStatusName { get; set; }
        public string v_ProtocolName { get; set; }
        public string v_IsVipName { get; set; }
        public string v_WorkingOrganizationName { get; set; }
        public string v_ProtocolId { get; set; }
        public string v_CalendarId { get; set; }
        public DateTime? d_Birthdate { get; set; }
        public string v_PersonId { get; set; }
        public string v_DocNumber { get; set; }
        public string v_CreationUser { get; set; }
        public int? i_MasterServiceId { get; set; }
        public string v_OrganizationId { get; set; }
        public string v_ComprobantePago { get; set; }
        public string v_NroLiquidacion { get; set; }
        public string RucEmpFact { get; set; }
        public int? i_Edad { get; set; }
        public int? i_CalendarStatusId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_LineStatusId { get; set; }
        public int? i_AptitudeStatusId { get; set; }
        public int? i_NewContinuationId { get; set; }
        public int? i_ServiceStatusId { get; set; }
        public string v_ObservacionesAdicionales { get; set; }
        public string v_TelephoneNumber { get; set; }
        public string MKT { get; set; }
    }
}
