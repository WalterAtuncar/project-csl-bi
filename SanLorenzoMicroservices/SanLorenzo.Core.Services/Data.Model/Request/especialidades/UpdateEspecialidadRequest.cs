using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.especialidades
{
    public class UpdateEspecialidadRequest
    {
        [Required(ErrorMessage = "El nombre de la especialidad es requerido")]
        [StringLength(200, ErrorMessage = "El nombre no puede exceder 200 caracteres")]
        public string NombreEspecialidad { get; set; }

        [Range(0, 100, ErrorMessage = "El porcentaje debe estar entre 0 y 100")]
        public decimal PorcentajePago { get; set; }

        public int UserId { get; set; }
    }
}
