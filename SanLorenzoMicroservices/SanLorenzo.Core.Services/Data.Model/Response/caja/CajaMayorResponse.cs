using System;
using System.Collections.Generic;

namespace Data.Model.Response.caja
{
    public class CreateCajaMayorResponse
    {
        public int IdCajaMayor { get; set; }
        public bool IsUpdate { get; set; }
        public string Mensaje { get; set; }
        public decimal SaldoFinal { get; set; }
    }

    public class CajaMayorListResponse
    {
        public int IdCajaMayor { get; set; }
        public string Periodo { get; set; }
        public string Mes { get; set; }
        public string Anio { get; set; }
        public string NombreTipoCaja { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public decimal SaldoInicialMes { get; set; }
        public decimal TotalIngresos { get; set; }
        public decimal TotalEgresos { get; set; }
        public decimal SaldoFinalMes { get; set; }
        public int EstadoCierre { get; set; }
        public string EstadoCierreDescripcion { get; set; }
        public DateTime? FechaCierre { get; set; }
        public string ObservacionesCierre { get; set; }
        public DateTime FechaCreacion { get; set; }
        public int TotalRecords { get; set; }
    }

    public class CajaMayorDetalleResponse
    {
        public CajaMayorHeaderResponse Header { get; set; }
        public List<CajaMayorMovimientoResponse> Movimientos { get; set; }
    }

    public class CajaMayorHeaderResponse
    {
        public int IdCajaMayor { get; set; }
        public int IdTipoCaja { get; set; }
        public string NombreTipoCaja { get; set; }
        public string Periodo { get; set; }
        public string Mes { get; set; }
        public string Anio { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public decimal SaldoInicialMes { get; set; }
        public decimal TotalIngresos { get; set; }
        public decimal TotalEgresos { get; set; }
        public decimal SaldoFinalMes { get; set; }
        public int EstadoCierre { get; set; }
        public DateTime? FechaCierre { get; set; }
        public string ObservacionesCierre { get; set; }
        public DateTime FechaCreacion { get; set; }
    }

    public class CajaMayorMovimientoResponse
    {
        public int IdCajaMayorDetalle { get; set; }
        public string IdVenta { get; set; }
        public string CodigoDocumento { get; set; }
        public string TipoMovimiento { get; set; }
        public string TipoMovimientoDescripcion { get; set; }
        public string ConceptoMovimiento { get; set; }
        public DateTime FechaMovimiento { get; set; }
        public decimal Subtotal { get; set; }
        public decimal IGV { get; set; }
        public decimal Total { get; set; }
        public string NumeroDocumento { get; set; }
        public string SerieDocumento { get; set; }
        public string Observaciones { get; set; }
        public DateTime FechaRegistro { get; set; }
    }

    public class CerrarCajaMayorResponse
    {
        public int IdCajaMayor { get; set; }
        public string Mensaje { get; set; }
        public DateTime FechaCierre { get; set; }
    }

    public class DeleteCajaMayorResponse
    {
        public int IdCajaMayor { get; set; }
        public string Mensaje { get; set; }
    }
}
