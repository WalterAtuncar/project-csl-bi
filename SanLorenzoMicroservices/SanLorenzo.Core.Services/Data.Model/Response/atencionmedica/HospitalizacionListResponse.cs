using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.atencionmedica
{
    public class HospitalizacionListResponse
    {
        public string v_HopitalizacionId { get; set; }
        public string v_PersonId { get; set; }
        public string v_DocNumber { get; set; }
        public int i_Years { get; set; }
        public DateTime d_Birthdate { get; set; }
        public string v_Paciente { get; set; }
        public DateTime? d_FechaIngreso { get; set; }
        public DateTime? d_FechaAlta { get; set; }
        public int i_IsDeleted { get; set; }
        public string v_Comentario { get; set; }
        public string v_NroLiquidacion { get; set; }
        public string v_NroHospitalizacion { get; set; }
        public string v_Cie10 { get; set; }
        public string v_Diagnostico { get; set; }

        public decimal? d_PagoMedico { get; set; }
        public int? i_MedicoPago { get; set; }
        public string MedicoPago { get; set; }
        public decimal? d_PagoPaciente { get; set; }
        public int? i_PacientePago { get; set; }
        public string PacientePago { get; set; }

        public decimal? d_PagoFarmacia { get; set; }
        public int? i_PagoFarmacia { get; set; }
        public string FarmaciaPago { get; set; }


        public string v_MedicoTratante { get; set; }

        public string v_Servicio { get; set; }

        public string v_ProcedenciaPac { get; set; }
        public string v_Comprobantes { get; set; }
        public decimal d_MontoPagado { get; set; }

        public string Hosp { get; set; }
        public string Sop { get; set; }
        public string Especialidad1 { get; set; }
        public string Especialidad2 { get; set; }

        public string TipoHosp { get; set; }

        public string v_CIE10IdSalida { get; set; }
        public string v_DiseasesNameSalida { get; set; }

        public int? i_ProcedimientoSOP { get; set; }
        public string v_ProcedimientoSOP { get; set; }

    }
}
