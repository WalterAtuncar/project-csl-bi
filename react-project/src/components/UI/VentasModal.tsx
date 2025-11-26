import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  ArrowUp, 
  ArrowDown,
  Calendar,
  DollarSign,
  Hash,
  Download,
  Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GerenciaVentasAsistencialItem } from '../../services/CashClosingService';

interface VentasModalProps {
  isOpen: boolean;
  onClose: () => void;
  ventas: GerenciaVentasAsistencialItem[];
  tipoServicio: string;
  fechaInicio: string;
  fechaFin: string;
}

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
}

const VentasModal: React.FC<VentasModalProps> = ({
  isOpen,
  onClose,
  ventas,
  tipoServicio,
  fechaInicio,
  fechaFin
}) => {
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10
  });
  
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Calcular totales
  const totales = useMemo(() => {
    const egresos = ventas.filter(venta => venta.tipo === 'EGRESO');
    const otros = ventas.filter(venta => venta.tipo !== 'EGRESO');
    
    const totalEgresos = egresos.reduce((sum, venta) => sum + venta.total, 0);
    const totalOtros = otros.reduce((sum, venta) => sum + venta.total, 0);
    const totalGeneral = totalEgresos + totalOtros;
    
    return {
      egresos: {
        cantidad: egresos.length,
        monto: totalEgresos
      },
      otros: {
        cantidad: otros.length,
        monto: totalOtros
      },
      general: {
        cantidad: ventas.length,
        monto: totalGeneral
      }
    };
  }, [ventas]);

  // Paginación
  const totalPages = Math.ceil(ventas.length / pagination.itemsPerPage);
  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
  const endIndex = startIndex + pagination.itemsPerPage;
  const currentVentas = ventas.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === '- - -') return '- - -';
    try {
      return new Date(dateString).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'EGRESO':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EFECTIVO SOLES':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getCondicionColor = (condicion: string) => {
    switch (condicion.toUpperCase()) {
      case 'CONTADO':
        return 'bg-green-100 text-green-700';
      case 'CREDITO':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Función para exportar a PDF
  const exportToPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 20;

      // Configurar fuentes
      doc.setFont('helvetica');

      // Agregar logo (convertir imagen a base64)
      try {
        const logoResponse = await fetch('/assets/images/logo-csl.png');
        const logoBlob = await logoResponse.blob();
        const logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });
        
        // Agregar logo con tamaño aumentado 50%
        doc.addImage(logoBase64, 'PNG', 15, yPosition, 37.5, 18);
      } catch (error) {
        console.warn('No se pudo cargar el logo:', error);
      }

      // Header informativo compacto
      doc.setFontSize(14);
      doc.setTextColor(41, 128, 185); // Azul del proyecto
      doc.text('CLÍNICA SAN LORENZO', pageWidth / 2, yPosition + 5, { align: 'center' });
      
      yPosition += 10;
      doc.setFontSize(12);
      doc.setTextColor(231, 76, 60); // Rojo del proyecto
      doc.text(`Reporte de Ventas - ${tipoServicio}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 6;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Período: ${formatDate(fechaInicio)} - ${formatDate(fechaFin)}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 8;

      // Estadísticas rápidas más compactas
      doc.setFontSize(11);
      doc.setTextColor(41, 128, 185); // Azul del proyecto
      doc.text('Resumen Ejecutivo', 15, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(`Total: ${totales.general.cantidad} registros`, 15, yPosition);
      doc.text(`Ingresos: ${formatCurrency(totales.otros.monto)}`, pageWidth / 2, yPosition);
      yPosition += 4;
      doc.text(`Egresos: ${formatCurrency(totales.egresos.monto)}`, 15, yPosition);
      doc.text(`Neto: ${formatCurrency(totales.general.monto)}`, pageWidth / 2, yPosition);
      yPosition += 8;

      // Tabla de ventas
      doc.setFontSize(11);
      doc.setTextColor(41, 128, 185); // Azul del proyecto
      doc.text('Detalle de Ventas', 15, yPosition);
      yPosition += 6;

      const tableData = ventas.map(venta => [
        `${venta.serie}-${venta.correlativo}`,
        venta.cliente || '- - -',
        venta.descripcion || '- - -',
        formatDate(venta.fechaEmision),
        venta.condicion || '- - -',
        venta.tipo || '- - -',
        formatCurrency(venta.total)
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Documento', 'Cliente', 'Descripción', 'Fecha', 'Condición', 'Tipo', 'Monto']],
        body: tableData,
        styles: {
          fontSize: 6,
          cellPadding: 1,
        },
        headStyles: {
          fillColor: [41, 128, 185], // Azul del proyecto
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          6: { halign: 'right' }, // Monto alineado a la derecha
        },
      });

      yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPosition + 50;

      // Agrupación por tipo de pago (Ingresos)
      const tiposPago = ventas
        .filter(venta => venta.tipo !== 'EGRESO')
        .reduce((acc, venta) => {
          const tipo = venta.tipo || 'Sin especificar';
          acc[tipo] = (acc[tipo] || 0) + venta.total;
          return acc;
        }, {} as Record<string, number>);

      if (Object.keys(tiposPago).length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185); // Azul del proyecto
        doc.text('Ingresos por Tipo de Pago', 15, yPosition);
        yPosition += 6;

        const tiposPagoData = Object.entries(tiposPago).map(([tipo, monto]) => [
          tipo,
          formatCurrency(monto)
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Tipo de Pago', 'Monto']],
          body: tiposPagoData,
          styles: {
            fontSize: 7,
            cellPadding: 1,
          },
          headStyles: {
            fillColor: [41, 128, 185], // Azul del proyecto
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
          },
          columnStyles: {
            1: { halign: 'right' },
          },
        });

        yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPosition + 50;
      }

      // Verificar si necesitamos nueva página
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Agrupación por descripción (más vendidas)
      const descripciones = ventas.reduce((acc, venta) => {
        const desc = venta.descripcion || 'Sin descripción';
        if (!acc[desc]) {
          acc[desc] = { cantidad: 0, monto: 0 };
        }
        acc[desc].cantidad += 1;
        acc[desc].monto += venta.total;
        return acc;
      }, {} as Record<string, { cantidad: number; monto: number }>);

      const descripcionesOrdenadas = Object.entries(descripciones)
        .sort((a, b) => b[1].cantidad - a[1].cantidad)
        .slice(0, 10); // Top 10

      if (descripcionesOrdenadas.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(231, 76, 60); // Rojo del proyecto
        doc.text('Top 10 - Servicios Más Vendidos', 15, yPosition);
        yPosition += 6;

        const descripcionesData = descripcionesOrdenadas.map(([desc, data]) => [
          desc.length > 40 ? desc.substring(0, 37) + '...' : desc,
          data.cantidad.toString(),
          formatCurrency(data.monto)
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Descripción', 'Cantidad', 'Monto Total']],
          body: descripcionesData,
          styles: {
            fontSize: 6,
            cellPadding: 1,
          },
          headStyles: {
            fillColor: [231, 76, 60], // Rojo del proyecto
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
          },
          columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right' },
          },
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Generado el ${new Date().toLocaleDateString('es-PE')} - Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Descargar el PDF
      const fileName = `Reporte_Ventas_${tipoServicio}_${formatDate(fechaInicio).replace(/\//g, '-')}_${formatDate(fechaFin).replace(/\//g, '-')}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el reporte PDF. Por favor, inténtelo nuevamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      Reporte de Ventas - {tipoServicio}
                    </h2>
                    <p className="text-white/80 text-sm">
                      Período: {formatDate(fechaInicio)} - {formatDate(fechaFin)}
                    </p>
                  </div>
                </div>
                
                {/* Estadísticas rápidas */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      <span className="text-sm font-medium">Total Registros</span>
                    </div>
                    <p className="text-xl font-bold">{totales.general.cantidad}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="w-4 h-4" />
                      <span className="text-sm font-medium">Ingresos</span>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(totales.otros.monto)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="w-4 h-4" />
                      <span className="text-sm font-medium">Egresos</span>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(totales.egresos.monto)}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={exportToPDF}
                  disabled={isGeneratingPDF}
                  className={`p-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm ${
                    isGeneratingPDF 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-white text-primary hover:bg-gray-100'
                  }`}
                  title={isGeneratingPDF ? "Generando PDF..." : "Descargar reporte en PDF"}
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span className="text-sm font-medium hidden sm:block">
                    {isGeneratingPDF ? 'Generando...' : 'PDF'}
                  </span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-blue-600 border-b border-blue-700">
                  <tr>
                    <th className="px-4 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-4 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-4 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Condición
                    </th>
                    <th className="px-4 py-1 text-right text-xs font-medium text-white uppercase tracking-wider">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentVentas.map((venta, index) => (
                    <motion.tr
                      key={`${venta.venta}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-1 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {venta.serie}-{venta.correlativo}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {venta.venta}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-1">
                        <div className="text-xs text-gray-900 dark:text-white max-w-xs truncate">
                          {venta.cliente || '- - -'}
                        </div>
                      </td>
                      <td className="px-4 py-1">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {venta.descripcion || '- - -'}
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(venta.fechaEmision)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-1 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCondicionColor(venta.condicion)}`}>
                            {venta.condicion || '- - -'}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTipoColor(venta.tipo)}`}>
                            {venta.tipo || '- - -'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-1 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="w-3 h-3 text-gray-400" />
                          <span className={`text-xs font-medium ${
                            venta.tipo === 'EGRESO' 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {formatCurrency(venta.total)}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-t border-gray-200 dark:border-gray-600 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span>Mostrando</span>
                    <span className="font-medium">{startIndex + 1}</span>
                    <span>-</span>
                    <span className="font-medium">{Math.min(endIndex, ventas.length)}</span>
                    <span>de</span>
                    <span className="font-medium">{ventas.length}</span>
                    <span>registros</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          const current = pagination.currentPage;
                          return page === 1 || page === totalPages || (page >= current - 1 && page <= current + 1);
                        })
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-gray-500">...</span>
                            )}
                            <button
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                page === pagination.currentPage
                                  ? 'bg-primary text-white'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        ))}
                    </div>

                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VentasModal; 