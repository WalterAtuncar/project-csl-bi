/**
 * Archivo de índice para exportar todos los componentes UI
 */

export { default as HeartBeatLoader } from './HeartBeatLoader';
export { default as DateRangePicker } from './DateRangePicker';
export { default as SaveQueryModal } from './SaveQueryModal';
export { default as ExportOptions } from './ExportOptions';
export { default as Button } from './Button';
export { default as GlobalLoader } from './GlobalLoader';
export { default as ThemeToggle } from './ThemeToggle';
export { default as ToastAlerts, ToastProvider } from './ToastAlerts';
export { default as DetalleModal } from './DetalleModal';
export { default as CashClosingDetailModal } from './CashClosingDetailModal';
export { default as VentasModal } from './VentasModal';
export { default as EspecialidadesModal } from './EspecialidadesModal';
export { default as GenerarPagoModal } from './GenerarPagoModal';
export { default as PDFViewer } from './PDFViewer';
export { default as PDFBuilder, usePDFBuilder, createSamplePDFData } from './PDFBuilder';
export type { PDFHeaderData, PDFDetailItem, PDFColumn, PDFSummary, PDFData } from './PDFBuilder';

// Aquí se exportarán otros componentes UI cuando se creen
// export { default as Modal } from './Modal';
// export { default as Card } from './Card';
// etc... 