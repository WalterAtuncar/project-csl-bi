using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class informacion_Otrosexamenes_NewResponse
    {
        public string v_PersonId { get; set; }
        public string v_ServiceId { get; set; }
        public int i_EsoTypeId { get; set; }
        public int i_ServiceTypeId { get; set; }
        public string RUC { get; set; }
        public string EmpresaTrabajo { get; set; }
        public string EmpresaEmpleadora { get; set; }
        public string RubroEmpresaTrabajo { get; set; }
        public string DireccionEmpresaTrabajo { get; set; }
        public string DepartamentoEmpresaTrabajo { get; set; }
        public string ProvinciaEmpresaTrabajo { get; set; }
        public string DistritoEmpresaTrabajo { get; set; }
        public string v_CurrentOccupation { get; set; }
        public byte[] b_Logo { get; set; }
        public string EmpresaClienteId { get; set; }
        public byte[] FirmaTrabajador { get; set; }
        public byte[] HuellaTrabajador { get; set; }
        public string v_CustomerOrganizationName { get; set; }
        public byte[] FirmaMedicoMedicina { get; set; }
        public string NombreDoctor { get; set; }
        public string CMP { get; set; }
    }
}
