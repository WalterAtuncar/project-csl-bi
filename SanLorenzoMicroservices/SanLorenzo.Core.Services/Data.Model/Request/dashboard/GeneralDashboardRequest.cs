using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.dashboard
{
    public class GeneralDashboardRequest
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
        /// Tipo de período para el gráfico de ingresos: "daily", "weekly", "monthly"
        /// </summary>
        [Required]
        [RegularExpression("^(daily|weekly|monthly)$", ErrorMessage = "PeriodType debe ser 'daily', 'weekly' o 'monthly'")]
        public string PeriodType { get; set; } = "monthly";

        /// <summary>
        /// Filtro rápido aplicado: "today", "week", "month", "quarter", "custom"
        /// </summary>
        public string QuickFilter { get; set; } = "month";

        /// <summary>
        /// Criterio de ordenamiento para el ranking de especialidades: "patients" o "revenue"
        /// </summary>
        [RegularExpression("^(patients|revenue)$", ErrorMessage = "RankingCriteria debe ser 'patients' o 'revenue'")]
        public string RankingCriteria { get; set; } = "patients";

        /// <summary>
        /// Número máximo de transacciones recientes a retornar
        /// </summary>
        [Range(1, 100)]
        public int MaxRecentTransactions { get; set; } = 5;

        /// <summary>
        /// Número máximo de especialidades en el ranking
        /// </summary>
        [Range(1, 20)]
        public int MaxSpecialtiesRanking { get; set; } = 5;
    }

}
