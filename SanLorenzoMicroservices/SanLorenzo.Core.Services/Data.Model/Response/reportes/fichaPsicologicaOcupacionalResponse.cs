using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class fichaPsicologicaOcupacionalResponse
    {
        public string v_PersonId { get; set; }
        public string v_Pacient { get; set; }
        public DateTime? d_BirthDate { get; set; }
        public DateTime? d_ServiceDate { get; set; }
        public string v_BirthPlace { get; set; }
        public int i_DiaN { get; set; }
        public int i_MesN { get; set; }
        public int i_AnioN { get; set; }
        public int i_DiaV { get; set; }
        public int i_MesV { get; set; }
        public int i_AnioV { get; set; }
        public string NivelInstruccion { get; set; }
        public string LugarResidencia { get; set; }
        public string PuestoTrabajo { get; set; }
        public string EmpresaTrabajo { get; set; }
        public string v_ServiceComponentId { get; set; }
        public string v_ServiceId { get; set; }
        public byte[] Rubrica { get; set; }
        public byte[] RubricaTrabajador { get; set; }
        public byte[] HuellaTrabajador { get; set; }
        public string v_EsoTypeName { get; set; }
    }
}
