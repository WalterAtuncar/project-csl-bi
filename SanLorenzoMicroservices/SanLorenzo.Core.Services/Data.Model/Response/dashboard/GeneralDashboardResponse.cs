using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.dashboard
{
    public class GeneralDashboardResponse
    {
        /// <summary>
        /// Rango de fechas aplicado en la consulta
        /// </summary>
        public DateRangeInfo DateRange { get; set; }

        /// <summary>
        /// Estadísticas principales del dashboard
        /// </summary>
        public DashboardStats MainStats { get; set; }

        /// <summary>
        /// Datos para el gráfico de tendencia de ingresos
        /// </summary>
        public IncomeChartData IncomeChart { get; set; }

        /// <summary>
        /// Distribución de servicios con porcentajes
        /// </summary>
        public List<ServiceDistribution> ServicesDistribution { get; set; }

        /// <summary>
        /// Ranking de especialidades médicas
        /// </summary>
        public List<SpecialtyRanking> SpecialtiesRanking { get; set; }

        /// <summary>
        /// Lista de transacciones recientes
        /// </summary>
        public List<RecentTransaction> RecentTransactions { get; set; }

        /// <summary>
        /// Metadatos adicionales
        /// </summary>
        public DashboardMetadata Metadata { get; set; }
    }

    /// <summary>
    /// Información del rango de fechas aplicado
    /// </summary>
    public class DateRangeInfo
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string QuickFilter { get; set; }
        public int TotalDays { get; set; }
    }

    /// <summary>
    /// Estadísticas principales del dashboard (las 4 tarjetas principales)
    /// </summary>
    public class DashboardStats
    {
        /// <summary>
        /// Estadística de pacientes atendidos
        /// </summary>
        public StatCard PatientsAttended { get; set; }

        /// <summary>
        /// Estadística de ingresos diarios
        /// </summary>
        public StatCard DailyRevenue { get; set; }

        /// <summary>
        /// Estadística de consultas pendientes
        /// </summary>
        public StatCard PendingAppointments { get; set; }

        /// <summary>
        /// Estadística de tasa de ocupación
        /// </summary>
        public StatCard OccupancyRate { get; set; }
    }

    /// <summary>
    /// Modelo para cada tarjeta de estadística
    /// </summary>
    public class StatCard
    {
        /// <summary>
        /// Título de la estadística
        /// </summary>
        public string Title { get; set; }

        /// <summary>
        /// Valor actual (puede incluir formato como "S/. 28,651" o "87%")
        /// </summary>
        public string Value { get; set; }

        /// <summary>
        /// Valor numérico sin formato para cálculos
        /// </summary>
        public decimal NumericValue { get; set; }

        /// <summary>
        /// Tendencia en porcentaje (ej: "+12%", "-2%")
        /// </summary>
        public string Trend { get; set; }

        /// <summary>
        /// Dirección de la tendencia: "up", "down", "neutral"
        /// </summary>
        public string TrendDirection { get; set; }

        /// <summary>
        /// Valor numérico de la tendencia para cálculos
        /// </summary>
        public decimal TrendValue { get; set; }

        /// <summary>
        /// Descripción adicional (ej: "desde el mes pasado")
        /// </summary>
        public string TrendDescription { get; set; }
    }

    /// <summary>
    /// Datos para el gráfico de tendencia de ingresos
    /// </summary>
    public class IncomeChartData
    {
        /// <summary>
        /// Tipo de período: "daily", "weekly", "monthly"
        /// </summary>
        public string PeriodType { get; set; }

        /// <summary>
        /// Puntos de datos para el gráfico
        /// </summary>
        public List<IncomeDataPoint> DataPoints { get; set; }

        /// <summary>
        /// Valor máximo para normalización del gráfico
        /// </summary>
        public decimal MaxValue { get; set; }

        /// <summary>
        /// Valor mínimo para normalización del gráfico
        /// </summary>
        public decimal MinValue { get; set; }

        /// <summary>
        /// Total de ingresos en el período
        /// </summary>
        public decimal TotalRevenue { get; set; }

        /// <summary>
        /// Promedio de ingresos por período
        /// </summary>
        public decimal AverageRevenue { get; set; }
    }

    /// <summary>
    /// Punto de datos individual para el gráfico de ingresos
    /// </summary>
    public class IncomeDataPoint
    {
        /// <summary>
        /// Valor del ingreso
        /// </summary>
        public decimal Value { get; set; }

        /// <summary>
        /// Etiqueta para mostrar en el eje X (ej: "1 Mar", "Sem 1", "Ene")
        /// </summary>
        public string Label { get; set; }

        /// <summary>
        /// Fecha correspondiente al punto de datos
        /// </summary>
        public DateTime Date { get; set; }

        /// <summary>
        /// Porcentaje de altura normalizado para el gráfico (0-100)
        /// </summary>
        public decimal NormalizedHeight { get; set; }
    }

    /// <summary>
    /// Distribución de servicios con porcentajes
    /// </summary>
    public class ServiceDistribution
    {
        /// <summary>
        /// Nombre del servicio
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Porcentaje de utilización (0-100)
        /// </summary>
        public decimal Percentage { get; set; }

        /// <summary>
        /// Cantidad absoluta de servicios
        /// </summary>
        public int Count { get; set; }

        /// <summary>
        /// Color sugerido para la visualización (ej: "bg-primary", "bg-red-500")
        /// </summary>
        public string Color { get; set; }

        /// <summary>
        /// Ingresos generados por este servicio
        /// </summary>
        public decimal Revenue { get; set; }
    }

    /// <summary>
    /// Ranking de especialidades médicas
    /// </summary>
    public class SpecialtyRanking
    {
        /// <summary>
        /// Posición en el ranking (1, 2, 3, etc.)
        /// </summary>
        public int Rank { get; set; }

        /// <summary>
        /// Nombre de la especialidad
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Número de pacientes atendidos
        /// </summary>
        public int Patients { get; set; }

        /// <summary>
        /// Ingresos generados (valor numérico)
        /// </summary>
        public decimal Revenue { get; set; }

        /// <summary>
        /// Ingresos formateados para mostrar (ej: "S/. 28,500")
        /// </summary>
        public string FormattedRevenue { get; set; }

        /// <summary>
        /// Porcentaje del total de pacientes
        /// </summary>
        public decimal PatientPercentage { get; set; }

        /// <summary>
        /// Porcentaje del total de ingresos
        /// </summary>
        public decimal RevenuePercentage { get; set; }

        /// <summary>
        /// Cambio en la posición respecto al período anterior
        /// </summary>
        public int RankChange { get; set; }
    }

    /// <summary>
    /// Transacción reciente
    /// </summary>
    public class RecentTransaction
    {
        /// <summary>
        /// ID único de la transacción
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Nombre completo del paciente
        /// </summary>
        public string PatientName { get; set; }

        /// <summary>
        /// Tipo de servicio realizado
        /// </summary>
        public string Service { get; set; }

        /// <summary>
        /// Monto de la transacción (valor numérico)
        /// </summary>
        public decimal Amount { get; set; }

        /// <summary>
        /// Monto formateado para mostrar (ej: "S/. 150.00")
        /// </summary>
        public string FormattedAmount { get; set; }

        /// <summary>
        /// Estado de la transacción: "Completado", "Pendiente", "Anulado"
        /// </summary>
        public string Status { get; set; }

        /// <summary>
        /// Clase CSS para el color del estado
        /// </summary>
        public string StatusColor { get; set; }

        /// <summary>
        /// Fecha y hora de la transacción
        /// </summary>
        public DateTime Date { get; set; }

        /// <summary>
        /// Fecha formateada para mostrar (ej: "Mar 12, 2025")
        /// </summary>
        public string FormattedDate { get; set; }

        /// <summary>
        /// ID del paciente
        /// </summary>
        public string PatientId { get; set; }

        /// <summary>
        /// ID del médico que atendió
        /// </summary>
        public int? DoctorId { get; set; }

        /// <summary>
        /// Nombre del médico que atendió
        /// </summary>
        public string DoctorName { get; set; }

        /// <summary>
        /// Método de pago utilizado
        /// </summary>
        public string PaymentMethod { get; set; }
    }

    /// <summary>
    /// Metadatos adicionales del dashboard
    /// </summary>
    public class DashboardMetadata
    {
        /// <summary>
        /// Fecha y hora de la última actualización de datos
        /// </summary>
        public DateTime LastUpdated { get; set; }

        /// <summary>
        /// Tiempo de procesamiento de la consulta en milisegundos
        /// </summary>
        public long ProcessingTimeMs { get; set; }

        /// <summary>
        /// Total de registros procesados
        /// </summary>
        public int TotalRecordsProcessed { get; set; }

        /// <summary>
        /// Versión de la API
        /// </summary>
        public string ApiVersion { get; set; }

        /// <summary>
        /// Configuraciones aplicadas
        /// </summary>
        public DashboardConfig Config { get; set; }
    }

    /// <summary>
    /// Configuraciones del dashboard
    /// </summary>
    public class DashboardConfig
    {
        /// <summary>
        /// Moneda utilizada para mostrar los montos
        /// </summary>
        public string Currency { get; set; } = "PEN";

        /// <summary>
        /// Símbolo de la moneda
        /// </summary>
        public string CurrencySymbol { get; set; } = "S/.";

        /// <summary>
        /// Zona horaria del sistema
        /// </summary>
        public string TimeZone { get; set; }

        /// <summary>
        /// Formato de fecha preferido
        /// </summary>
        public string DateFormat { get; set; } = "MMM dd, yyyy";

        /// <summary>
        /// Idioma de la interfaz
        /// </summary>
        public string Language { get; set; } = "es";
    }

    // ===== ENUMS =====

    /// <summary>
    /// Tipos de período disponibles para el gráfico de ingresos
    /// </summary>
    public enum PeriodType
    {
        Daily,
        Weekly,
        Monthly
    }

    /// <summary>
    /// Filtros rápidos disponibles
    /// </summary>
    public enum QuickFilterType
    {
        Today,
        Week,
        Month,
        Quarter,
        Custom
    }

    /// <summary>
    /// Estados posibles de las transacciones
    /// </summary>
    public enum TransactionStatus
    {
        Completed,
        Pending,
        Cancelled
    }

    /// <summary>
    /// Criterios de ordenamiento para el ranking
    /// </summary>
    public enum RankingCriteria
    {
        Patients,
        Revenue
    }
}
