import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { GeneralDashboardResponse } from './DashboardService';

// Interfaces para configuración de exportación
export interface ExportConfig {
  title: string;
  subtitle?: string;
  filename: string;
  includeCharts?: boolean;
  includeStats?: boolean;
  includeTransactions?: boolean;
  includeSpecialties?: boolean;
  includeServices?: boolean;
}

export interface PDFConfig extends ExportConfig {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ExcelConfig extends ExportConfig {
  sheetName?: string;
  includeCharts?: boolean;
}

// Interfaz para extender jsPDF con lastAutoTable
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

/**
 * Servicio para exportar datos del dashboard a PDF y Excel
 */
export class ExportService {
  
  /**
   * Exporta los datos del dashboard general a PDF
   */
  static async exportDashboardToPDF(
    data: GeneralDashboardResponse,
    config: PDFConfig
  ): Promise<void> {
    try {
      const doc = new jsPDF({
        orientation: config.orientation || 'portrait',
        unit: 'mm',
        format: config.format || 'a4'
      }) as ExtendedJsPDF;

      const margins = config.margins || { top: 20, right: 20, bottom: 20, left: 20 };
      let currentY = margins.top;

      // Configurar fuentes
      doc.setFont('helvetica');

      // Título principal
      doc.setFontSize(20);
      doc.setTextColor(30, 58, 138); // Color azul
      doc.text(config.title, margins.left, currentY);
      currentY += 15;

      // Subtítulo si existe
      if (config.subtitle) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(config.subtitle, margins.left, currentY);
        currentY += 10;
      }

      // Información del rango de fechas
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      /*const dateInfo = `Período: ${this.formatDate(data.dateRange.startDate)} - ${this.formatDate(data.dateRange.endDate)} (${data.dateRange.totalDays} días)`;
      doc.text(dateInfo, margins.left, currentY);
      currentY += 15;*/

      // Estadísticas principales
      if (config.includeStats !== false) {
        currentY = this.addStatsSection(doc, data, margins, currentY);
      }

      // Gráfico de ingresos
      if (config.includeCharts !== false) {
        currentY = this.addIncomeChart(doc, data, margins, currentY);
      }

      // Gráfico de distribución de servicios
      if (config.includeCharts !== false && config.includeServices !== false) {
        currentY = this.addServicesChart(doc, data, margins, currentY);
      }

      // Ranking de especialidades
      if (config.includeSpecialties !== false) {
        currentY = this.addSpecialtiesSection(doc, data, margins, currentY);
      }

      // Distribución de servicios (tabla)
      if (config.includeServices !== false) {
        currentY = this.addServicesSection(doc, data, margins, currentY);
      }

      // Transacciones recientes
      if (config.includeTransactions !== false) {
        currentY = this.addTransactionsSection(doc, data, margins, currentY);
      }

      // Información del reporte
      this.addFooter(doc);

      // Descargar el archivo
      doc.save(`${config.filename}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      throw new Error('Error al generar el archivo PDF');
    }
  }

  /**
   * Exporta los datos del dashboard general a Excel
   */
  static async exportDashboardToExcel(
    data: GeneralDashboardResponse,
    config: ExcelConfig
  ): Promise<void> {
    try {
      const workbook = XLSX.utils.book_new();

      // Hoja principal con resumen
      const summaryData = this.prepareSummaryData(data, config);
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

      // Hoja de estadísticas principales
      if (config.includeStats !== false) {
        const statsData = this.prepareStatsData(data);
        const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
        XLSX.utils.book_append_sheet(workbook, statsSheet, 'Estadísticas');
      }

      // Hoja de especialidades
      if (config.includeSpecialties !== false) {
        const specialtiesData = this.prepareSpecialtiesData(data);
        const specialtiesSheet = XLSX.utils.aoa_to_sheet(specialtiesData);
        XLSX.utils.book_append_sheet(workbook, specialtiesSheet, 'Especialidades');
      }

      // Hoja de servicios
      if (config.includeServices !== false) {
        const servicesData = this.prepareServicesData(data);
        const servicesSheet = XLSX.utils.aoa_to_sheet(servicesData);
        XLSX.utils.book_append_sheet(workbook, servicesSheet, 'Servicios');
      }

      // Hoja de transacciones
      if (config.includeTransactions !== false) {
        const transactionsData = this.prepareTransactionsData(data);
        const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData);
        XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transacciones');
      }

      // Hoja de datos del gráfico de ingresos
      const incomeData = this.prepareIncomeChartData(data);
      const incomeSheet = XLSX.utils.aoa_to_sheet(incomeData);
      XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Ingresos');

      // Descargar el archivo
      XLSX.writeFile(workbook, `${config.filename}.xlsx`);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      throw new Error('Error al generar el archivo Excel');
    }
  }

  // Métodos privados para PDF

  private static addStatsSection(
    doc: ExtendedJsPDF,
    data: GeneralDashboardResponse,
    margins: { top: number; right: number; bottom: number; left: number },
    startY: number
  ): number {
    let currentY = startY;

    // Título de sección
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('Estadísticas Principales', margins.left, currentY);
    currentY += 10;

    // Preparar datos para la tabla
    const statsData = [
      ['Métrica', 'Valor', 'Tendencia', 'Descripción'],
      [
        data.mainStats.patientsAttended.title,
        data.mainStats.patientsAttended.value,
        data.mainStats.patientsAttended.trend,
        data.mainStats.patientsAttended.trendDescription
      ],
      [
        data.mainStats.dailyRevenue.title,
        data.mainStats.dailyRevenue.value,
        data.mainStats.dailyRevenue.trend,
        data.mainStats.dailyRevenue.trendDescription
      ],
      [
        data.mainStats.pendingAppointments.title,
        data.mainStats.pendingAppointments.value,
        data.mainStats.pendingAppointments.trend,
        data.mainStats.pendingAppointments.trendDescription
      ],
      [
        data.mainStats.occupancyRate.title,
        data.mainStats.occupancyRate.value,
        data.mainStats.occupancyRate.trend,
        data.mainStats.occupancyRate.trendDescription
      ]
    ];

    autoTable(doc, {
      head: [statsData[0]],
      body: statsData.slice(1),
      startY: currentY,
      margin: { left: margins.left, right: margins.right },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 138] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : currentY + 50;
  }

  private static addIncomeChart(
    doc: ExtendedJsPDF,
    data: GeneralDashboardResponse,
    margins: { top: number; right: number; bottom: number; left: number },
    startY: number
  ): number {
    let currentY = startY;

    // Verificar si hay espacio suficiente, si no, agregar nueva página
    if (currentY > 180) {
      doc.addPage();
      currentY = margins.top;
    }

    // Título de sección
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('Tendencia de Ingresos', margins.left, currentY);
    currentY += 15;

    // Configuración del gráfico
    const chartWidth = 160;
    const chartHeight = 80;
    const chartX = margins.left;
    const chartY = currentY;

    // Dibujar marco del gráfico
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(chartX, chartY, chartWidth, chartHeight);

    // Dibujar barras del gráfico
    const dataPoints = data.incomeChart.dataPoints;
    const barWidth = chartWidth / dataPoints.length * 0.8;
    const barSpacing = chartWidth / dataPoints.length * 0.2;

    dataPoints.forEach((point, index) => {
      const barHeight = (point.normalizedHeight / 100) * (chartHeight - 10);
      const barX = chartX + (index * (barWidth + barSpacing)) + barSpacing / 2;
      const barY = chartY + chartHeight - barHeight - 5;

      // Dibujar barra
      doc.setFillColor(30, 58, 138);
      doc.rect(barX, barY, barWidth, barHeight, 'F');

      // Etiqueta del valor (solo si hay espacio)
      if (barHeight > 10) {
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        const valueText = `S/. ${(point.value / 1000).toFixed(0)}k`;
        const textWidth = doc.getTextWidth(valueText);
        doc.text(valueText, barX + (barWidth - textWidth) / 2, barY + barHeight / 2 + 1);
      }
    });

    // Etiquetas del eje X
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    dataPoints.forEach((point, index) => {
      const labelX = chartX + (index * (barWidth + barSpacing)) + barSpacing / 2;
      const labelY = chartY + chartHeight + 8;
      const labelText = point.label.length > 8 ? point.label.substring(0, 8) + '...' : point.label;
      const textWidth = doc.getTextWidth(labelText);
      doc.text(labelText, labelX + (barWidth - textWidth) / 2, labelY);
    });

    // Información adicional del gráfico
    currentY = chartY + chartHeight + 15;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total de ingresos: S/. ${data.incomeChart.totalRevenue.toLocaleString()}`, margins.left, currentY);
    doc.text(`Promedio: S/. ${data.incomeChart.averageRevenue.toLocaleString()}`, margins.left + 80, currentY);

    return currentY + 15;
  }

  private static addServicesChart(
    doc: ExtendedJsPDF,
    data: GeneralDashboardResponse,
    margins: { top: number; right: number; bottom: number; left: number },
    startY: number
  ): number {
    let currentY = startY;

    // Verificar si hay espacio suficiente
    if (currentY > 180) {
      doc.addPage();
      currentY = margins.top;
    }

    // Título de sección
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('Distribución de Servicios', margins.left, currentY);
    currentY += 15;

    // Configuración del gráfico de barras horizontales
    const chartWidth = 100;
    const chartHeight = Math.min(data.servicesDistribution.length * 12, 60);
    const chartX = margins.left;
    const chartY = currentY;

    // Colores para las barras
    const colors = [
      [59, 130, 246],   // blue
      [34, 197, 94],    // green
      [251, 191, 36],   // yellow
      [168, 85, 247],   // purple
      [239, 68, 68],    // red
      [245, 158, 11],   // amber
      [99, 102, 241],   // indigo
      [236, 72, 153],   // pink
    ];

    // Dibujar barras horizontales
    data.servicesDistribution.forEach((service, index) => {
      const barHeight = 8;
      const barY = chartY + (index * 12);
      const barWidth = (service.percentage / 100) * chartWidth;
      const color = colors[index % colors.length];

      // Dibujar barra
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(chartX, barY, barWidth, barHeight, 'F');

      // Etiqueta del servicio
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      const serviceName = service.name.length > 20 ? service.name.substring(0, 20) + '...' : service.name;
      doc.text(serviceName, chartX + chartWidth + 5, barY + 6);

      // Porcentaje
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`${service.percentage.toFixed(1)}%`, chartX + chartWidth + 5, barY + 10);
    });

    return chartY + chartHeight + 20;
  }

  private static addSpecialtiesSection(
    doc: ExtendedJsPDF,
    data: GeneralDashboardResponse,
    margins: { top: number; right: number; bottom: number; left: number },
    startY: number
  ): number {
    let currentY = startY;

    // Verificar si hay espacio suficiente, si no, agregar nueva página
    if (currentY > 200) {
      doc.addPage();
      currentY = margins.top;
    }

    // Título de sección
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('Ranking de Especialidades', margins.left, currentY);
    currentY += 10;

    // Preparar datos para la tabla
    const specialtiesData = [
      ['Posición', 'Especialidad', 'Pacientes', 'Ingresos', '% Pacientes', '% Ingresos']
    ];

    data.specialtiesRanking.forEach(specialty => {
      specialtiesData.push([
        specialty.rank.toString(),
        specialty.name,
        specialty.patients.toString(),
        specialty.formattedRevenue,
        `${specialty.patientPercentage.toFixed(1)}%`,
        `${specialty.revenuePercentage.toFixed(1)}%`
      ]);
    });

    autoTable(doc, {
      head: [specialtiesData[0]],
      body: specialtiesData.slice(1),
      startY: currentY,
      margin: { left: margins.left, right: margins.right },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 138] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : currentY + 50;
  }

  private static addServicesSection(
    doc: ExtendedJsPDF,
    data: GeneralDashboardResponse,
    margins: { top: number; right: number; bottom: number; left: number },
    startY: number
  ): number {
    let currentY = startY;

    // Verificar si hay espacio suficiente
    if (currentY > 200) {
      doc.addPage();
      currentY = margins.top;
    }

    // Título de sección
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('Detalle de Servicios', margins.left, currentY);
    currentY += 10;

    // Preparar datos para la tabla
    const servicesData = [
      ['Servicio', 'Cantidad', 'Porcentaje', 'Ingresos']
    ];

    data.servicesDistribution.forEach(service => {
      servicesData.push([
        service.name,
        service.count.toString(),
        `${service.percentage.toFixed(2)}%`,
        `S/. ${service.revenue.toLocaleString()}`
      ]);
    });

    autoTable(doc, {
      head: [servicesData[0]],
      body: servicesData.slice(1),
      startY: currentY,
      margin: { left: margins.left, right: margins.right },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 138] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : currentY + 50;
  }

  private static addTransactionsSection(
    doc: ExtendedJsPDF,
    data: GeneralDashboardResponse,
    margins: { top: number; right: number; bottom: number; left: number },
    startY: number
  ): number {
    let currentY = startY;

    // Verificar si hay espacio suficiente
    if (currentY > 200) {
      doc.addPage();
      currentY = margins.top;
    }

    // Título de sección
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('Transacciones Recientes', margins.left, currentY);
    currentY += 10;

    // Preparar datos para la tabla
    const transactionsData = [
      ['ID', 'Paciente', 'Servicio', 'Monto', 'Estado', 'Fecha']
    ];

    data.recentTransactions.forEach(transaction => {
      transactionsData.push([
        transaction.id,
        transaction.patientName,
        transaction.service,
        transaction.formattedAmount,
        transaction.status,
        transaction.formattedDate
      ]);
    });

    autoTable(doc, {
      head: [transactionsData[0]],
      body: transactionsData.slice(1),
      startY: currentY,
      margin: { left: margins.left, right: margins.right },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 }
      }
    });

    return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : currentY + 50;
  }

  private static addFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Información del reporte
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      
      const footerY = doc.internal.pageSize.height - 15;
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 20, footerY);
      doc.text(`Clínica San Lorenzo - Dashboard General`, 20, footerY + 5);
      
      // Número de página
      const pageText = `Página ${i} de ${pageCount}`;
      const pageWidth = doc.internal.pageSize.width;
      const textWidth = doc.getTextWidth(pageText);
      doc.text(pageText, pageWidth - textWidth - 20, footerY);
    }
  }

  // Métodos privados para Excel

  private static prepareSummaryData(data: GeneralDashboardResponse, config: ExcelConfig): (string | number)[][] {
    return [
      [config.title],
      [''],
      ['Información del Reporte'],
      ['Período:', `${this.formatDate(data.dateRange.startDate)} - ${this.formatDate(data.dateRange.endDate)}`],
      ['Total de días:', data.dateRange.totalDays],
      ['Generado el:', new Date().toLocaleDateString('es-ES')],
      [''],
      ['Resumen Ejecutivo'],
      ['Pacientes Atendidos:', data.mainStats.patientsAttended.value],
      ['Ingresos Diarios:', data.mainStats.dailyRevenue.value],
      ['Citas Pendientes:', data.mainStats.pendingAppointments.value],
      ['Tasa de Ocupación:', data.mainStats.occupancyRate.value],
      [''],
      ['Totales del Gráfico de Ingresos'],
      ['Ingresos Totales:', `S/. ${data.incomeChart.totalRevenue.toLocaleString()}`],
      ['Promedio de Ingresos:', `S/. ${data.incomeChart.averageRevenue.toLocaleString()}`],
      ['Valor Máximo:', `S/. ${data.incomeChart.maxValue.toLocaleString()}`],
      ['Valor Mínimo:', `S/. ${data.incomeChart.minValue.toLocaleString()}`]
    ];
  }

  private static prepareStatsData(data: GeneralDashboardResponse): (string | number)[][] {
    return [
      ['Estadísticas Principales'],
      [''],
      ['Métrica', 'Valor', 'Valor Numérico', 'Tendencia', 'Dirección', 'Valor de Tendencia', 'Descripción'],
      [
        data.mainStats.patientsAttended.title,
        data.mainStats.patientsAttended.value,
        data.mainStats.patientsAttended.numericValue,
        data.mainStats.patientsAttended.trend,
        data.mainStats.patientsAttended.trendDirection,
        data.mainStats.patientsAttended.trendValue,
        data.mainStats.patientsAttended.trendDescription
      ],
      [
        data.mainStats.dailyRevenue.title,
        data.mainStats.dailyRevenue.value,
        data.mainStats.dailyRevenue.numericValue,
        data.mainStats.dailyRevenue.trend,
        data.mainStats.dailyRevenue.trendDirection,
        data.mainStats.dailyRevenue.trendValue,
        data.mainStats.dailyRevenue.trendDescription
      ],
      [
        data.mainStats.pendingAppointments.title,
        data.mainStats.pendingAppointments.value,
        data.mainStats.pendingAppointments.numericValue,
        data.mainStats.pendingAppointments.trend,
        data.mainStats.pendingAppointments.trendDirection,
        data.mainStats.pendingAppointments.trendValue,
        data.mainStats.pendingAppointments.trendDescription
      ],
      [
        data.mainStats.occupancyRate.title,
        data.mainStats.occupancyRate.value,
        data.mainStats.occupancyRate.numericValue,
        data.mainStats.occupancyRate.trend,
        data.mainStats.occupancyRate.trendDirection,
        data.mainStats.occupancyRate.trendValue,
        data.mainStats.occupancyRate.trendDescription
      ]
    ];
  }

  private static prepareSpecialtiesData(data: GeneralDashboardResponse): (string | number)[][] {
    const result: (string | number)[][] = [
      ['Ranking de Especialidades'],
      [''],
      ['Posición', 'Especialidad', 'Pacientes', 'Ingresos', 'Ingresos Formateados', '% Pacientes', '% Ingresos', 'Cambio de Posición']
    ];

    data.specialtiesRanking.forEach(specialty => {
      result.push([
        specialty.rank,
        specialty.name,
        specialty.patients,
        specialty.revenue,
        specialty.formattedRevenue,
        specialty.patientPercentage,
        specialty.revenuePercentage,
        specialty.rankChange
      ]);
    });

    return result;
  }

  private static prepareServicesData(data: GeneralDashboardResponse): (string | number)[][] {
    const result: (string | number)[][] = [
      ['Distribución de Servicios'],
      [''],
      ['Servicio', 'Cantidad', 'Porcentaje', 'Ingresos', 'Color']
    ];

    data.servicesDistribution.forEach(service => {
      result.push([
        service.name,
        service.count,
        service.percentage,
        service.revenue,
        service.color
      ]);
    });

    return result;
  }

  private static prepareTransactionsData(data: GeneralDashboardResponse): (string | number)[][] {
    const result: (string | number)[][] = [
      ['Transacciones Recientes'],
      [''],
      ['ID', 'Paciente', 'Servicio', 'Monto', 'Monto Formateado', 'Estado', 'Fecha', 'Fecha Formateada', 'ID Paciente', 'ID Doctor', 'Nombre Doctor', 'Método de Pago']
    ];

    data.recentTransactions.forEach(transaction => {
      result.push([
        transaction.id,
        transaction.patientName,
        transaction.service,
        transaction.amount,
        transaction.formattedAmount,
        transaction.status,
        transaction.date,
        transaction.formattedDate,
        transaction.patientId,
        transaction.doctorId,
        transaction.doctorName,
        transaction.paymentMethod
      ]);
    });

    return result;
  }

  private static prepareIncomeChartData(data: GeneralDashboardResponse): (string | number)[][] {
    const result: (string | number)[][] = [
      ['Datos del Gráfico de Ingresos'],
      [''],
      ['Etiqueta', 'Valor', 'Fecha', 'Altura Normalizada']
    ];

    data.incomeChart.dataPoints.forEach(point => {
      result.push([
        point.label,
        point.value,
        point.date,
        point.normalizedHeight
      ]);
    });

    return result;
  }

  // Métodos utilitarios

  private static formatDate(dateString: string): string {
    // Si la fecha viene en formato YYYYMMDD del API, convertirla primero
    if (dateString.length === 8 && !dateString.includes('-')) {
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      dateString = `${year}-${month}-${day}`;
    }
    
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES');
  }

  /**
   * Exporta los datos del cierre de caja a PDF con cards, detalles y resumen por tipo de pago
   */
  static async exportCierreCajaToPDF(
    datosCierre: any,
    estadisticasPorTipo: any,
    tipoCajaInfo: { nombre: string; descripcion: string },
    filtros: { mes: string; anio: string }
  ): Promise<void> {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      }) as ExtendedJsPDF;

      const margins = { top: 20, right: 20, bottom: 20, left: 20 };
      let currentY = margins.top;

      // Configurar fuentes
      doc.setFont('helvetica');

      // Título principal
      doc.setFontSize(18);
      doc.setTextColor(30, 58, 138);
      doc.text('Cierre de Caja Mensual', margins.left, currentY);
      currentY += 8;

      // Subtítulo con tipo de caja y período
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const mesNombre = meses[parseInt(filtros.mes) - 1] || 'Desconocido';
      doc.text(`${tipoCajaInfo.nombre} - ${mesNombre} ${filtros.anio}`, margins.left, currentY);
      currentY += 10;

      // Cards de resumen (similar a los del grid)
      currentY = this.addCierreCajaCards(doc, estadisticasPorTipo, datosCierre, margins, currentY);

      // Resumen por tipo de pago
      currentY = this.addResumenTipoPago(doc, datosCierre.datos, margins, currentY);

      // Detalle de todas las transacciones
      currentY = this.addDetalleTransacciones(doc, datosCierre.datos, margins, currentY);

      // Resumen final de balance
      currentY = this.addResumenFinalBalance(doc, estadisticasPorTipo, margins, currentY);

      // Pie de página
      this.addCierreCajaFooter(doc, tipoCajaInfo, datosCierre);

      // Descargar el archivo
      const fileName = `cierre_caja_${tipoCajaInfo.nombre.toLowerCase().replace(/\s+/g, '_')}_${filtros.mes}_${filtros.anio}`;
      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF de cierre de caja:', error);
      throw new Error('Error al generar el archivo PDF de cierre de caja');
    }
  }

  private static addCierreCajaCards(
    doc: ExtendedJsPDF,
    estadisticas: any,
    datosCierre: any,
    margins: { top: number; right: number; bottom: number; left: number },
    startY: number
  ): number {
    let currentY = startY;

    // Título de sección
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text('Resumen Ejecutivo', margins.left, currentY);
    currentY += 8;

    // Preparar datos para tabla de cards
    const cardsData = [
      ['Métrica', 'Cantidad', 'Monto Total'],
      [
        'Total Registros',
        datosCierre.resumen.totalRegistros.toLocaleString(),
        '-'
      ],
      [
        'Ingresos',
        `${estadisticas.ingresos.toLocaleString()} registros`,
        `S/ ${estadisticas.totalIngresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
      ],
      [
        'Egresos',
        `${estadisticas.egresos.toLocaleString()} registros`,
        `S/ ${estadisticas.totalEgresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
      ],
      [
        'Balance Neto',
        '-',
        `S/ ${(estadisticas.totalIngresos - estadisticas.totalEgresos).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
      ]
    ];

    autoTable(doc, {
      head: [cardsData[0]],
      body: cardsData.slice(1),
      startY: currentY,
      margin: { left: margins.left, right: margins.right },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138], fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 }
      }
    });

    return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : currentY + 35;
  }

  private static addResumenTipoPago(
    doc: ExtendedJsPDF,
    datos: any[],
    margins: { top: number; right: number; bottom: number; left: number },
    startY: number
  ): number {
    let currentY = startY;

    // Verificar si hay espacio suficiente
    if (currentY > 220) {
      doc.addPage();
      currentY = margins.top;
    }

    // Título de sección
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text('Resumen por Tipo de Pago', margins.left, currentY);
    currentY += 8;

    // Agrupar por tipo de pago (esto sería ideal obtenerlo del backend, pero por ahora lo calculamos)
    const tiposPago = ['Efectivo', 'Visa', 'Mastercard', 'Transferencia', 'Otros'];
    const resumenTipos: { [key: string]: { cantidad: number; monto: number } } = {};

    // Inicializar tipos
    tiposPago.forEach(tipo => {
      resumenTipos[tipo] = { cantidad: 0, monto: 0 };
    });

    // Agrupar datos (simulado - en realidad esto debería venir del backend)
    datos.forEach((item: any) => {
      // Simulamos la asignación de tipo de pago basado en alguna lógica
      const tipoPago = item.tipoPago || this.determinarTipoPago(item);
      if (resumenTipos[tipoPago]) {
        resumenTipos[tipoPago].cantidad++;
        resumenTipos[tipoPago].monto += item.total || 0;
      } else {
        resumenTipos['Otros'].cantidad++;
        resumenTipos['Otros'].monto += item.total || 0;
      }
    });

    // Preparar datos para la tabla
    const tiposPagoData = [
      ['Tipo de Pago', 'Cantidad', 'Monto Total', 'Porcentaje']
    ];

    const totalMonto = Object.values(resumenTipos).reduce((sum, tipo) => sum + tipo.monto, 0);

    Object.entries(resumenTipos).forEach(([tipo, datos]) => {
      if (datos.cantidad > 0) {
        const porcentaje = totalMonto > 0 ? (datos.monto / totalMonto * 100) : 0;
        tiposPagoData.push([
          tipo,
          datos.cantidad.toString(),
          `S/ ${datos.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
          `${porcentaje.toFixed(1)}%`
        ]);
      }
    });

    autoTable(doc, {
      head: [tiposPagoData[0]],
      body: tiposPagoData.slice(1),
      startY: currentY,
      margin: { left: margins.left, right: margins.right },
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], fontSize: 7 },
      alternateRowStyles: { fillColor: [240, 253, 244] }
    });

    return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : currentY + 35;
  }

  private static addDetalleTransacciones(
    doc: ExtendedJsPDF,
    datos: any[],
    margins: { top: number; right: number; bottom: number; left: number },
    startY: number
  ): number {
    let currentY = startY;

    // Verificar si hay espacio suficiente
    if (currentY > 220) {
      doc.addPage();
      currentY = margins.top;
    }

    // Título de sección
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text(`Detalle de Transacciones - ${datos.length} registros`, margins.left, currentY);
    currentY += 8;

    // Preparar datos para la tabla
    const transaccionesData = [
      ['Tipo', 'Venta', 'Cliente', 'Servicio', 'Fecha', 'Monto']
    ];

    datos.forEach((item: any) => {
      transaccionesData.push([
        item.tipo === 'EGRESO' ? 'EGRESO' : 'INGRESO',
        `${item.serie}-${item.correlativo}` || item.venta || '-',
        item.cliente || '-',
        item.servicio || '-',
        new Date(item.fechaEmision).toLocaleDateString('es-PE') || '-',
        `S/ ${(item.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
      ]);
    });

    autoTable(doc, {
      head: [transaccionesData[0]],
      body: transaccionesData.slice(1),
      startY: currentY,
      margin: { left: margins.left, right: margins.right },
      styles: { fontSize: 5, cellPadding: 1 },
      headStyles: { fillColor: [30, 58, 138], fontSize: 5 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 25 },
        2: { cellWidth: 40 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 }
      },
      rowPageBreak: 'avoid',
      pageBreak: 'auto'
    });

    return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : currentY + 35;
  }

  private static addResumenFinalBalance(
    doc: ExtendedJsPDF,
    estadisticas: any,
    margins: { top: number; right: number; bottom: number; left: number },
    startY: number
  ): number {
    let currentY = startY;

    // Verificar si hay espacio suficiente
    if (currentY > 240) {
      doc.addPage();
      currentY = margins.top;
    }

    // Título de sección
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text('Balance Final', margins.left, currentY);
    currentY += 8;

    // Crear cuadro de resumen final
    const balanceData = [
      ['Concepto', 'Monto'],
      [
        'Total Ingresos',
        `S/ ${estadisticas.totalIngresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
      ],
      [
        'Total Egresos',
        `S/ ${estadisticas.totalEgresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
      ],
      [
        'Balance Neto',
        `S/ ${(estadisticas.totalIngresos - estadisticas.totalEgresos).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
      ]
    ];

    const balanceNeto = estadisticas.totalIngresos - estadisticas.totalEgresos;
    const fillColor = balanceNeto >= 0 ? [34, 197, 94] : [239, 68, 68]; // Verde o rojo

    autoTable(doc, {
      head: [balanceData[0]],
      body: balanceData.slice(1),
      startY: currentY,
      margin: { left: margins.left, right: margins.right },
      styles: { fontSize: 9, fontStyle: 'bold', cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138] },
      bodyStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 80 }
      },
      didParseCell: function(data) {
        // Resaltar la fila del balance neto
        if (data.row.index === 2) {
          data.cell.styles.fillColor = fillColor;
          data.cell.styles.textColor = [255, 255, 255];
        }
      }
    });

    return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : currentY + 35;
  }

  private static addCierreCajaFooter(doc: jsPDF, tipoCajaInfo: any, datosCierre: any): void {
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Información del reporte
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      
      const footerY = doc.internal.pageSize.height - 10;
      doc.setFontSize(6);
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 20, footerY);
      doc.text(`Clínica San Lorenzo - ${tipoCajaInfo.nombre}`, 20, footerY + 3);
      doc.text(`Total de registros procesados: ${datosCierre.resumen.totalRegistros}`, 20, footerY + 6);
      
      // Número de página
      const pageText = `Página ${i} de ${pageCount}`;
      const pageWidth = doc.internal.pageSize.width;
      const textWidth = doc.getTextWidth(pageText);
      doc.text(pageText, pageWidth - textWidth - 20, footerY);
    }
  }

  // Método auxiliar para determinar tipo de pago (simulado)
  private static determinarTipoPago(item: any): string {
    // Esta es una lógica simulada, idealmente esto debería venir del backend
    const monto = item.total || 0;
    const cliente = (item.cliente || '').toLowerCase();
    
    // Lógica simple de ejemplo
    if (monto > 1000) return 'Transferencia';
    if (cliente.includes('visa') || cliente.includes('card')) return 'Visa';
    if (cliente.includes('master')) return 'Mastercard';
    if (monto < 100) return 'Efectivo';
    
    return 'Efectivo'; // Por defecto
  }
}

// Instancia singleton del servicio
export const exportService = new ExportService(); 