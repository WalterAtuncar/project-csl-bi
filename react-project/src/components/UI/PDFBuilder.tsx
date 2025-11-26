import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Image,
  pdf
} from '@react-pdf/renderer';

// Estilos para el PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  logoSection: {
    flex: 1,
  },
  logo: {
    width: 120,
    height: 60,
  },
  companyInfo: {
    flex: 2,
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 3,
  },
  companyDetails: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 1,
  },
  companyAddress: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 1,
    textAlign: 'right',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
  },
  headerSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dataLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    width: 150,
    color: '#374151',
  },
  dataValue: {
    fontSize: 11,
    flex: 1,
    color: '#1f2937',
  },
  table: {
    marginTop: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  tableHeaderText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
    textAlign: 'center',
  },
  tableCellLeft: {
    textAlign: 'left',
  },
  tableCellRight: {
    textAlign: 'right',
  },
  summary: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0c4a6e',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#0c4a6e',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0c4a6e',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#6b7280',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 8,
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#6b7280',
  },
});

// Interfaces para los datos del PDF
export interface PDFHeaderData {
  titulo: string;
  subtitulo?: string;
  logoUrl?: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  documentNumber?: string;
  documentDate?: string;
  [key: string]: string | undefined; // Permite campos adicionales
}

export interface PDFDetailItem {
  id?: string | number;
  [key: string]: string | number | boolean | undefined; // Flexible para cualquier campo
}

export interface PDFColumn {
  key: string;
  header: string;
  width: number; // Porcentaje del ancho total (debe sumar 100 entre todas)
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'currency' | 'number' | 'date';
}

export interface PDFSummary {
  [key: string]: string | number;
}

export interface PDFData {
  header: PDFHeaderData;
  details: PDFDetailItem[];
  columns: PDFColumn[];
  summary?: PDFSummary;
}

// Componente para formatear valores según el tipo
const formatValue = (value: string | number | boolean | undefined, format?: string): string => {
  if (value === null || value === undefined) return '';
  
  switch (format) {
    case 'currency':
      return `S/ ${Number(value).toFixed(2)}`;
    case 'number':
      return Number(value).toLocaleString();
    case 'date':
      return new Date(value as string | number).toLocaleDateString();
    default:
      return String(value);
  }
};

// Componente del documento PDF
const PDFDocument: React.FC<{ data: PDFData }> = ({ data }) => {
  
  // Función para dividir la dirección en líneas
  const splitAddress = (address: string): string[] => {
    if (!address) return [];
    
    // Para direcciones como "AV. SAN MARTIN DE PORRES NRO. 546 SAN MARTIN CAJAMARCA - CAJAMARCA - CAJAMARCA"
    // Dividir inteligentemente
    
    if (address.length > 50) {
      // Buscar el patrón de "CAJAMARCA - CAJAMARCA - CAJAMARCA" al final
      const cajaPattern = /(.+?)(\s+[A-Z\s]+ - [A-Z\s]+ - [A-Z\s]+)$/;
      const match = address.match(cajaPattern);
      
      if (match) {
        return [match[1].trim(), match[2].trim()];
      }
      
      // Si no hay patrón específico, dividir por espacios o guiones
      if (address.includes(' - ')) {
        const parts = address.split(' - ');
        if (parts.length > 2) {
          const midPoint = Math.ceil(parts.length / 2);
          return [
            parts.slice(0, midPoint).join(' - '),
            parts.slice(midPoint).join(' - ')
          ];
        }
      } else {
        // Dividir por espacios en un punto natural
        const words = address.split(' ');
        const midPoint = Math.ceil(words.length / 2);
        return [
          words.slice(0, midPoint).join(' '),
          words.slice(midPoint).join(' ')
        ];
      }
    }
    
    return [address];
  };

  // Obtener las líneas de la dirección
  const addressLines = data.header.companyAddress ? splitAddress(data.header.companyAddress) : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header con logo y datos de la empresa */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {data.header.logoUrl && (
              <Image style={styles.logo} src={data.header.logoUrl} />
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{data.header.companyName}</Text>
            {addressLines.map((line, index) => (
              <Text key={`address-${index}`} style={styles.companyAddress}>{line}</Text>
            ))}
            {data.header.companyPhone && (
              <Text style={styles.companyDetails}>Tel: {data.header.companyPhone}</Text>
            )}
            {data.header.companyEmail && (
              <Text style={styles.companyDetails}>Email: {data.header.companyEmail}</Text>
            )}
          </View>
        </View>

        {/* Título del documento */}
        <Text style={styles.title}>{data.header.titulo}</Text>
        {data.header.subtitulo && (
          <Text style={styles.subtitle}>{data.header.subtitulo}</Text>
        )}

        {/* Información del header */}
        <View style={styles.headerSection}>
          {Object.entries(data.header).map(([key, value]) => {
            // Excluir campos ya mostrados
            if (['titulo', 'subtitulo', 'logoUrl', 'companyName', 'companyAddress', 'companyPhone', 'companyEmail'].includes(key)) {
              return null;
            }
            
            if (value) {
              return (
                <View key={key} style={styles.dataRow}>
                  <Text style={styles.dataLabel}>
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
                  </Text>
                  <Text style={styles.dataValue}>{value}</Text>
                </View>
              );
            }
            return null;
          })}
        </View>

        {/* Tabla de detalles */}
        {data.details.length > 0 && (
          <View style={styles.table}>
            {/* Header de la tabla */}
            <View style={styles.tableHeader}>
              {data.columns.map((column) => (
                <View key={column.key} style={{ width: `${column.width}%` }}>
                  <Text style={styles.tableHeaderText}>{column.header}</Text>
                </View>
              ))}
            </View>

            {/* Filas de datos */}
            {data.details.map((item, index) => (
              <View 
                key={item.id || index} 
                style={[
                  styles.tableRow, 
                  ...(index % 2 === 1 ? [styles.tableRowAlt] : [])
                ]}
              >
                {data.columns.map((column) => (
                  <View key={column.key} style={{ width: `${column.width}%` }}>
                    <Text 
                      style={[
                        styles.tableCell,
                        ...(column.align === 'left' ? [styles.tableCellLeft] : []),
                        ...(column.align === 'right' ? [styles.tableCellRight] : []),
                      ]}
                    >
                      {formatValue(item[column.key], column.format)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Resumen/Totales */}
        {data.summary && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Resumen</Text>
            {Object.entries(data.summary).map(([key, value]) => (
              <View key={key} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
                </Text>
                <Text style={styles.summaryValue}>
                  {typeof value === 'number' ? 
                    (key === 'Total de servicios' ? 
                      Math.floor(value).toString() : 
                      formatValue(value, 'currency')
                    ) : 
                    value
                  }
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Documento generado automáticamente el {new Date().toLocaleDateString()} a las {new Date().toLocaleTimeString()}
        </Text>

        {/* Número de página */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => 
          `Página ${pageNumber} de ${totalPages}`
        } fixed />
      </Page>
    </Document>
  );
};

// Hook principal para construir PDFs
export const usePDFBuilder = () => {
  // Función para generar PDF y retornar como base64
  const generatePDF = async (data: PDFData): Promise<string> => {
    try {
      // Generar el PDF
      const pdfDoc = <PDFDocument data={data} />;
      const pdfBlob = await pdf(pdfDoc).toBlob();
      
      // Convertir a base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remover el prefijo "data:application/pdf;base64,"
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw new Error('No se pudo generar el PDF');
    }
  };

  // Función para generar y descargar PDF directamente
  const downloadPDF = async (data: PDFData, filename = 'documento.pdf') => {
    try {
      const pdfDoc = <PDFDocument data={data} />;
      const pdfBlob = await pdf(pdfDoc).toBlob();
      
      // Crear URL y descargar
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      throw new Error('No se pudo descargar el PDF');
    }
  };

  // Función para previsualizar PDF (abre en nueva ventana)
  const previewPDF = async (data: PDFData) => {
    try {
      const pdfDoc = <PDFDocument data={data} />;
      const pdfBlob = await pdf(pdfDoc).toBlob();
      
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error al previsualizar PDF:', error);
      throw new Error('No se pudo previsualizar el PDF');
    }
  };

  return {
    generatePDF,
    downloadPDF,
    previewPDF
  };
};

// Componente de ejemplo/plantilla para construir datos
export const createSamplePDFData = (): PDFData => ({
  header: {
    titulo: "Reporte de Honorarios Médicos",
    subtitulo: "Detalle de Pagos Realizados",
    companyName: "Centro de Salud Los Claveles",
    companyAddress: "Av. Principal 123, Lima, Perú",
    companyPhone: "+51 1 234-5678",
    companyEmail: "info@csl.com.pe",
    documentNumber: "RPT-2025-001",
    documentDate: new Date().toLocaleDateString(),
    medicoNombre: "Dr. Juan Pérez García",
    especialidad: "Cardiología",
    periodo: "Enero 2025"
  },
  columns: [
    { key: 'fecha', header: 'Fecha', width: 15, align: 'center', format: 'date' },
    { key: 'paciente', header: 'Paciente', width: 30, align: 'left' },
    { key: 'servicio', header: 'Servicio', width: 25, align: 'left' },
    { key: 'precio', header: 'Precio', width: 15, align: 'right', format: 'currency' },
    { key: 'pago', header: 'Pago Médico', width: 15, align: 'right', format: 'currency' }
  ],
  details: [
    {
      id: 1,
      fecha: '2025-01-15',
      paciente: 'García López, María',
      servicio: 'Consulta Cardiológica',
      precio: 150.00,
      pago: 37.50
    },
    {
      id: 2,
      fecha: '2025-01-16',
      paciente: 'Rodríguez Pérez, Juan',
      servicio: 'Electrocardiograma',
      precio: 80.00,
      pago: 20.00
    }
  ],
  summary: {
    totalServicios: 2,
    montoTotal: 230.00,
    pagoTotal: 57.50
  }
});

export default PDFDocument; 