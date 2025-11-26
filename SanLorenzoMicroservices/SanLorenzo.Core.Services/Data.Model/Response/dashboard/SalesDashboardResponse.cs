using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.dashboard
{
    public class SalesDashboardResponse
    {
        /// <summary>
        /// Rango de fechas aplicado en la consulta
        /// </summary>
        public DateRangeInfo DateRange { get; set; }

        /// <summary>
        /// Comparación de ventas por tipo de documento
        /// </summary>
        public List<DocumentTypeSales> SalesByDocumentType { get; set; }

        /// <summary>
        /// Comparación entre atenciones médicas y productos de farmacia
        /// </summary>
        public List<CategoryComparison> MedicalVsPharmacy { get; set; }

        /// <summary>
        /// Top productos de farmacia más vendidos
        /// </summary>
        public List<TopPharmacyProduct> TopPharmacyProducts { get; set; }

        /// <summary>
        /// Análisis detallado de atenciones médicas
        /// </summary>
        public List<MedicalAttentionAnalysis> MedicalAttentionsDetail { get; set; }

        /// <summary>
        /// Tendencia diaria de ventas
        /// </summary>
        public List<DailySalesTrend> DailySalesTrend { get; set; }

        /// <summary>
        /// Análisis de descuentos y márgenes
        /// </summary>
        public List<DiscountAnalysis> DiscountAnalysis { get; set; }

        /// <summary>
        /// Estadísticas generales del período
        /// </summary>
        public GeneralSalesStats GeneralStats { get; set; }

        /// <summary>
        /// Ventas recientes con detalle
        /// </summary>
        public List<RecentSale> RecentSales { get; set; }

        /// <summary>
        /// Análisis por rangos de precio (opcional)
        /// </summary>
        public List<PriceRangeAnalysis> PriceRangeAnalysis { get; set; }

        /// <summary>
        /// Metadatos del dashboard
        /// </summary>
        public SalesDashboardMetadata Metadata { get; set; }
    }

    /// <summary>
    /// Información del rango de fechas aplicado
    /// </summary>
   /* public class DateRangeInfo
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int TotalDays { get; set; }
        public string PeriodDescription { get; set; }
    }*/

    /// <summary>
    /// Ventas por tipo de documento
    /// </summary>
    public class DocumentTypeSales
    {
        public string DocumentType { get; set; }
        public int DocumentCode { get; set; }
        public int TotalSales { get; set; }
        public decimal TotalValueWithoutTax { get; set; }
        public decimal TotalTax { get; set; }
        public decimal TotalWithTax { get; set; }
        public decimal AverageSale { get; set; }
        public decimal PercentageOfTotal { get; set; }
        public string FormattedTotal { get; set; }
    }

    /// <summary>
    /// Comparación entre categorías de productos
    /// </summary>
    public class CategoryComparison
    {
        public string Category { get; set; }
        public int TotalSales { get; set; }
        public int TotalItems { get; set; }
        public decimal TotalQuantity { get; set; }
        public decimal TotalValueWithoutTax { get; set; }
        public decimal TotalTax { get; set; }
        public decimal TotalWithTax { get; set; }
        public decimal AverageItemPrice { get; set; }
        public decimal PercentageOfTotal { get; set; }
        public string FormattedTotal { get; set; }
        public string Color { get; set; }
    }

    /// <summary>
    /// Top productos de farmacia
    /// </summary>
    public class TopPharmacyProduct
    {
        public string ProductId { get; set; }
        public string ProductName { get; set; }
        public int TimesSold { get; set; }
        public decimal TotalQuantity { get; set; }
        public decimal TotalSales { get; set; }
        public decimal AveragePrice { get; set; }
        public decimal PercentageOfPharmacy { get; set; }
        public string FormattedTotal { get; set; }
        public int Rank { get; set; }
    }

    /// <summary>
    /// Análisis detallado de atenciones médicas
    /// </summary>
    public class MedicalAttentionAnalysis
    {
        public string AttentionType { get; set; }
        public int TotalAttentions { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal AveragePrice { get; set; }
        public decimal MinPrice { get; set; }
        public decimal MaxPrice { get; set; }
        public decimal PercentageOfAttentions { get; set; }
        public string FormattedRevenue { get; set; }
    }

    /// <summary>
    /// Tendencia diaria de ventas
    /// </summary>
    public class DailySalesTrend
    {
        public DateTime SaleDate { get; set; }
        public string WeekDay { get; set; }
        public int DailySales { get; set; }
        public decimal TotalSales { get; set; }
        public decimal MedicalAttentionSales { get; set; }
        public decimal PharmacySales { get; set; }
        public decimal PercentageAttentions { get; set; }
        public decimal PercentagePharmacy { get; set; }
        public string FormattedDate { get; set; }
        public string FormattedTotal { get; set; }
    }

    /// <summary>
    /// Análisis de descuentos
    /// </summary>
    public class DiscountAnalysis
    {
        public string Category { get; set; }
        public int TotalItems { get; set; }
        public decimal TotalDiscounts { get; set; }
        public decimal AverageDiscount { get; set; }
        public int ItemsWithDiscount { get; set; }
        public decimal PercentageWithDiscount { get; set; }
        public decimal TotalWithoutTax { get; set; }
        public decimal TotalTax { get; set; }
        public decimal TotalWithTax { get; set; }
        public string FormattedTotalDiscounts { get; set; }
        public string FormattedTotal { get; set; }
    }

    /// <summary>
    /// Estadísticas generales del período
    /// </summary>
    public class GeneralSalesStats
    {
        public int TotalSales { get; set; }
        public int TotalItems { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal AverageSalePerInvoice { get; set; }
        public int SalesWithAttentions { get; set; }
        public int SalesWithPharmacy { get; set; }
        public decimal AttentionRevenue { get; set; }
        public decimal PharmacyRevenue { get; set; }
        public decimal PercentageRevenueAttentions { get; set; }
        public decimal PercentageRevenuePharmacy { get; set; }
        public decimal PercentageSalesWithAttentions { get; set; }
        public decimal PercentageSalesWithPharmacy { get; set; }
        public string FormattedTotalRevenue { get; set; }
        public string FormattedAttentionRevenue { get; set; }
        public string FormattedPharmacyRevenue { get; set; }
    }

    /// <summary>
    /// Venta reciente
    /// </summary>
    public class RecentSale
    {
        public string SaleId { get; set; }
        public DateTime SaleDate { get; set; }
        public string DocumentType { get; set; }
        public decimal TotalSale { get; set; }
        public int ItemsCount { get; set; }
        public decimal AttentionsAmount { get; set; }
        public decimal PharmacyAmount { get; set; }
        public string FormattedDate { get; set; }
        public string FormattedTotal { get; set; }
        public string FormattedAttentions { get; set; }
        public string FormattedPharmacy { get; set; }
        public bool HasAttentions { get; set; }
        public bool HasPharmacy { get; set; }
    }

    /// <summary>
    /// Análisis por rangos de precio
    /// </summary>
    public class PriceRangeAnalysis
    {
        public string Category { get; set; }
        public string PriceRange { get; set; }
        public int ItemsCount { get; set; }
        public decimal TotalSales { get; set; }
        public decimal AverageSale { get; set; }
        public decimal PercentageWithinCategory { get; set; }
        public string FormattedTotal { get; set; }
        public int SortOrder { get; set; }
    }

    /// <summary>
    /// Detalle de una venta específica
    /// </summary>
    public class SaleDetail
    {
        public string SaleDetailId { get; set; }
        public string ProductDescription { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string ProductType { get; set; }
        public bool IsMedicalAttention { get; set; }
        public string FormattedPrice { get; set; }
    }

    /// <summary>
    /// Request para obtener detalle de una venta específica
    /// </summary>
    public class SaleDetailRequest
    {
        [Required]
        public string SaleId { get; set; }
    }

    /// <summary>
    /// Response para detalle de venta específica
    /// </summary>
    public class SaleDetailResponse
    {
        public string SaleId { get; set; }
        public DateTime SaleDate { get; set; }
        public string DocumentType { get; set; }
        public decimal TotalAmount { get; set; }
        public List<SaleDetail> Details { get; set; }
        public string FormattedTotal { get; set; }
        public string FormattedDate { get; set; }
    }

    /// <summary>
    /// Metadatos del dashboard de ventas
    /// </summary>
    public class SalesDashboardMetadata
    {
        public DateTime LastUpdated { get; set; }
        public long ProcessingTimeMs { get; set; }
        public int TotalRecordsProcessed { get; set; }
        public string ApiVersion { get; set; }
        public SalesDashboardConfig Config { get; set; }
        public string GeneratedBy { get; set; }
    }

    /// <summary>
    /// Configuraciones del dashboard de ventas
    /// </summary>
    public class SalesDashboardConfig
    {
        public string Currency { get; set; } = "PEN";
        public string CurrencySymbol { get; set; } = "S/.";
        public string TimeZone { get; set; } = "America/Lima";
        public string DateFormat { get; set; } = "dd/MM/yyyy";
        public string Language { get; set; } = "es";
        public string MedicalAttentionProductId { get; set; } = "N001-PE000015780";
    }

    // ===== ENUMS =====

    /// <summary>
    /// Tipos de análisis disponibles
    /// </summary>
    public enum SalesAnalysisType
    {
        DocumentType,
        CategoryComparison,
        TopProducts,
        MedicalAttentions,
        DailyTrend,
        DiscountAnalysis,
        PriceRange
    }

    /// <summary>
    /// Categorías de productos
    /// </summary>
    public enum ProductCategory
    {
        MedicalAttention,
        Pharmacy
    }

    /// <summary>
    /// Tipos de documento
    /// </summary>
    public enum DocumentType
    {
        Factura = 1,
        ReciboHonorarios = 2,
        BoletaVenta = 3,
        LiquidacionCompra = 4,
        BoletoCompaniaAviacion = 5,
        CartaPorteAereo = 6,
        NotaCredito = 7,
        NotaDebito = 8,
        GuiaRemision = 9,
        ReciboArrendamiento = 10,
        PolizaEmitidaBolsaValores = 11,
        TicketCintaMaquinaReg = 12,
        DocumentoEmitidoBancos = 13,
        ReciboServiciosPublicos = 14,
        BoletoTransporteUrbano = 15,
        BoletoTransporteProvincia = 16,
        DocumentoEmitidoIglesia = 17,
        DocumentoEmitidoAFP = 18,
        BoletoEspectaculosPublicos = 19,
        CertificadoRetencionPagos = 20,
        EmbarqueTransporteMaritimo = 21,
        ComprobanteOperacionesNoHabilitadas = 22,
        PolizaAdjudicacionRemates = 23,
        CertificadoPagoPetroperu = 24,
        DocumentoPercepcion = 40,
        PolizaImportaciones = 50,
        ComprobanteNoDomiciliado = 91,
        LiquidacionMecanizadaMunicipalidad = 92,
        DeclaracionJurada = 93,
        BoletaPagoSunat = 94,
        Otros = 99,
        BancoCreditoMN = 201,
        BancoCreditoME = 202,
        BancoNacionDetracci = 207,
        BancoContinentalMN = 210,
        BancoContinentalME = 211,
        DocumentosNoDeducibles = 299,
        CajaSoles = 300,
        CajaDolares = 301,
        Cajamarca = 302,
        NotaAbono = 307,
        Cheque = 309,
        NotaEntradaAlmacen = 311,
        NotaSalidaAlmacen = 312,
        NotaDevolucionSalida = 313,
        NotaDevolucionIngreso = 314,
        ReciboIngreso = 320,
        PapeletaEmpoce = 321,
        ComprobantePago = 322,
        NotaCargo = 328,
        OperacionesReembolsoCajaChica = 332,
        LetrasPorCobrar = 333,
        LetrasPorPagar = 334,
        AsientosDiario = 335,
        DiarioCompras = 336,
        DiarioVentas = 337,
        DiarioReciboHonorarios = 339,
        DiarioImportaciones = 340,
        DiarioLiquidacionCompras = 341,
        OrdenCompra = 404,
        Planilla = 405,
        Memorandum = 407,
        Contrato = 408,
        Informe = 409,
        Letra = 411,
        Pagare = 412,
        OrdenProduccion = 413,
        ParteDiarioProduccion = 417,
        GuiaIngresoAlmProdTerminados = 418,
        GuiaDevolucionAlmacenProdTerminados = 420,
        POS = 421,
        ValeConsumo = 422,
        ReporteDiarioDespacho = 423,
        FacturasPorPagar = 424,
        FacturasPorCobrar = 425,
        FondoFijoAdministracion = 426,
        CartaInstruccionPagoPlanilla = 427,
        DocumentoReembolso = 428,
        DiarioDocumentosReembolso = 429,
        Pedido = 430,
        Cotizacion = 431,
        DocumentoPOS = 432,
        DocumentoAdelanto = 433,
        GuiaRemisionCompras = 434,
        Importaciones = 435,
        OrdenTrabajo = 436,
        FormatoUnicoFacturacion = 437,
        GuiaInterna = 438,
        GuiaTrasladoTienda = 439,
        EgresoCajaOcupacional = 500,
        IngresoCajaOcupacional = 501,
        EgresoCajaAsistencial = 502,
        IngresoCajaAsistencial = 503,
        EgresoCajaFarmacia = 504,
        IngresoCajaFarmacia = 505,
        ReciboInterno = 506,
        TicketMedicinas = 507,
        TicketHospitalizacion = 508,
        EgresoCajaMTC = 509,
        EgresoCajaGinecologia = 510,
        EgresoCajaRehabilitacion = 511,
        EgresoCajaSolidaridad = 512,
        ReciboHospitalSolidaridad = 513
    }
}
