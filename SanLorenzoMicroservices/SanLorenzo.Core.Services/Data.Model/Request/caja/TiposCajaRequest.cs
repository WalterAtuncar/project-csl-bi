using System.ComponentModel.DataAnnotations;

namespace Data.Model.Request.caja
{
    // ================================================
    // REQUESTS PARA TIPO CAJA
    // ================================================
    
    public class CreateTipoCajaRequest
    {
        [Required(ErrorMessage = "El nombre del tipo de caja es requerido")]
        [StringLength(100, ErrorMessage = "El nombre no puede exceder 100 caracteres")]
        public string NombreTipoCaja { get; set; }
        
        [StringLength(250, ErrorMessage = "La descripción no puede exceder 250 caracteres")]
        public string Descripcion { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int InsertaIdUsuario { get; set; }
    }

    public class UpdateTipoCajaRequest
    {
        [Required(ErrorMessage = "El ID del tipo de caja es requerido")]
        public int IdTipoCaja { get; set; }
        
        [Required(ErrorMessage = "El nombre del tipo de caja es requerido")]
        [StringLength(100, ErrorMessage = "El nombre no puede exceder 100 caracteres")]
        public string NombreTipoCaja { get; set; }
        
        [StringLength(250, ErrorMessage = "La descripción no puede exceder 250 caracteres")]
        public string Descripcion { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int ActualizaIdUsuario { get; set; }
    }

    public class DeleteTipoCajaRequest
    {
        [Required(ErrorMessage = "El ID del tipo de caja es requerido")]
        public int IdTipoCaja { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int ActualizaIdUsuario { get; set; }
    }

    public class GetTiposCajaRequest
    {
        public bool IncludeInactive { get; set; } = false;
    }

    // ================================================
    // REQUESTS PARA TIPO INGRESO MENSUAL
    // ================================================
    
    public class CreateTipoIngresoMensualRequest
    {
        [Required(ErrorMessage = "El nombre del tipo de ingreso es requerido")]
        [StringLength(100, ErrorMessage = "El nombre no puede exceder 100 caracteres")]
        public string NombreTipoIngreso { get; set; }
        
        [StringLength(250, ErrorMessage = "La descripción no puede exceder 250 caracteres")]
        public string Descripcion { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int InsertaIdUsuario { get; set; }
    }

    public class UpdateTipoIngresoMensualRequest
    {
        [Required(ErrorMessage = "El ID del tipo de ingreso es requerido")]
        public int IdTipoIngresoMensual { get; set; }
        
        [Required(ErrorMessage = "El nombre del tipo de ingreso es requerido")]
        [StringLength(100, ErrorMessage = "El nombre no puede exceder 100 caracteres")]
        public string NombreTipoIngreso { get; set; }
        
        [StringLength(250, ErrorMessage = "La descripción no puede exceder 250 caracteres")]
        public string Descripcion { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int ActualizaIdUsuario { get; set; }
    }

    public class DeleteTipoIngresoMensualRequest
    {
        [Required(ErrorMessage = "El ID del tipo de ingreso es requerido")]
        public int IdTipoIngresoMensual { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int ActualizaIdUsuario { get; set; }
    }

    public class GetTiposIngresoMensualRequest
    {
        public bool IncludeInactive { get; set; } = false;
    }

    // ================================================
    // REQUESTS PARA TIPO EGRESO MENSUAL
    // ================================================
    
    public class CreateTipoEgresoMensualRequest
    {
        [Required(ErrorMessage = "El nombre del tipo de egreso es requerido")]
        [StringLength(100, ErrorMessage = "El nombre no puede exceder 100 caracteres")]
        public string NombreTipoEgreso { get; set; }
        
        [StringLength(250, ErrorMessage = "La descripción no puede exceder 250 caracteres")]
        public string Descripcion { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int InsertaIdUsuario { get; set; }
    }

    public class UpdateTipoEgresoMensualRequest
    {
        [Required(ErrorMessage = "El ID del tipo de egreso es requerido")]
        public int IdTipoEgresoMensual { get; set; }
        
        [Required(ErrorMessage = "El nombre del tipo de egreso es requerido")]
        [StringLength(100, ErrorMessage = "El nombre no puede exceder 100 caracteres")]
        public string NombreTipoEgreso { get; set; }
        
        [StringLength(250, ErrorMessage = "La descripción no puede exceder 250 caracteres")]
        public string Descripcion { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int ActualizaIdUsuario { get; set; }
    }

    public class DeleteTipoEgresoMensualRequest
    {
        [Required(ErrorMessage = "El ID del tipo de egreso es requerido")]
        public int IdTipoEgresoMensual { get; set; }
        
        [Required(ErrorMessage = "El usuario es requerido")]
        public int ActualizaIdUsuario { get; set; }
    }

    public class GetTiposEgresoMensualRequest
    {
        public bool IncludeInactive { get; set; } = false;
    }

    // ================================================
    // REQUEST PARA SALDO CAJA
    // ================================================
    
    public class GetSaldoCajaRequest
    {
        public int? IdTipoCaja { get; set; }
    }
}
