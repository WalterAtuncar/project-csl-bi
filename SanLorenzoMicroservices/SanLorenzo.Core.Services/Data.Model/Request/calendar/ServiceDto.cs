using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.calendar
{
    public class ServiceDto
    {
        public string? ServiceId { get; set; }
        public string? OrganizationId { get; set; }
        public string? ProtocolId { get; set; }
        public string? PersonId { get; set; }
        public int? MasterServiceId { get; set; }
        public int? ServiceStatusId { get; set; }
        public int? AptitudeStatusId { get; set; }
        public DateTime? ServiceDate { get; set; }
        public DateTime? GlobalExpirationDate { get; set; }
        public DateTime? ObsExpirationDate { get; set; }
        public int? FlagAgentId { get; set; }
        public string? Motive { get; set; }
        public int? IsFac { get; set; }
        public DateTime? FechaNacimiento { get; set; }
        public int? GeneroId { get; set; }
        public int? MedicoTratanteId { get; set; }
        public int? MedicoRealizaId { get; set; }
        public string? v_centrocosto { get; set; }
        public string? CommentaryUpdate { get; set; }
        public string? Area { get; set; }
        public string? CCosto { get; set; }
        public int? Plan { get; set; }
        public int? ServiceTypeId { get; set; }
        public string? v_LicenciaConducir { get; set; }
        public string? ObservacionesAtencion { get; set; }
        public string? PacienteHospSala { get; set; }
        public int? i_ModTrabajo { get; set; }
        public int? PasoSop { get; set; }
        public int? PasoHosp { get; set; }
        public int? i_ProcedenciaPac_Mkt { get; set; }
        public int? Establecimiento { get; set; }
        public int? VendedorExterno { get; set; }
        public int? MedicoSolicitanteExterno { get; set; }
        public string? _idccEditarNew { get; set; }
        public int? i_MedicoAtencion { get; set; }
        public int? i_CodigoAtencion { get; set; }
        public int? i_GrupoAtencion { get; set; }
    }
}
