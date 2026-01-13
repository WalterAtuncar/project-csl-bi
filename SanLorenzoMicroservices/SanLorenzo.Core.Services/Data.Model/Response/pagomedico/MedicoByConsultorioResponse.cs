using System;

namespace Data.Model.Response.pagomedico
{
    public class MedicoByConsultorioResponse
    {
        public int MedicoTratanteId { get; set; }
        public string userName { get; set; }
        public string name { get; set; }
        public int consultorioId { get; set; }
        public string consultorio { get; set; }
    }
}
