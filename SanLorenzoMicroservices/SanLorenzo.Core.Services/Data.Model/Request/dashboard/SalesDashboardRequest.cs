using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.dashboard
{
    public class SalesDashboardRequest
    {
        /// <summary>
        /// Fecha de inicio del rango a consultar
        /// </summary>
        [Required]
        public string StartDate { get; set; }

        /// <summary>
        /// Fecha de fin del rango a consultar
        /// </summary>
        [Required]
        public string EndDate { get; set; }

        /// <summary>
        /// Número máximo de resultados para rankings (Top productos, etc.)
        /// </summary>
        [Range(1, 50)]
        public int TopResults { get; set; } = 10;

        /// <summary>
        /// Incluir análisis detallado de rangos de precios
        /// </summary>
        public bool IncludePriceRangeAnalysis { get; set; } = true;

        /// <summary>
        /// Incluir tendencia diaria de ventas
        /// </summary>
        public bool IncludeDailyTrend { get; set; } = true;
    }

}
