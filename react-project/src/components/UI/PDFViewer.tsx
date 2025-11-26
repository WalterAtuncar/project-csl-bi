import React, { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion } from 'framer-motion';
import { 
  X, 
  Download, 
  Printer, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  ChevronLeft,
  ChevronRight,
  FileX,
  Loader2
} from 'lucide-react';
import ToastAlerts from './ToastAlerts';

// Configurar el worker de PDF.js local
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';

// Configurar opciones para react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Tipos de entrada para el PDF
type PDFSource = {
  type: 'base64' | 'url' | 'file';
  data: string; // base64 string, URL, o file path
  filename?: string; // nombre para descarga
};

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  source: PDFSource;
  title?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  isOpen, 
  onClose, 
  source, 
  title = "Visor de PDF" 
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Reset error cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Preparar la fuente del PDF según el tipo
  const getPdfSource = useCallback(() => {
    switch (source.type) {
      case 'base64': {
        if (!source.data || source.data.length === 0) {
          return null;
        }
        
        // Verificar si el base64 es válido
        try {
          const testDecode = atob(source.data.substring(0, 100));
          
          // Verificar que sea realmente un PDF
          if (!testDecode.startsWith('%PDF-')) {
            return null;
          }
          
          return `data:application/pdf;base64,${source.data}`;
          
        } catch {
          return null;
        }
      }
      case 'url':
      case 'file':
        return source.data;
      default:
        return null;
    }
  }, [source]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    // Análisis específico del error
    let errorMessage = 'Error al cargar el documento PDF';
    if (error.message.includes('Invalid PDF')) {
      errorMessage = 'Formato de PDF inválido';
    } else if (error.message.includes('network')) {
      errorMessage = 'Error de conexión';
    } else if (error.message.includes('password')) {
      errorMessage = 'PDF protegido con contraseña';
    } else if (error.message.includes('worker')) {
      errorMessage = 'Error en el worker de PDF.js';
    }
    
    setError(errorMessage);
    setLoading(false);
    ToastAlerts.error({
      title: "Error de carga",
      message: errorMessage
    });
  };

  const handleDownload = () => {
    try {
      let downloadData: string;

      if (source.type === 'base64') {
        // Para base64, crear blob y descargar
        const byteCharacters = atob(source.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        downloadData = URL.createObjectURL(blob);
      } else {
        // Para URLs, usar directamente
        downloadData = source.data;
      }

      const link = document.createElement('a');
      link.href = downloadData;
      link.download = source.filename || 'documento.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpiar URL creada si fue base64
      if (source.type === 'base64') {
        URL.revokeObjectURL(downloadData);
      }

      ToastAlerts.success({
        title: "Descarga iniciada",
        message: "El archivo PDF se está descargando"
      });
    } catch {
      ToastAlerts.error({
        title: "Error de descarga",
        message: "No se pudo descargar el archivo"
      });
    }
  };

  const handlePrint = () => {
    try {
      // Crear una nueva ventana para imprimir
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('No se pudo abrir ventana de impresión');
      }

      let pdfSource: string;
      
      if (source.type === 'base64') {
        pdfSource = `data:application/pdf;base64,${source.data}`;
      } else {
        pdfSource = source.data;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Imprimir PDF</title>
          <style>
            body { margin: 0; padding: 0; }
            iframe { width: 100%; height: 100vh; border: none; }
          </style>
        </head>
        <body>
          <iframe src="${pdfSource}" onload="window.print();"></iframe>
        </body>
        </html>
      `);
      
      printWindow.document.close();

      ToastAlerts.success({
        title: "Impresión iniciada",
        message: "Se abrió la ventana de impresión"
      });
    } catch {
      ToastAlerts.error({
        title: "Error de impresión",
        message: "No se pudo imprimir el documento"
      });
    }
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.25));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.25));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[10000]">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            {/* Navegación de páginas */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Página {pageNumber} de {numPages}
              </span>
              
              <button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Controles de zoom y rotación */}
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Alejar"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              
              <button
                onClick={zoomIn}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Acercar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              
              <button
                onClick={rotate}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Rotar"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
              
              <button
                onClick={handlePrint}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>

        {/* Área del PDF */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4">
          <div className="flex justify-center">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                <p className="text-gray-600 dark:text-gray-400">Cargando PDF...</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-12">
                <FileX className="w-16 h-16 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-600 mb-2">Error al cargar PDF</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                  {error}
                </p>
              </div>
            )}

            {!loading && !error && (() => {
              const pdfSource = getPdfSource();
              
              if (!pdfSource) {
                return (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileX className="w-16 h-16 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-red-600 mb-2">Archivo no válido</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                      El archivo no es un PDF válido o está corrupto.
                    </p>
                  </div>
                );
              }

              return (
                <Document
                  file={pdfSource}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                      <p className="text-gray-600 dark:text-gray-400">Cargando PDF...</p>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    rotate={rotation}
                    className="shadow-lg"
                  />
                </Document>
              );
            })()}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PDFViewer; 