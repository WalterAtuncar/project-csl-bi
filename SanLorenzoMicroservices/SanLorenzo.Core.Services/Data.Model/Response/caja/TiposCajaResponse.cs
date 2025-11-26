using System;

namespace Data.Model.Response.caja
{
    // ================================================
    // RESPONSES PARA TIPO CAJA
    // ================================================
    
    public class CreateTipoCajaResponse
    {
        public int IdTipoCaja { get; set; }
        public string NombreTipoCaja { get; set; }
        public string Mensaje { get; set; }
    }

    public class TipoCajaResponse
    {
        public int IdTipoCaja { get; set; }
        public string NombreTipoCaja { get; set; }
        public string Descripcion { get; set; }
        public int Estado { get; set; }
        public string EstadoDescripcion { get; set; }
        public DateTime FechaCreacion { get; set; }
    }

    public class UpdateTipoCajaResponse
    {
        public int IdTipoCaja { get; set; }
        public string Mensaje { get; set; }
    }

    public class DeleteTipoCajaResponse
    {
        public int IdTipoCaja { get; set; }
        public string Mensaje { get; set; }
    }

    // ================================================
    // RESPONSES PARA TIPO INGRESO MENSUAL
    // ================================================
    
    public class CreateTipoIngresoMensualResponse
    {
        public int IdTipoIngresoMensual { get; set; }
        public string NombreTipoIngreso { get; set; }
        public string Mensaje { get; set; }
    }

    public class TipoIngresoMensualResponse
    {
        public int IdTipoIngresoMensual { get; set; }
        public string NombreTipoIngreso { get; set; }
        public string Descripcion { get; set; }
        public int Estado { get; set; }
        public string EstadoDescripcion { get; set; }
        public DateTime FechaCreacion { get; set; }
    }

    public class UpdateTipoIngresoMensualResponse
    {
        public int IdTipoIngresoMensual { get; set; }
        public string Mensaje { get; set; }
    }

    public class DeleteTipoIngresoMensualResponse
    {
        public int IdTipoIngresoMensual { get; set; }
        public string Mensaje { get; set; }
    }

    // ================================================
    // RESPONSES PARA TIPO EGRESO MENSUAL
    // ================================================
    
    public class CreateTipoEgresoMensualResponse
    {
        public int IdTipoEgresoMensual { get; set; }
        public string NombreTipoEgreso { get; set; }
        public string Mensaje { get; set; }
    }

    public class TipoEgresoMensualResponse
    {
        public int IdTipoEgresoMensual { get; set; }
        public string NombreTipoEgreso { get; set; }
        public string Descripcion { get; set; }
        public int Estado { get; set; }
        public string EstadoDescripcion { get; set; }
        public DateTime FechaCreacion { get; set; }
    }

    public class UpdateTipoEgresoMensualResponse
    {
        public int IdTipoEgresoMensual { get; set; }
        public string Mensaje { get; set; }
    }

    public class DeleteTipoEgresoMensualResponse
    {
        public int IdTipoEgresoMensual { get; set; }
        public string Mensaje { get; set; }
    }

    // ================================================
    // RESPONSE PARA SALDO CAJA
    // ================================================
    
    public class SaldoCajaResponse
    {
        public int IdSaldoCaja { get; set; }
        public int IdTipoCaja { get; set; }
        public string NombreTipoCaja { get; set; }
        public decimal SaldoActual { get; set; }
        public DateTime UltimaActualizacion { get; set; }
    }
}
