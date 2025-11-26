import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';

interface ExportOptionsProps {
  onExport: (format: 'pdf' | 'excel') => void;
  className?: string;
}

const ExportOptions: React.FC<ExportOptionsProps> = ({ onExport, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<'pdf' | 'excel' | null>(null);

  const handleExport = (format: 'pdf' | 'excel') => {
    setLoading(format);
    
    // Simulación de exportación (para etapa de maquetación)
    setTimeout(() => {
      onExport(format);
      setLoading(null);
      setIsOpen(false);
    }, 1000);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className="flex items-center px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Download className="w-4 h-4 mr-2" />
        Exportar
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
          <ul className="py-1">
            <li>
              <button
                disabled={loading === 'pdf'}
                onClick={() => handleExport('pdf')}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {loading === 'pdf' ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></span>
                    Exportando...
                  </span>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    Exportar como PDF
                  </>
                )}
              </button>
            </li>
            <li>
              <button
                disabled={loading === 'excel'}
                onClick={() => handleExport('excel')}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {loading === 'excel' ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></span>
                    Exportando...
                  </span>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                    Exportar como Excel
                  </>
                )}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExportOptions; 