using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Data.Model.Request.caja
{
    public class CreateCajaMayorRequest
    {
        [Required(ErrorMessage = "El tipo de caja es requerido")]
        public int IdTipoCaja { get; set; }
        
        [Required(ErrorMessage = "El período es requerido")]
        [StringLength(6, ErrorMessage = "El período debe tener 6 caracteres")]
        public string Periodo { get; set; }
        
        [Required(ErrorMessage = "El mes es requerido")]
        [StringLength(2, ErrorMessage = "El mes debe tener 2 caracteres")]
        public string Mes { get; set; }
        
        [Required(ErrorMessage = "El año es requerido")]
        [StringLength(4, ErrorMessage = "El año debe tener 4 caracteres")]
        public string Anio { get; set; }
        
        [Required(ErrorMessage = "La fecha de inicio es requerida")]
        public DateTime FechaInicio { get; set; }
        
        [Required(ErrorMessage = "La fecha de fin es requerida")]
        public DateTime FechaFin { get; set; }
        
        public decimal SaldoInicialMes { get; set; }
        
        public decimal TotalIngresos { get; set; }
        
        public decimal TotalEgresos { get; set; }
        
        [StringLength(500, ErrorMessage = "Las observaciones no pueden exceder 500 caracteres")]
        public string ObservacionesCierre { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int InsertaIdUsuario { get; set; }
        
        public List<CajaMayorDetalleRequest> Detalle { get; set; } = new List<CajaMayorDetalleRequest>();
    }

    public class UpdateCajaMayorRequest
    {
        [Required(ErrorMessage = "El ID de caja mayor es requerido")]
        public int IdCajaMayor { get; set; }
        
        [Required(ErrorMessage = "El tipo de caja es requerido")]
        public int IdTipoCaja { get; set; }
        
        [Required(ErrorMessage = "El período es requerido")]
        [StringLength(6, ErrorMessage = "El período debe tener 6 caracteres")]
        public string Periodo { get; set; }
        
        [Required(ErrorMessage = "El mes es requerido")]
        [StringLength(2, ErrorMessage = "El mes debe tener 2 caracteres")]
        public string Mes { get; set; }
        
        [Required(ErrorMessage = "El año es requerido")]
        [StringLength(4, ErrorMessage = "El año debe tener 4 caracteres")]
        public string Anio { get; set; }
        
        [Required(ErrorMessage = "La fecha de inicio es requerida")]
        public DateTime FechaInicio { get; set; }
        
        [Required(ErrorMessage = "La fecha de fin es requerida")]
        public DateTime FechaFin { get; set; }
        
        public decimal SaldoInicialMes { get; set; }
        
        public decimal TotalIngresos { get; set; }
        
        public decimal TotalEgresos { get; set; }
        
        [StringLength(500, ErrorMessage = "Las observaciones no pueden exceder 500 caracteres")]
        public string ObservacionesCierre { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int ActualizaIdUsuario { get; set; }
        
        public List<CajaMayorDetalleRequest> Detalle { get; set; } = new List<CajaMayorDetalleRequest>();
    }

    public class CajaMayorDetalleRequest
    {
        [StringLength(16, ErrorMessage = "El ID de venta no puede exceder 16 caracteres")]
        public string IdVenta { get; set; }
        
        [Required(ErrorMessage = "El código de documento es requerido")]
        [StringLength(20, ErrorMessage = "El código de documento no puede exceder 20 caracteres")]
        public string CodigoDocumento { get; set; }
        
        [Required(ErrorMessage = "El tipo de movimiento es requerido")]
        [StringLength(1, ErrorMessage = "El tipo de movimiento debe ser I o E")]
        public string TipoMovimiento { get; set; }
        
        [StringLength(250, ErrorMessage = "El concepto no puede exceder 250 caracteres")]
        public string ConceptoMovimiento { get; set; }
        
        [Required(ErrorMessage = "La fecha de movimiento es requerida")]
        public DateTime FechaMovimiento { get; set; }
        
        public decimal Subtotal { get; set; }
        
        public decimal IGV { get; set; }
        
        public decimal Total { get; set; }
        
        [StringLength(50, ErrorMessage = "El número de documento no puede exceder 50 caracteres")]
        public string NumeroDocumento { get; set; }
        
        [StringLength(10, ErrorMessage = "La serie no puede exceder 10 caracteres")]
        public string SerieDocumento { get; set; }
        
        [StringLength(500, ErrorMessage = "Las observaciones no pueden exceder 500 caracteres")]
        public string Observaciones { get; set; }
    }

    public class GetCajaMayorListRequest
    {
        public int? IdTipoCaja { get; set; }
        
        [StringLength(4, ErrorMessage = "El año debe tener 4 caracteres")]
        public string Anio { get; set; }
        
        [StringLength(2, ErrorMessage = "El mes debe tener 2 caracteres")]
        public string Mes { get; set; }
        
        public int? EstadoCierre { get; set; }
        
        public int PageNumber { get; set; } = 1;
        
        public int PageSize { get; set; } = 50;
    }

    public class CerrarCajaMayorRequest
    {
        [Required(ErrorMessage = "El ID de caja mayor es requerido")]
        public int IdCajaMayor { get; set; }
        
        [StringLength(500, ErrorMessage = "Las observaciones no pueden exceder 500 caracteres")]
        public string ObservacionesCierre { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int UsuarioIdCierre { get; set; }
    }

    public class DeleteCajaMayorRequest
    {
        [Required(ErrorMessage = "El ID de caja mayor es requerido")]
        public int IdCajaMayor { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int UsuarioIdEliminacion { get; set; }
    }

    public class InsertCajaMayorDetalleRequest
    {
        [Required(ErrorMessage = "El ID de caja mayor es requerido")]
        public int IdCajaMayor { get; set; }
        
        [StringLength(50, ErrorMessage = "El ID de venta no puede exceder 50 caracteres")]
        public string IdVenta { get; set; }
        
        [StringLength(50, ErrorMessage = "El código de documento no puede exceder 50 caracteres")]
        public string CodigoDocumento { get; set; }
        
        [Required(ErrorMessage = "El tipo de movimiento es requerido")]
        [StringLength(1, ErrorMessage = "El tipo de movimiento debe ser I o E")]
        public string TipoMovimiento { get; set; }
        
        [Required(ErrorMessage = "El concepto de movimiento es requerido")]
        [StringLength(250, ErrorMessage = "El concepto no puede exceder 250 caracteres")]
        public string ConceptoMovimiento { get; set; }
        
        [Required(ErrorMessage = "La fecha de movimiento es requerida")]
        public DateTime FechaMovimiento { get; set; }
        
        public decimal Subtotal { get; set; }
        
        public decimal IGV { get; set; }
        
        [Required(ErrorMessage = "El total es requerido")]
        public decimal Total { get; set; }
        
        [StringLength(50, ErrorMessage = "El número de documento no puede exceder 50 caracteres")]
        public string NumeroDocumento { get; set; }
        
        [StringLength(20, ErrorMessage = "La serie no puede exceder 20 caracteres")]
        public string SerieDocumento { get; set; }
        
        [StringLength(500, ErrorMessage = "Las observaciones no pueden exceder 500 caracteres")]
        public string Observaciones { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int InsertaIdUsuario { get; set; }
    }

    /// <summary>
    /// Clase para mapear el Table Type de SQL Server para detalles de Caja Mayor
    /// </summary>
    public class CajaMayorDetalleTableType
    {
        public string? IdVenta { get; set; }
        public string? CodigoDocumento { get; set; }
        [Required(ErrorMessage = "El tipo de movimiento es requerido")]
        [StringLength(1, ErrorMessage = "El tipo de movimiento debe ser I o E")]
        public string TipoMovimiento { get; set; } = string.Empty;
        [Required(ErrorMessage = "El concepto de movimiento es requerido")]
        [StringLength(250, ErrorMessage = "El concepto no puede exceder 250 caracteres")]
        public string ConceptoMovimiento { get; set; } = string.Empty;
        [Required(ErrorMessage = "La fecha de movimiento es requerida")]
        public DateTime FechaMovimiento { get; set; }
        public decimal Subtotal { get; set; }
        public decimal IGV { get; set; }
        [Required(ErrorMessage = "El total es requerido")]
        public decimal Total { get; set; }
        [StringLength(50, ErrorMessage = "El número de documento no puede exceder 50 caracteres")]
        public string? NumeroDocumento { get; set; }
        [StringLength(20, ErrorMessage = "La serie no puede exceder 20 caracteres")]
        public string? SerieDocumento { get; set; }
        [StringLength(500, ErrorMessage = "Las observaciones no pueden exceder 500 caracteres")]
        public string? Observaciones { get; set; }
    }
}
