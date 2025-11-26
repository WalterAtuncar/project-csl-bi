using System;
using System.ComponentModel.DataAnnotations;

namespace Data.Model.Request.caja
{
    // ================================================
    // REQUESTS PARA INGRESOS MENSUALES
    // ================================================
    
    public class CreateIngresoMensualRequest
    {
        [Required(ErrorMessage = "El ID de caja mayor es requerido")]
        public int IdCajaMayor { get; set; }
        
        [Required(ErrorMessage = "El tipo de ingreso es requerido")]
        public int IdTipoIngresoMensual { get; set; }
        
        [Required(ErrorMessage = "El concepto de ingreso es requerido")]
        [StringLength(250, ErrorMessage = "El concepto no puede exceder 250 caracteres")]
        public string ConceptoIngreso { get; set; }
        
        [Required(ErrorMessage = "La fecha de ingreso es requerida")]
        public DateTime FechaIngreso { get; set; }
        
        [Required(ErrorMessage = "El monto de ingreso es requerido")]
        [Range(0.01, double.MaxValue, ErrorMessage = "El monto debe ser mayor a cero")]
        public decimal MontoIngreso { get; set; }
        
        [StringLength(50, ErrorMessage = "El número de documento no puede exceder 50 caracteres")]
        public string NumeroDocumento { get; set; }
        
        [StringLength(150, ErrorMessage = "El origen no puede exceder 150 caracteres")]
        public string Origen { get; set; }
        
        [StringLength(500, ErrorMessage = "Las observaciones no pueden exceder 500 caracteres")]
        public string Observaciones { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int InsertaIdUsuario { get; set; }
    }

    public class UpdateIngresoMensualRequest
    {
        [Required(ErrorMessage = "El ID de ingreso mensual es requerido")]
        public int IdIngresoMensual { get; set; }
        
        [Required(ErrorMessage = "El concepto de ingreso es requerido")]
        [StringLength(250, ErrorMessage = "El concepto no puede exceder 250 caracteres")]
        public string ConceptoIngreso { get; set; }
        
        [Required(ErrorMessage = "La fecha de ingreso es requerida")]
        public DateTime FechaIngreso { get; set; }
        
        [Required(ErrorMessage = "El monto de ingreso es requerido")]
        [Range(0.01, double.MaxValue, ErrorMessage = "El monto debe ser mayor a cero")]
        public decimal MontoIngreso { get; set; }
        
        [StringLength(50, ErrorMessage = "El número de documento no puede exceder 50 caracteres")]
        public string NumeroDocumento { get; set; }
        
        [StringLength(150, ErrorMessage = "El origen no puede exceder 150 caracteres")]
        public string Origen { get; set; }
        
        [StringLength(500, ErrorMessage = "Las observaciones no pueden exceder 500 caracteres")]
        public string Observaciones { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int ActualizaIdUsuario { get; set; }
    }

    public class GetIngresoMensualListRequest
    {
        public int? IdCajaMayor { get; set; }
        
        public int? IdTipoIngresoMensual { get; set; }
        
        public DateTime? FechaInicio { get; set; }
        
        public DateTime? FechaFin { get; set; }
        
        public int? Estado { get; set; }
        
        public int PageNumber { get; set; } = 1;
        
        public int PageSize { get; set; } = 50;
    }

    public class DeleteIngresoMensualRequest
    {
        [Required(ErrorMessage = "El ID de ingreso mensual es requerido")]
        public int IdIngresoMensual { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int ActualizaIdUsuario { get; set; }
    }

    // ================================================
    // REQUESTS PARA EGRESOS MENSUALES
    // ================================================
    
    public class CreateEgresoMensualRequest
    {
        [Required(ErrorMessage = "El ID de caja mayor es requerido")]
        public int IdCajaMayor { get; set; }
        
        [Required(ErrorMessage = "El tipo de egreso es requerido")]
        public int IdTipoEgresoMensual { get; set; }
        
        [Required(ErrorMessage = "El concepto de egreso es requerido")]
        [StringLength(250, ErrorMessage = "El concepto no puede exceder 250 caracteres")]
        public string ConceptoEgreso { get; set; }
        
        [Required(ErrorMessage = "La fecha de egreso es requerida")]
        public DateTime FechaEgreso { get; set; }
        
        [Required(ErrorMessage = "El monto de egreso es requerido")]
        [Range(0.01, double.MaxValue, ErrorMessage = "El monto debe ser mayor a cero")]
        public decimal MontoEgreso { get; set; }
        
        [StringLength(50, ErrorMessage = "El número de documento no puede exceder 50 caracteres")]
        public string NumeroDocumento { get; set; }
        
        [StringLength(150, ErrorMessage = "El beneficiario no puede exceder 150 caracteres")]
        public string Beneficiario { get; set; }
        
        [StringLength(500, ErrorMessage = "Las observaciones no pueden exceder 500 caracteres")]
        public string Observaciones { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int InsertaIdUsuario { get; set; }
    }

    public class UpdateEgresoMensualRequest
    {
        [Required(ErrorMessage = "El ID de egreso mensual es requerido")]
        public int IdEgresoMensual { get; set; }
        
        [Required(ErrorMessage = "El concepto de egreso es requerido")]
        [StringLength(250, ErrorMessage = "El concepto no puede exceder 250 caracteres")]
        public string ConceptoEgreso { get; set; }
        
        [Required(ErrorMessage = "La fecha de egreso es requerida")]
        public DateTime FechaEgreso { get; set; }
        
        [Required(ErrorMessage = "El monto de egreso es requerido")]
        [Range(0.01, double.MaxValue, ErrorMessage = "El monto debe ser mayor a cero")]
        public decimal MontoEgreso { get; set; }
        
        [StringLength(50, ErrorMessage = "El número de documento no puede exceder 50 caracteres")]
        public string NumeroDocumento { get; set; }
        
        [StringLength(150, ErrorMessage = "El beneficiario no puede exceder 150 caracteres")]
        public string Beneficiario { get; set; }
        
        [StringLength(500, ErrorMessage = "Las observaciones no pueden exceder 500 caracteres")]
        public string Observaciones { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int ActualizaIdUsuario { get; set; }
    }

    public class GetEgresoMensualListRequest
    {
        public int? IdCajaMayor { get; set; }
        
        public int? IdTipoEgresoMensual { get; set; }
        
        public DateTime? FechaInicio { get; set; }
        
        public DateTime? FechaFin { get; set; }
        
        public int? Estado { get; set; }
        
        public int PageNumber { get; set; } = 1;
        
        public int PageSize { get; set; } = 50;
    }

    public class DeleteEgresoMensualRequest
    {
        [Required(ErrorMessage = "El ID de egreso mensual es requerido")]
        public int IdEgresoMensual { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int ActualizaIdUsuario { get; set; }
    }
}
