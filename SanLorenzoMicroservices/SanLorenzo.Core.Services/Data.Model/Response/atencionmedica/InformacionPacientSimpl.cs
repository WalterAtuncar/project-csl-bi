using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.atencionmedica
{
    public class InformacionPacientSimpl
    {
        public string v_PersonId { get; set; }
        public byte[] Photo { get; set; }
        public string Nombres { get; set; }
        public string ApPaterno { get; set; }
        public string ApMaterno { get; set; }
        public string TipoDoc { get; set; }
        public string DocNumber { get; set; }
        public string Sexo { get; set; }
        public string FechaNac { get; set; }
        public string LugarNac { get; set; }
        public string EstCivil { get; set; }
        public string NivelEstudios { get; set; }
        public string Mail { get; set; }
        public string v_Telefono { get; set; }
        public int HijosVivos { get; set; }
        public int HijosMuertos { get; set; }
        public int NroHermanos { get; set; }
        public string Direccion { get; set; }
        public string TiempoResidencia { get; set; }
        public string Departamento { get; set; }
        public string Provincia { get; set; }
        public string Distrito { get; set; }
        public string ResidenciaAnterior { get; set; }
        public string v_Religion { get; set; }
        public string ContactEmergencyName { get; set; }
        public string EmergencyPhone { get; set; }
        public string Nacionalidad { get; set; }
        public string Etnia { get; set; }
        public string Migrante { get; set; }
        public string Pais { get; set; }
        public string GrupoRH { get; set; }
        public string FactorRH { get; set; }
        public string RelacionSeg { get; set; }
        public string TitSeg { get; set; }
        public string TipoSeguro { get; set; }
        public string Mineral { get; set; }
        public string Altitud { get; set; }
        public string LugarTrabajo { get; set; }
        public string Ocupacion { get; set; }
        public string ResideTrab { get; set; }
    }
}
