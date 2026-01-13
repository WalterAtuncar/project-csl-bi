using System;

namespace Data.Model.Request.pagomedico
{
    public class UpdateMedicoTratanteRequest
    {
        public string v_ServiceComponentId { get; set; }
        public int i_MedicoTratanteId { get; set; }
        public int i_UpdateUserId { get; set; }
    }
}
