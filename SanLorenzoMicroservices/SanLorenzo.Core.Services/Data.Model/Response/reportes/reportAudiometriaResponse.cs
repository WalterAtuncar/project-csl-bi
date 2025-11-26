using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.reportes
{
    public class reportAudiometriaResponse
    {
        public string v_PersonId { get; set; }
        public string v_FullPersonName { get; set; }
        public DateTime? d_BirthDate { get; set; }
        public DateTime? d_ServiceDate { get; set; }
        public string v_DocNumber { get; set; }
        public int? i_SexTypeId { get; set; }
        public byte[] FirmaTecnologo { get; set; }
        public byte[] FirmaMedico { get; set; }
        public string Puesto { get; set; }
        public string v_SexType { get; set; }
        public string v_EsoTypeName { get; set; }
        public string v_ServiceComponentId { get; set; }
        public string v_CustomerOrganizationName { get; set; }
        public string v_EmployerOrganizationName { get; set; }
        public string EmpresaPropietaria { get; set; }
        public string EmpresaPropietariaDireccion { get; set; }
        public byte[] FirmaTrabajador { get; set; }
        public byte[] HuellaTrabajador { get; set; }
        public string NombreUsuarioGraba { get; set; }
        public string Departamento { get; set; }
        public string Provincia { get; set; }
        public string Distrito { get; set; }
        public string DireccionPaciente { get; set; }
        public string Telefono { get; set; }
    }
}
