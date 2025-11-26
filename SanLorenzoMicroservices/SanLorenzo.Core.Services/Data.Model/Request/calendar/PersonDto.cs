using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.calendar
{
    public class PersonDto
    {
        public string Nombres { get; set; }
        public int? TipoDocumento { get; set; }
        public string NroDocumento { get; set; }
        public string ApellidoPaterno { get; set; }
        public string ApellidoMaterno { get; set; }
        public int? GeneroId { get; set; }
        public DateTime FechaNacimiento { get; set; }
        public string CommentaryUpdate { get; set; }
        public int? EstadoCivil { get; set; }
        public string LugarNacimiento { get; set; }
        public int? Distrito { get; set; }
        public int? Provincia { get; set; }
        public int? Departamento { get; set; }
        public int? Reside { get; set; }
        public string Email { get; set; }
        public string Direccion { get; set; }
        public string Puesto { get; set; }
        public string Area { get; set; }
        public int? Altitud { get; set; }

        public string Minerales { get; set; }
        public int? Estudios { get; set; }
        public int? Grupo { get; set; }
        public int? Factor { get; set; }
        public string TiempoResidencia { get; set; }
        public int? TipoSeguro { get; set; }
        public int? Vivos { get; set; }
        public int? Muertos { get; set; }
        public int? Hermanos { get; set; }
        public string Telefono { get; set; }
        public int? Parantesco { get; set; }
        public int? Labor { get; set; }

        public byte[] b_PersonImage { get; set; }
        public byte[] b_FingerPrintTemplate { get; set; }
        public byte[] b_FingerPrintImage { get; set; }
        public byte[] b_RubricImage { get; set; }
        public string t_RubricImageText { get; set; }

        public string Nacionalidad { get; set; }
        public string ResidenciaAnte { get; set; }
        public string Religion { get; set; }
        public string titular { get; set; }

        public string ContactoEmergencia { get; set; }
        public string CelularEmergencia { get; set; }

        public int? i_EtniaRaza { get; set; }
        public int? i_Migrante { get; set; }
        public string v_Migrante { get; set; }

        public string v_FotocheckMY { get; set; }
        public string v_FechaInicioMY { get; set; }

        public int? i_Marketing { get; set; }
        public string v_MarketingOtros { get; set; }

        //public string Nombres { get; set; }
        //public int? TipoDocumento { get; set; }
        //public string? NroDocumento { get; set; }
        //public string? ApellidoPaterno { get; set; }
        //public string? ApellidoMaterno { get; set; }
        //public int? GeneroId { get; set; }
        //public DateTime FechaNacimiento { get; set; }
        //public string? CommentaryUpdate { get; set; }
        //public int? EstadoCivil { get; set; }
        //public string? LugarNacimiento { get; set; }
        //public int? Distrito { get; set; }
        //public int? Provincia { get; set; }
        //public int? Departamento { get; set; }
        //public int? Reside { get; set; }
        //public string? Email { get; set; }
        //public string? Direccion { get; set; }
        //public string? Puesto { get; set; }
        //public string? Area { get; set; }
        //public int? Altitud { get; set; }

        //public string? Minerales { get; set; }
        //public int? Estudios { get; set; }
        //public int? Grupo { get; set; }
        //public int? Factor { get; set; }
        //public string? TiempoResidencia { get; set; }
        //public int? TipoSeguro { get; set; }
        //public int? Vivos { get; set; }
        //public int? Muertos { get; set; }
        //public int? Hermanos { get; set; }
        //public string? Telefono { get; set; }
        //public int? Parantesco { get; set; }
        //public int? Labor { get; set; }

        //public byte[] b_PersonImage { get; set; }
        //public byte[] b_FingerPrintTemplate { get; set; }
        //public byte[] b_FingerPrintImage { get; set; }
        //public byte[] b_RubricImage { get; set; }
        //public string? t_RubricImageText { get; set; }

        //public string? Nacionalidad { get; set; }
        //public string? ResidenciaAnte { get; set; }
        //public string? Religion { get; set; }
        //public string titular { get; set; }

        //public string? ContactoEmergencia { get; set; }
        //public string CelularEmergencia { get; set; }

        //public int? i_EtniaRaza { get; set; }
        //public int? i_Migrante { get; set; }
        //public string? v_Migrante { get; set; }
    }
}
