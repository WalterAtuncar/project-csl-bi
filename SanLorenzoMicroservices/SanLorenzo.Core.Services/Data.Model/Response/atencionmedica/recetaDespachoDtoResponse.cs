using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.atencionmedica
{
    public class recetaDespachoDtoResponse
    {
        public int RecetaId { get; set; }
        public string NombrePaciente { get; set; }
        public string Medicamento { get; set; }
        public string Presentacion { get; set; }
        public string UnidadMedida { get; set; }
        public string Ubicacion { get; set; }
        public string Duracion { get; set; }
        public DateTime FechaFin_ { get; set; }
        public string FechaFin { get; set; }

        public string Dosis { get; set; }
        public decimal CantidadRecetada { get; set; }
        public string NombreMedico { get; set; }
        public string MedicoNroCmp { get; set; }
        public byte[] RubricaMedico { get; set; }
        public string NombreClinica { get; set; }
        public string DireccionClinica { get; set; }
        public byte[] LogoClinica { get; set; }
        public bool Despacho { get; set; }
        public string MedicinaId { get; set; }
        public string Edad { get; set; }
        public DateTime FechaNacimiento { get; set; }
        public string USUARIO { get; set; }
        public string ATENCION { get; set; }
        public string ESPECIALIDAD { get; set; }
        public string CAMA { get; set; }
        public string Dx { get; set; }
        public string Cie10 { get; set; }
        public string FechaAtencion { get; set; }

        public string v_DiagnosticRepositoryId { get; set; }

        public DateTime FechaAtencionDate { get; set; }
    }
}
