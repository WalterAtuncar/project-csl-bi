using System;

namespace Data.Model.Response.caja
{
    // ================================================
    // RESPONSES PARA INGRESOS MENSUALES
    // ================================================
    
    public class CreateIngresoMensualResponse
    {
        public int IdIngresoMensual { get; set; }
        public string Mensaje { get; set; }
        public decimal MontoIngreso { get; set; }
        public decimal NuevoSaldoCaja { get; set; }
    }

    public class IngresoMensualListResponse
    {
        public int IdIngresoMensual { get; set; }
        public int IdCajaMayor { get; set; }
        public string PeriodoCajaMayor { get; set; }
        public int IdTipoIngresoMensual { get; set; }
        public string NombreTipoIngreso { get; set; }
        public string ConceptoIngreso { get; set; }
        public DateTime FechaIngreso { get; set; }
        public decimal MontoIngreso { get; set; }
        public string NumeroDocumento { get; set; }
        public string Origen { get; set; }
        public string Observaciones { get; set; }
        public int Estado { get; set; }
        public string EstadoDescripcion { get; set; }
        public DateTime FechaCreacion { get; set; }
        public int TotalRecords { get; set; }
    }

    public class UpdateIngresoMensualResponse
    {
        public int IdIngresoMensual { get; set; }
        public string Mensaje { get; set; }
        public decimal MontoIngreso { get; set; }
        public decimal NuevoSaldoCaja { get; set; }
    }

    public class DeleteIngresoMensualResponse
    {
        public int IdIngresoMensual { get; set; }
        public string Mensaje { get; set; }
        public decimal NuevoSaldoCaja { get; set; }
    }

    // ================================================
    // RESPONSES PARA EGRESOS MENSUALES
    // ================================================
    
    public class CreateEgresoMensualResponse
    {
        public int IdEgresoMensual { get; set; }
        public string Mensaje { get; set; }
        public decimal MontoEgreso { get; set; }
        public decimal NuevoSaldoCaja { get; set; }
    }

    public class EgresoMensualListResponse
    {
        public int IdEgresoMensual { get; set; }
        public int IdCajaMayor { get; set; }
        public string PeriodoCajaMayor { get; set; }
        public int IdTipoEgresoMensual { get; set; }
        public string NombreTipoEgreso { get; set; }
        public string ConceptoEgreso { get; set; }
        public DateTime FechaEgreso { get; set; }
        public decimal MontoEgreso { get; set; }
        public string NumeroDocumento { get; set; }
        public string Beneficiario { get; set; }
        public string Observaciones { get; set; }
        public int Estado { get; set; }
        public string EstadoDescripcion { get; set; }
        public DateTime FechaCreacion { get; set; }
        public int TotalRecords { get; set; }
    }

    public class UpdateEgresoMensualResponse
    {
        public int IdEgresoMensual { get; set; }
        public string Mensaje { get; set; }
        public decimal MontoEgreso { get; set; }
        public decimal NuevoSaldoCaja { get; set; }
    }

    public class DeleteEgresoMensualResponse
    {
        public int IdEgresoMensual { get; set; }
        public string Mensaje { get; set; }
        public decimal NuevoSaldoCaja { get; set; }
    }
}
