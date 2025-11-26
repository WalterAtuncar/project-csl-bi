using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.dashboard
{
    public class DashboardServiciosRequest
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
    }

    public class DashboardServicioDto
    {
        public string ServicioId { get; set; }
        public string MedioMarketing { get; set; }
        public string TipoDocumento { get; set; }
        public string Sexo { get; set; }
        public int Edad { get; set; }
        public string UbigeoId { get; set; }
        public string EstadoCivil { get; set; }
        public string FechaServicio { get; set; }
        public string Comprobante { get; set; }
        public string UsuarioRegistro { get; set; }
        public string MedicoTratante { get; set; }
        public string ProtocoloNombre { get; set; }
        public string EspecialidadMedica { get; set; }
        public string ConsultorioNombre { get; set; }
        public string TipoServicio { get; set; }
        public string MedicoSolicitanteNombre { get; set; }
        public string EspecialidadSolicitante { get; set; }
        public string DiagnosticoNombre { get; set; }
        public string DiagnosticoCie10 { get; set; }
        public string EstadoDiagnostico { get; set; }
        public string ProcedenciaNombre { get; set; }
    }
}
