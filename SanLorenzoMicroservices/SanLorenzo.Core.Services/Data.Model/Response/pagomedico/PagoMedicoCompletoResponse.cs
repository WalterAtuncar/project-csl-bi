using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.pagomedico
{
    public class PagoMedicoCompletoResponse
    {
        public List<PagoMedicoCabecera> Cabecera { get; set; }
        public List<PagoMedicoDetalle> Detalles { get; set; }
    }
    public class PagoMedicoCabecera
    {
        public int MedicoId { get; set; }
        public string NombreMedico { get; set; }
        public string EspecialidadMedico { get; set; }
        public decimal PorcentajeMedico { get; set; }
        public int TotalServiciosGenerados { get; set; }
        public decimal MontoTotalGenerado { get; set; }
        public decimal PagoTotalGenerado { get; set; }
        public int ServiciosPagados { get; set; }
        public decimal MontoYaPagado { get; set; }
        public decimal PagoYaRealizado { get; set; }
        public int ServiciosPendientes { get; set; }
        public decimal MontoPendientePago { get; set; }
        public decimal TotalAPagar { get; set; }
        public DateTime PrimerServicio { get; set; }
        public DateTime UltimoServicio { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public DateTime FechaCalculo { get; set; }
        public string EstadoGeneral { get; set; }
        public string TotalAPagarFormateado { get; set; }
        public string PagoYaRealizadoFormateado { get; set; }
        public string PagoTotalGeneradoFormateado { get; set; }
    }
    public class PagoMedicoDetalle
    {
        public string v_ServiceComponentId { get; set; }
        public string v_ServiceId { get; set; }
        public DateTime d_ServiceDate { get; set; }
        public string Paciente { get; set; }
        public string v_ComprobantePago { get; set; }
        public decimal PrecioServicio { get; set; }
        public int MedicoId { get; set; }
        public decimal PorcentajeMedico { get; set; }
        public decimal PagoMedico { get; set; }
        public string EstadoPago { get; set; }
        public DateTime? FechaPago { get; set; }
        public int NumeroLinea { get; set; }
        public int EsPagado { get; set; }
        public string FechaServicioFormateada { get; set; }
        public string PrecioServicioFormateado { get; set; }
        public string PagoMedicoFormateado { get; set; }
        public string FechaPagoFormateada { get; set; }
        public string ColorEstado { get; set; }
        public string IconoEstado { get; set; }
        public decimal? MontoPagadoReal { get; set; }
        public decimal? PorcentajePagadoReal { get; set; }
    }
}
