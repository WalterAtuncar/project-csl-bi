using System;

namespace Data.Model.Response.caja
{
    public class CajaMayorCabeceraResponse
    {
        public int IdCajaMayorCierre { get; set; }
        public string Anio { get; set; }
        public string Mes { get; set; }
        public System.DateTime FechaInicio { get; set; }
        public System.DateTime FechaFin { get; set; }
        public byte EstadoCierre { get; set; }
        public decimal SaldoInicialTotal { get; set; }
        public decimal TotalIngresosTotal { get; set; }
        public decimal TotalEgresosTotal { get; set; }
        public decimal SaldoFinalTotal { get; set; }
        public string Observaciones { get; set; }
        public int? InsertaIdUsuario { get; set; }
        public System.DateTime? InsertaFecha { get; set; }
        public int? ActualizaIdUsuario { get; set; }
        public System.DateTime? ActualizaFecha { get; set; }
    }
}