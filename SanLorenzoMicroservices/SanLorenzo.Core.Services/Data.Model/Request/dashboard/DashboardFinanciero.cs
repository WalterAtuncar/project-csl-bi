using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.dashboard
{
    /// <summary>
    /// Enumerador para el tipo de distribución
    /// </summary>
    public enum TipoDistribucion
    {
        Mensual,
        Semanal
    }

    /// <summary>
    /// DTO para los parámetros de entrada del Dashboard Financiero
    /// </summary>
    public class DashboardFinancieroRequestDto
    {
        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        /// <summary>
        /// Clientes separados por comas. Ejemplo: "2,8,9"
        /// </summary>
        public string ClienteEsAgente { get; set; } = "2,8,9";

        /// <summary>
        /// Código del documento de egreso
        /// </summary>
        public int DocumentoEgreso { get; set; } = 502;

        /// <summary>
        /// Distribución: 'mensual' o 'semanal'
        /// </summary>
        public string Distribucion { get; set; } = "mensual";

    }

    /// <summary>
    /// DTO para la respuesta completa del Dashboard Financiero
    /// </summary>
    public class DashboardFinancieroResponseDto
    {
        /// <summary>
        /// Resumen comparativo (Query 1)
        /// </summary>
        public ResumenComparativoDto ResumenComparativo { get; set; } = new();

        /// <summary>
        /// Datos por período (Query 2 - mensual o semanal)
        /// </summary>
        public List<PeriodoFinancieroDto> DatosPorPeriodo { get; set; } = new();

        /// <summary>
        /// Datos por consultorio (Query 3)
        /// </summary>
        public List<ConsultorioVentasDto> DatosPorConsultorio { get; set; } = new();

        /// <summary>
        /// Información de los parámetros utilizados
        /// </summary>
        public ParametrosUtilizadosDto ParametrosUtilizados { get; set; } = new();
    }

    /// <summary>
    /// DTO para el resumen comparativo (Query 1)
    /// </summary>
    public class ResumenComparativoDto
    {
        // Período Actual
        public int PacientesActual { get; set; }
        public decimal IngresosActual { get; set; }
        public decimal EgresosActual { get; set; }

        // Período Anterior
        public int PacientesAnterior { get; set; }
        public decimal IngresosAnterior { get; set; }
        public decimal EgresosAnterior { get; set; }

        // Propiedades calculadas
        public decimal BalanceActual => IngresosActual - EgresosActual;
        public decimal BalanceAnterior => IngresosAnterior - EgresosAnterior;
        public decimal DiferenciaIngresos => IngresosActual - IngresosAnterior;
        public decimal DiferenciaEgresos => EgresosActual - EgresosAnterior;
        public decimal DiferenciaPacientes => PacientesActual - PacientesAnterior;
        public decimal DiferenciaBalance => BalanceActual - BalanceAnterior;

        // Porcentajes de crecimiento
        public decimal? PorcentajeCrecimientoIngresos =>
            IngresosAnterior != 0 ? ((IngresosActual - IngresosAnterior) / IngresosAnterior) * 100 : null;

        public decimal? PorcentajeCrecimientoEgresos =>
            EgresosAnterior != 0 ? ((EgresosActual - EgresosAnterior) / EgresosAnterior) * 100 : null;

        public decimal? PorcentajeCrecimientoPacientes =>
            PacientesAnterior != 0 ? ((decimal)(PacientesActual - PacientesAnterior) / PacientesAnterior) * 100 : null;
    }

    /// <summary>
    /// DTO para datos por período (Query 2 - mensual o semanal)
    /// </summary>
    public class PeriodoFinancieroDto
    {
        public int Anio { get; set; }

        // Para distribución mensual
        public int? Mes { get; set; }
        public string? NombreMes { get; set; }
        public decimal? IngresosMes { get; set; }
        public decimal? EgresosMes { get; set; }
        public decimal? BalanceMes { get; set; }

        // Para distribución semanal
        public int? NumeroSemana { get; set; }
        public string? NombreSemana { get; set; }
        public decimal? IngresosSemana { get; set; }
        public decimal? EgresosSemana { get; set; }
        public decimal? BalanceSemana { get; set; }

        // Propiedades comunes
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }

        // Propiedades calculadas
        public decimal Ingresos => IngresosMes ?? IngresosSemana ?? 0;
        public decimal Egresos => EgresosMes ?? EgresosSemana ?? 0;
        public decimal Balance => BalanceMes ?? BalanceSemana ?? 0;
        public string Nombre => NombreMes ?? NombreSemana ?? "";
        public bool EsMensual => Mes.HasValue;
        public bool EsSemanal => NumeroSemana.HasValue;
    }

    /// <summary>
    /// DTO para datos por consultorio (Query 3)
    /// </summary>
    public class ConsultorioVentasDto
    {
        public string NombreConsultorio { get; set; } = string.Empty;
        public int CantidadVentas { get; set; }
        public decimal MontoTotal { get; set; }

        // Propiedades calculadas
        public decimal PromedioVenta => CantidadVentas > 0 ? MontoTotal / CantidadVentas : 0;
    }

    /// <summary>
    /// DTO para información de parámetros utilizados
    /// </summary>
    public class ParametrosUtilizadosDto
    {
        public DateTime PeriodoActualInicio { get; set; }
        public DateTime PeriodoActualFin { get; set; }
        public DateTime PeriodoAnteriorInicio { get; set; }
        public DateTime PeriodoAnteriorFin { get; set; }
        public string ClientesIncluidos { get; set; } = string.Empty;
        public int DocumentoEgresoUtilizado { get; set; }
        public string TipoDistribucion { get; set; } = string.Empty;
        public int DiasEnPeriodo { get; set; }
    }

    /// <summary>
    /// DTO para respuesta del resumen mensual específico
    /// </summary>
    public class ResumenMensualDto : PeriodoFinancieroDto
    {
        public new int Mes { get; set; }
        public new string NombreMes { get; set; } = string.Empty;
        public new decimal IngresosMes { get; set; }
        public new decimal EgresosMes { get; set; }
        public new decimal BalanceMes { get; set; }
    }

    /// <summary>
    /// DTO para respuesta del resumen semanal específico
    /// </summary>
    public class ResumenSemanalDto : PeriodoFinancieroDto
    {
        public new int NumeroSemana { get; set; }
        public new string NombreSemana { get; set; } = string.Empty;
        public new decimal IngresosSemana { get; set; }
        public new decimal EgresosSemana { get; set; }
        public new decimal BalanceSemana { get; set; }
    }

    /// <summary>
    /// DTO para estadísticas adicionales
    /// </summary>
    public class EstadisticasFinancierasDto
    {
        public decimal TotalIngresos { get; set; }
        public decimal TotalEgresos { get; set; }
        public decimal TotalBalance { get; set; }
        public decimal PromedioIngresosPorPeriodo { get; set; }
        public decimal PromedioEgresosPorPeriodo { get; set; }
        public int TotalVentas { get; set; }
        public int TotalConsultorios { get; set; }
        public ConsultorioVentasDto? ConsultorioMayorVenta { get; set; }
        public ConsultorioVentasDto? ConsultorioMenorVenta { get; set; }
    }

    /// <summary>
    /// Extensiones para facilitar el trabajo con los DTOs
    /// </summary>
    public static class DashboardFinancieroExtensions
    {
        /// <summary>
        /// Calcula estadísticas adicionales basadas en los datos del dashboard
        /// </summary>
        public static EstadisticasFinancierasDto CalcularEstadisticas(this DashboardFinancieroResponseDto dashboard)
        {
            var estadisticas = new EstadisticasFinancierasDto();

            if (dashboard.DatosPorPeriodo?.Any() == true)
            {
                estadisticas.TotalIngresos = dashboard.DatosPorPeriodo.Sum(p => p.Ingresos);
                estadisticas.TotalEgresos = dashboard.DatosPorPeriodo.Sum(p => p.Egresos);
                estadisticas.TotalBalance = estadisticas.TotalIngresos - estadisticas.TotalEgresos;
                estadisticas.PromedioIngresosPorPeriodo = estadisticas.TotalIngresos / dashboard.DatosPorPeriodo.Count;
                estadisticas.PromedioEgresosPorPeriodo = estadisticas.TotalEgresos / dashboard.DatosPorPeriodo.Count;
            }

            if (dashboard.DatosPorConsultorio?.Any() == true)
            {
                estadisticas.TotalVentas = dashboard.DatosPorConsultorio.Sum(c => c.CantidadVentas);
                estadisticas.TotalConsultorios = dashboard.DatosPorConsultorio.Count;
                estadisticas.ConsultorioMayorVenta = dashboard.DatosPorConsultorio
                    .OrderByDescending(c => c.MontoTotal)
                    .FirstOrDefault();
                estadisticas.ConsultorioMenorVenta = dashboard.DatosPorConsultorio
                    .OrderBy(c => c.MontoTotal)
                    .FirstOrDefault();
            }

            return estadisticas;
        }

        /// <summary>
        /// Convierte la respuesta a formato específico para exportación
        /// </summary>
        public static DashboardExportDto ToExportFormat(this DashboardFinancieroResponseDto dashboard)
        {
            return new DashboardExportDto
            {
                FechaGeneracion = DateTime.Now,
                Resumen = dashboard.ResumenComparativo,
                Periodos = dashboard.DatosPorPeriodo,
                Consultorios = dashboard.DatosPorConsultorio,
                Estadisticas = dashboard.CalcularEstadisticas()
            };
        }
    }

    /// <summary>
    /// DTO específico para exportación de datos
    /// </summary>
    public class DashboardExportDto
    {
        public DateTime FechaGeneracion { get; set; }
        public ResumenComparativoDto Resumen { get; set; } = new();
        public List<PeriodoFinancieroDto> Periodos { get; set; } = new();
        public List<ConsultorioVentasDto> Consultorios { get; set; } = new();
        public EstadisticasFinancierasDto Estadisticas { get; set; } = new();
    }

    /// <summary>
    /// DTO para validación de parámetros
    /// </summary>
    public class ParametrosValidacionDto
    {
        public bool EsValido { get; set; }
        public List<string> Errores { get; set; } = new();
        public List<string> Advertencias { get; set; } = new();

    }
}
