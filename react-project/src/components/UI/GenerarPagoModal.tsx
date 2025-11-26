import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calculator, 
  Search, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Activity,
  RotateCcw,
  Upload,
  Check,
  XCircle,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  pagoMedicosService,
  PagoMedicoAnalisisRequest,
  PagoMedicoCompletoResponse,
  PagoMedicoCabecera,
  PagoMedicoDetalle,
  GenerarPagoMedicoRequest,
  ServicesPaidDetailRequest
} from '../../services/PagoMedicosService';
import { systemParametersService, KeyValueDtoResponse } from '../../services/SystemParametersService';
import ToastAlerts from './ToastAlerts';
import { usePDFBuilder } from './';
import type { PDFData, PDFHeaderData, PDFDetailItem, PDFColumn } from './PDFBuilder';

// Helper global para formatear fechas YYYY-MM-DD a DD/MM/YYYY (es-ES)
const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return '—';
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) {
    // Fallback: intentar con Date directamente
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
};

interface GenerarPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPagoGenerado?: () => void;
}

interface FormState {
  consultorioId?: number;
  consultorioNombre?: string;
  fechaInicio: string;
  fechaFin: string;
}

// Interface para elementos del Excel cargado
interface ExcelValidationItem {
  fechaServicio: string;
  paciente?: string;
  comprobante: string;
  esValido: boolean | null;
  motivo: string;
}

// Interface para errores de validación
interface ValidationError {
  comprobante: string;
  motivo: string;
}

// Interface extendida para PagoMedicoDetalle con validación
interface PagoMedicoDetalleExtendido extends PagoMedicoDetalle {
  esValido?: boolean;
}

const GenerarPagoModal: React.FC<GenerarPagoModalProps> = ({ 
  isOpen, 
  onClose, 
  onPagoGenerado 
}) => {
  // Estados del formulario
  const [formData, setFormData] = useState<FormState>(() => {
    // Establecer por defecto el rango del mes anterior: primer y último día
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth(); // mes actual (0-11)
    const prevMonthIndex = monthIndex - 1;
    const prevYear = prevMonthIndex >= 0 ? year : year - 1;
    const normalizedPrevMonthIndex = (prevMonthIndex + 12) % 12; // 0-11 para el mes anterior
    const lastDay = new Date(prevYear, normalizedPrevMonthIndex + 1, 0).getDate();
    const pad = (n: number) => n.toString().padStart(2, '0');

    const fechaInicioStr = `${prevYear}-${pad(normalizedPrevMonthIndex + 1)}-01`;
    const fechaFinStr = `${prevYear}-${pad(normalizedPrevMonthIndex + 1)}-${pad(lastDay)}`;

    return {
      fechaInicio: fechaInicioStr,
      fechaFin: fechaFinStr,
    };
  });

  // Estados para consultorios (SystemParameter 403)
  const [consultorios, setConsultorios] = useState<KeyValueDtoResponse[]>([]);
  // Control de apertura para limitar altura del dropdown (~5 registros)
  const [isConsultorioOpen, setIsConsultorioOpen] = useState(false);
  // Referencia y buffer para búsqueda intuitiva (typeahead)
  const consultorioSelectRef = useRef<HTMLSelectElement | null>(null);
  const typeaheadBufferRef = useRef<string>('');
  const typeaheadTimerRef = useRef<number | undefined>(undefined);
  const TYPEAHEAD_TIMEOUT_MS = 800;
  const normalizeText = (s: string) => (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const selectByTypeahead = (buffer: string) => {
    if (!buffer) return;
    const q = normalizeText(buffer);
    const idx = consultorios.findIndex(c => normalizeText(c.value1 ?? c.Value1 ?? '').startsWith(q));
    if (idx >= 0) {
      const selected = consultorios[idx];
      const effectiveIdNum = selected?.IdI ?? (selected?.id ? parseInt(selected.id, 10) : undefined);
      setFormData(prev => ({
        ...prev,
        consultorioId: effectiveIdNum,
        consultorioNombre: selected?.value1 ?? selected?.Value1 ?? undefined
      }));
      // Desplazar la opción al área visible del listbox (hay un placeholder como primera opción)
      requestAnimationFrame(() => {
        const optionIndex = idx + 1; // +1 por la opción placeholder
        const opt = consultorioSelectRef.current?.options?.[optionIndex];
        opt?.scrollIntoView({ block: 'nearest' });
      });
    }
  };
  const [loadingConsultorios, setLoadingConsultorios] = useState(false);

  // Estados para el análisis
  const [analisisData, setAnalisisData] = useState<PagoMedicoCompletoResponse | null>(null);
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);
  const [showAnalisis, setShowAnalisis] = useState(false);

  // Estados para la selección de servicios a pagar
  const [selectedServicios, setSelectedServicios] = useState<Set<string>>(new Set());
  // Estado para selección de médicos
  const [selectedMedicos, setSelectedMedicos] = useState<Set<number>>(new Set());
  
  // Estado para el objeto de pago que se va construyendo
  const [pagoRequest, setPagoRequest] = useState<GenerarPagoMedicoRequest | null>(null);

  // Estados para la validación del Excel
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [isValidationActive, setIsValidationActive] = useState(false);

  // Estados para el PDF
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Ref para el input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook para construir PDFs
  const { generatePDF } = usePDFBuilder();

  // Función para generar el PDF del pago médico
  const generatePagoMedicoPDF = async (cabeceras: PagoMedicoCabecera[], detallesSeleccionados: PagoMedicoDetalle[]): Promise<string> => {
    const logoPath = '/assets/images/logo-csl.png';
    
    // Función para generar número de documento con timestamp
    const generateDocumentNumber = (): string => {
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear().toString();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
      
      // Formato: ddMMyyyHHmmss + milisegundos (20 caracteres total)
      const timestamp = `${day}${month}${year}${hours}${minutes}${seconds}${milliseconds}`;
      
      // Asegurar que tenga exactamente 20 caracteres
      return timestamp.padEnd(20, '0').substring(0, 20);
    };

    // Obtener información de la organización desde el endpoint
    let organizationInfo;
    try {
      organizationInfo = await pagoMedicosService.getOrganizationInfo();
    } catch (error) {
      console.error('Error al obtener información de la organización:', error);
      // Fallback a datos por defecto si falla el endpoint
      organizationInfo = {
        v_OrganizationId: 'CSL-001',
        v_IdentificationNumber: '20000000000',
        v_Name: 'Clínica San Lorenzo',
        v_Address: 'Dirección de la clínica',
        v_PhoneNumber: 'Teléfono de contacto',
        v_Mail: 'contacto@clinicasanlorenzo.com'
      };
    }
    
    const headerData: PDFHeaderData = {
      titulo: 'COMPROBANTE DE PAGO MÉDICO',
      subtitulo: 'Honorarios Profesionales',
      companyName: organizationInfo.v_Name,
      companyAddress: organizationInfo.v_Address,
      companyPhone: organizationInfo.v_PhoneNumber,
      companyEmail: organizationInfo.v_Mail,
      logoUrl: logoPath,
      'Número de Documento': generateDocumentNumber(),
      'Fecha de Documento': new Date().toLocaleDateString('es-ES', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    };

    const columns: PDFColumn[] = [
      { key: 'fecha', header: 'Fecha', width: 20 },
      { key: 'paciente', header: 'Paciente', width: 35 },
      { key: 'comprobante', header: 'Comprobante', width: 25 },
      { key: 'monto', header: 'Pago Médico', width: 20, align: 'right' }
    ];

    const details: PDFDetailItem[] = detallesSeleccionados.map(detalle => ({
      fecha: new Date(detalle.d_ServiceDate).toLocaleDateString('es-ES'),
      paciente: detalle.paciente || 'N/A',
      comprobante: detalle.v_ComprobantePago || 'N/A',
      monto: `S/ ${detalle.pagoMedico.toFixed(2)}`
    }));

    const totalMonto = detallesSeleccionados.reduce((sum, detalle) => sum + detalle.pagoMedico, 0);

    const profesionalLabel = cabeceras && cabeceras.length === 1
      ? (cabeceras[0].nombreMedico || 'N/A')
      : 'Varios médicos';
    const especialidadLabel = cabeceras && cabeceras.length === 1
      ? (cabeceras[0].especialidadMedico || 'N/A')
      : '—';

    const pdfData: PDFData = {
      header: headerData,
      columns: columns,
      details: details,
      summary: {
        'Total de servicios': detallesSeleccionados.length,
        'Monto total': totalMonto,
        'Profesional': profesionalLabel,
        'Especialidad': especialidadLabel,
        'Período': `${formatDateForDisplay(formData.fechaInicio)} - ${formatDateForDisplay(formData.fechaFin)}`
      }
    };

    const pdfBase64 = await generatePDF(pdfData);
    return pdfBase64;
  };

  // Handlers de selección de médicos
  const handleToggleMedico = (medicoId: number, checked: boolean) => {
    setSelectedMedicos(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(medicoId);
      } else {
        next.delete(medicoId);
      }
      return next;
    });
  };

  const handleToggleAllMedicos = (checked: boolean) => {
    const cabeceras = analisisData?.cabecera || [];
    if (!cabeceras || cabeceras.length === 0) {
      setSelectedMedicos(new Set());
      return;
    }
    if (checked) {
      setSelectedMedicos(new Set(cabeceras.map(c => c.medicoId)));
    } else {
      setSelectedMedicos(new Set());
    }
  };

  // Detalles filtrados según médicos seleccionados
  const detallesFiltrados: PagoMedicoDetalle[] = useMemo(() => {
    const allDetalles = analisisData?.detalles || [];
    if (!allDetalles || allDetalles.length === 0) return [];
    if (!selectedMedicos || selectedMedicos.size === 0) return [];

    // Filtrado exacto por medicoId (provisto por backend)
    return allDetalles.filter(d => typeof (d as any).medicoId === 'number' && selectedMedicos.has((d as any).medicoId as number));
  }, [analisisData, selectedMedicos]);

  // Función principal para generar el pago completo
  const handleGenerarPagoCompleto = async () => {
    if (!pagoRequest || !pagoRequest.servicesDetails || pagoRequest.servicesDetails.length === 0) {
      ToastAlerts.warning({
        title: "Selección requerida",
        message: "Debe seleccionar al menos un servicio para generar el pago"
      });
      return;
    }

    if (!analisisData?.cabecera) {
      ToastAlerts.error({
        title: "Error de datos",
        message: "No se encontraron los datos del análisis"
      });
      return;
    }

    setGeneratingPDF(true);
    
    try {
      // Obtener solo los detalles seleccionados
      const detallesSeleccionados = analisisData.detalles?.filter(detalle => {
        const serviceId = detalle.v_ServiceComponentId || `${detalle.numeroLinea}`;
        return selectedServicios.has(serviceId);
      }) || [];

      // Generar el PDF
      const pdfBase64 = await generatePagoMedicoPDF(analisisData.cabecera, detallesSeleccionados);
      
      // Crear el request con el PDF incluido
      const pagoRequestWithPDF: GenerarPagoMedicoRequest = {
        ...pagoRequest,
        v_Comprobante: pdfBase64 // Incluir el PDF en base64
      };

      // Enviar el POST a la base de datos
      const response = await pagoMedicosService.generarPagoMedico(pagoRequestWithPDF);
      
      ToastAlerts.success({
        title: "Pago generado exitosamente",
        message: `Se ha generado el pago ID: ${response.paidId} por S/ ${pagoRequest.r_PagadoTotal.toFixed(2)}`,
        duration: 5000
      });
      
      // Cerrar el modal principal
      onClose();
      
      if (onPagoGenerado) {
        onPagoGenerado();
      }
      
    } catch (error) {
      console.error('Error al generar pago completo:', error);
      ToastAlerts.error({
        title: "Error al generar pago",
        message: "No se pudo generar el pago médico. Verifique los datos e intente nuevamente"
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Función para generar y descargar solo el PDF (sin guardar en BD)
  const handleImprimirPDF = async () => {
    if (!pagoRequest || !pagoRequest.servicesDetails || pagoRequest.servicesDetails.length === 0) {
      ToastAlerts.warning({
        title: "Selección requerida",
        message: "Debe seleccionar al menos un servicio para generar el PDF"
      });
      return;
    }

    if (!analisisData?.cabecera) {
      ToastAlerts.error({
        title: "Error de datos",
        message: "No se encontraron los datos del análisis"
      });
      return;
    }

    setGeneratingPDF(true);
    
    try {
      // Obtener solo los detalles seleccionados
      const detallesSeleccionados = analisisData.detalles?.filter(detalle => {
        const serviceId = detalle.v_ServiceComponentId || `${detalle.numeroLinea}`;
        return selectedServicios.has(serviceId);
      }) || [];

      // Generar el PDF
      const pdfBase64 = await generatePagoMedicoPDF(analisisData.cabecera, detallesSeleccionados);
      
      // Convertir base64 a blob y descargar
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Crear URL para descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generar nombre de archivo con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const nombreArchivoProfesional = (analisisData.cabecera && analisisData.cabecera.length === 1)
        ? (analisisData.cabecera[0].nombreMedico?.replace(/\s+/g, '-') || 'profesional')
        : 'varios-medicos';
      link.download = `comprobante-pago-medico-${nombreArchivoProfesional}-${timestamp}.pdf`;
      
      // Agregar al DOM, hacer click y remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL
      window.URL.revokeObjectURL(url);
      
      ToastAlerts.success({
        title: "PDF generado exitosamente",
        message: `PDF descargado: S/ ${pagoRequest.r_PagadoTotal.toFixed(2)} para ${analisisData.cabecera && analisisData.cabecera.length === 1 ? analisisData.cabecera[0].nombreMedico : 'Varios médicos'}`,
        duration: 4000
      });
      
    } catch (error) {
      console.error('Error al generar PDF:', error);
      ToastAlerts.error({
        title: "Error al generar PDF",
        message: "No se pudo generar el archivo PDF. Verifique los datos e intente nuevamente"
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Resetear modal al abrirse
  useEffect(() => {
    if (isOpen) {
      const { start, end } = getPreviousMonthRange();
      setFormData({
        fechaInicio: start,
        fechaFin: end,
      });
      setConsultorios([]);
      setLoadingConsultorios(false);
      setAnalisisData(null);
      setShowAnalisis(false);
      setSelectedServicios(new Set());
      setPagoRequest(null);
      
      // Limpiar validación
      setValidationErrors([]);
      setShowValidationModal(false);
      setIsValidationActive(false);
      
      // Limpiar PDF
      setGeneratingPDF(false);

      // Cargar consultorios (grupo 403)
      const loadConsultorios = async () => {
        try {
          setLoadingConsultorios(true);
          const data = await systemParametersService.getSystemParameterForCombo(403);
          // Ordenar alfabéticamente por value1 (con fallback a Value1), insensible a acentos/mayúsculas
          const sorted = (data || [])
            .slice()
            .sort((a, b) => {
              const aLabel = (a.value1 ?? a.Value1 ?? '').toString();
              const bLabel = (b.value1 ?? b.Value1 ?? '').toString();
              return aLabel.localeCompare(bLabel, 'es', { sensitivity: 'base' });
            });
          setConsultorios(sorted);
        } catch (error) {
          console.error('Error al cargar consultorios:', error);
          ToastAlerts.error({
            title: 'Error',
            message: 'No se pudieron cargar los consultorios'
          });
        } finally {
          setLoadingConsultorios(false);
        }
      };
      loadConsultorios();
    }
  }, [isOpen]);

  // Nota: Se reemplazó el autocomplete de médicos por dropdown de consultorios

  // Realizar análisis
  const handleAnalizar = async () => {
    if (!formData.consultorioId) {
      ToastAlerts.warning({
        title: "Campo requerido",
        message: "Debe seleccionar un consultorio para realizar el análisis"
      });
      return;
    }

    if (!formData.fechaInicio || !formData.fechaFin) {
      ToastAlerts.warning({
        title: "Campos requeridos",
        message: "Debe seleccionar el rango de fechas para el análisis"
      });
      return;
    }

    try {
      setLoadingAnalisis(true);
      
      const request: PagoMedicoAnalisisRequest = {
        i_Consultorio: formData.consultorioId,
        d_FechaInicio: `${formData.fechaInicio}T00:00:00.000Z`,
        d_FechaFin: `${formData.fechaFin}T23:59:59.999Z`
      };

      const response = await pagoMedicosService.getPagoMedicoAnalisis(request);
      
      setAnalisisData(response);
      setShowAnalisis(true);
      
      // Inicializar el objeto de pago con datos base
      const initialPagoRequest: GenerarPagoMedicoRequest = {
        i_MedicoTratanteId: response.cabecera?.[0]?.medicoId!,
        d_FechaInicio: `${formData.fechaInicio}T00:00:00.000Z`,
        d_FechaFin: `${formData.fechaFin}T23:59:59.999Z`,
        r_PagadoTotal: 0,
        i_InsertUserId: 1, // TODO: Obtener del contexto de usuario
        servicesDetails: []
      };
      setPagoRequest(initialPagoRequest);
      
      ToastAlerts.success({
        title: "Análisis completado",
        message: "Se ha generado el análisis de pagos médicos exitosamente",
        duration: 3000
      });
      
    } catch (error) {
      console.error('Error al realizar análisis:', error);
      ToastAlerts.error({
        title: "Error en análisis",
        message: "No se pudo realizar el análisis. Verifique los datos e intente nuevamente"
      });
    } finally {
      setLoadingAnalisis(false);
    }
  };

  // (helper global formatDateForDisplay definido a nivel de módulo)

  // Función para obtener la fecha actual en formato YYYY-MM-DD
  const getCurrentDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  // Rango del mes anterior (primer y último día) en formato YYYY-MM-DD
  const getPreviousMonthRange = (): { start: string; end: string } => {
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth(); // mes actual (0-11)
    const prevMonthIndex = monthIndex - 1;
    const prevYear = prevMonthIndex >= 0 ? year : year - 1;
    const normalizedPrevMonthIndex = (prevMonthIndex + 12) % 12; // 0-11 para el mes anterior
    const lastDay = new Date(prevYear, normalizedPrevMonthIndex + 1, 0).getDate();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      start: `${prevYear}-${pad(normalizedPrevMonthIndex + 1)}-01`,
      end: `${prevYear}-${pad(normalizedPrevMonthIndex + 1)}-${pad(lastDay)}`,
    };
  };





  // Función para construir el objeto GenerarPagoMedicoRequest basado en servicios seleccionados
  const construirPagoRequest = (serviciosSeleccionados: Set<string>, detalles: PagoMedicoDetalle[]): GenerarPagoMedicoRequest => {
    let totalPagado = 0;
    const servicesDetails: ServicesPaidDetailRequest[] = [];

    detalles.forEach(detalle => {
      const serviceId = detalle.v_ServiceComponentId || `${detalle.numeroLinea}`;
      if (serviciosSeleccionados.has(serviceId) && detalle.esPagado !== 1) {
        totalPagado += detalle.pagoMedico;
        servicesDetails.push({
          v_ServiceId: detalle.v_ServiceId, // CAMBIO: usar v_ServiceId en lugar de v_ServiceComponentId
          r_Price: detalle.precioServicio,
          r_Porcentaje: detalle.porcentajeMedico,
          r_Pagado: detalle.pagoMedico
        });
      }
    });

    return {
      i_MedicoTratanteId: analisisData?.cabecera?.[0]?.medicoId!,
      d_FechaInicio: `${formData.fechaInicio}T00:00:00.000Z`,
      d_FechaFin: `${formData.fechaFin}T23:59:59.999Z`,
      r_PagadoTotal: totalPagado,
      i_InsertUserId: 1, // TODO: Obtener del contexto de usuario
      servicesDetails: servicesDetails
    };
  };

  // Función para formatear fecha a ddMMyyyy
  const formatDateToDDMMYYYY = (dateString: string): string => {
    try {
      // Limpiar la cadena - quitar apóstrofe inicial y espacios
      let cleanedString = dateString.toString().trim();
      
      // Manejar apóstrofe inicial (') que Excel usa para forzar texto
      if (cleanedString.startsWith("'")) {
        cleanedString = cleanedString.substring(1);
      }
      
      // Verificar si es un número (serial de Excel)
      const numericValue = parseFloat(cleanedString);
      if (!isNaN(numericValue) && numericValue > 0 && !cleanedString.includes('/') && !cleanedString.includes('-')) {
        // Es un número serial de Excel
        // Convertir serial de Excel a fecha
        // Excel cuenta desde 1900-01-01, pero hay un bug en Excel que considera 1900 como año bisiesto
        // Necesitamos restar 1 día si el número es >= 60 (después del 28 de febrero de 1900)
        const excelEpoch = new Date(1900, 0, 1); // 1 de enero de 1900
        const adjustedSerial = numericValue >= 60 ? numericValue - 1 : numericValue;
        const date = new Date(excelEpoch.getTime() + (adjustedSerial - 1) * 24 * 60 * 60 * 1000);
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        const result = `${day}${month}${year}`;
        return result;
      }
      
      // Manejar formato DD/MM/YYYY o D/M/YYYY
      if (cleanedString.includes('/')) {
        const parts = cleanedString.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          const result = `${day}${month}${year}`;
          return result;
        }
      } 
      // Manejar formato YYYY-MM-DD o YYYY-M-D
      else if (cleanedString.includes('-')) {
        // Intentar parse directo primero
        const date = new Date(cleanedString);
        if (!isNaN(date.getTime())) {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear().toString();
          const result = `${day}${month}${year}`;
          return result;
        }
        
        // Si no funciona, intentar parse manual
        const parts = cleanedString.split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const month = parts[1].padStart(2, '0');
          const day = parts[2].padStart(2, '0');
          const result = `${day}${month}${year}`;
          return result;
        }
      }
      // Manejar formato DD.MM.YYYY (formato europeo con puntos)
      else if (cleanedString.includes('.')) {
        const parts = cleanedString.split('.');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          const result = `${day}${month}${year}`;
          return result;
        }
      }
             // Manejar formato de 8 dígitos (DDMMYYYY o YYYYMMDD)
       else if (/^\d{8}$/.test(cleanedString)) {
         // Determinar si es DDMMYYYY o YYYYMMDD
         const firstTwoDigits = parseInt(cleanedString.substring(0, 2));
         const firstFourDigits = parseInt(cleanedString.substring(0, 4));
         
         // Si los primeros 4 dígitos son un año válido (1900-2100), es YYYYMMDD
         if (firstFourDigits >= 1900 && firstFourDigits <= 2100) {
           const year = cleanedString.substring(0, 4);
           const month = cleanedString.substring(4, 6);
           const day = cleanedString.substring(6, 8);
           const result = `${day}${month}${year}`;
           return result;
         }
         // Si los primeros 2 dígitos son un día válido (01-31), es DDMMYYYY
         else if (firstTwoDigits >= 1 && firstTwoDigits <= 31) {
           const result = cleanedString;
           return result;
         }
         // Si no se puede determinar, asumir DDMMYYYY
         else {
           return cleanedString;
         }
       }
       // Último recurso: extraer solo números
       else {
         const numbersOnly = cleanedString.replace(/\D/g, '');
         return numbersOnly;
       }
    } catch {
      return '';
    }
    
    // Return por defecto (nunca debería llegar aquí)
    return '';
  };

  // Función para cargar Excel y validar
  const handleCargaExcel = async (file: File) => {
    try {
      if (!analisisData?.detalles) {
        ToastAlerts.warning({
          title: "Análisis requerido",
          message: "Debe realizar primero el análisis para validar el Excel"
        });
        return;
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Buscar la hoja "Plantilla Atenciones"
      const sheetName = 'Plantilla Atenciones';
      if (!workbook.Sheets[sheetName]) {
        ToastAlerts.error({
          title: "Hoja no encontrada",
          message: `No se encontró la hoja "${sheetName}" en el archivo Excel`
        });
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
             // Procesar datos del Excel (saltar header en fila 0)
       const excelItems: ExcelValidationItem[] = [];
       for (let i = 1; i < jsonData.length; i++) {
         const row = jsonData[i] as (string | number | undefined)[];
         if (row && row.length >= 3 && row[0] && row[2]) { // Fecha y Comprobante son obligatorios
           

           
           excelItems.push({
             fechaServicio: row[0]?.toString() || '',
             paciente: row[1]?.toString() || '',
             comprobante: row[2]?.toString() || '',
             esValido: null,
             motivo: ''
           });
         }
       }

      if (excelItems.length === 0) {
        ToastAlerts.warning({
          title: "Sin datos válidos",
          message: "No se encontraron datos válidos en el Excel para procesar"
        });
        return;
      }

      // Validar contra detalles del análisis
      const validatedExcelItems = [...excelItems];
      const validatedDetalles = analisisData.detalles.map(detalle => ({ ...detalle, esValido: false }));

             // Recorrer detalles y buscar en Excel
       validatedDetalles.forEach(detalle => {
         const excelItem = validatedExcelItems.find(item => 
           item.comprobante === detalle.v_ComprobantePago
         );

         if (excelItem) {
           // Comparar fechas en formato ddMMyyyy
           const fechaExcel = formatDateToDDMMYYYY(excelItem.fechaServicio);
           const fechaDetalle = formatDateToDDMMYYYY(detalle.d_ServiceDate);



           if (fechaExcel === fechaDetalle) {
             // Fechas coinciden
             excelItem.esValido = true;
             excelItem.motivo = '';
             detalle.esValido = true;
           } else {
             // No coinciden las fechas
             excelItem.esValido = false;
             excelItem.motivo = 'No coincide la Fecha';
             detalle.esValido = false;
           }
         } else {
           // No se encuentra en Excel
           detalle.esValido = false;
         }
       });

      // Marcar elementos de Excel que nunca se validaron
      validatedExcelItems.forEach(item => {
        if (item.esValido === null) {
          item.esValido = false;
          item.motivo = 'No se encuentran en el sistema';
        }
      });

      // Verificar si hay errores
      const errores = validatedExcelItems
        .filter(item => !item.esValido)
        .map(item => ({
          comprobante: item.comprobante,
          motivo: item.motivo
        }));

      setValidationErrors(errores);
      setIsValidationActive(true);

             // Actualizar analisisData con la validación
       setAnalisisData({
         ...analisisData,
         detalles: validatedDetalles
       });

       // Selección automática basada en validación
       const nuevasSelecciones = new Set<string>();
       validatedDetalles.forEach(detalle => {
         if (detalle.esValido === true && detalle.esPagado !== 1) {
           const serviceId = detalle.v_ServiceComponentId || `${detalle.numeroLinea}`;
           nuevasSelecciones.add(serviceId);
         }
       });

       // Actualizar selecciones y construir nuevo pago request
       setSelectedServicios(nuevasSelecciones);
       const nuevoPagoRequest = construirPagoRequest(nuevasSelecciones, validatedDetalles);
       setPagoRequest(nuevoPagoRequest);



       if (errores.length > 0) {
         setShowValidationModal(true);
         ToastAlerts.warning({
           title: "Validación con errores",
           message: `Se encontraron ${errores.length} error(es). Solo se seleccionaron ${nuevasSelecciones.size} servicios válidos.`,
           duration: 4000
         });
       } else {
         ToastAlerts.success({
           title: "Validación exitosa",
           message: `Todos los ${validatedExcelItems.length} registros son válidos. Se seleccionaron automáticamente ${nuevasSelecciones.size} servicios.`,
           duration: 3000
         });
       }



    } catch (error) {
      console.error('Error al procesar Excel:', error);
      ToastAlerts.error({
        title: "Error de procesamiento",
        message: "No se pudo procesar el archivo Excel. Verifique el formato."
      });
    }
  };

  // Función para manejar la selección de archivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        ToastAlerts.error({
          title: "Formato no válido",
          message: "Solo se permiten archivos Excel (.xlsx, .xls)"
        });
        return;
      }
      handleCargaExcel(file);
    }
    // Limpiar el input para permitir seleccionar el mismo archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Función para limpiar completamente el formulario
  const handleLimpiar = () => {
    // Limpiar formulario
    setFormData({
      consultorioId: undefined,
      consultorioNombre: undefined,
      fechaInicio: '',
      fechaFin: ''
    });
    
    // Limpiar autocomplete completamente
    setConsultorios([]);
    setLoadingConsultorios(false);
    
    // Limpiar datos del análisis
    setAnalisisData(null);
    setShowAnalisis(false);
    
    // Limpiar selecciones
    setSelectedServicios(new Set());
    
    // Limpiar objeto de pago
    setPagoRequest(null);

    // Limpiar validación
    setValidationErrors([]);
    setShowValidationModal(false);
    setIsValidationActive(false);
    
    ToastAlerts.info({
      title: "Formulario limpiado",
      message: "Todos los campos han sido reiniciados",
      duration: 2000
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden my-4"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary to-primary-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Generar Nuevo Pago Médico
                  </h2>
                  <p className="text-white/80 text-sm">
                    Análisis y generación de pagos por servicios médicos
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto max-h-[70vh]">
            <div className="p-6 space-y-6">
              
              {/* Formulario de búsqueda */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Parámetros de Análisis
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Dropdown de Consultorios */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Activity className="w-4 h-4 inline mr-1" />
                      Consultorio *
                    </label>
                    <div className="relative">
                      <select
                        ref={consultorioSelectRef}
                        size={isConsultorioOpen ? 5 : 1}
                        onFocus={() => setIsConsultorioOpen(true)}
                        onBlur={() => setIsConsultorioOpen(false)}
                        value={formData.consultorioId !== undefined ? String(formData.consultorioId) : ''}
                        onKeyDown={(e) => {
                          const key = e.key;
                          const isChar = key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey;
                          if (isChar) {
                            typeaheadBufferRef.current += key;
                            selectByTypeahead(typeaheadBufferRef.current);
                            if (typeaheadTimerRef.current) window.clearTimeout(typeaheadTimerRef.current);
                            typeaheadTimerRef.current = window.setTimeout(() => {
                              typeaheadBufferRef.current = '';
                            }, TYPEAHEAD_TIMEOUT_MS);
                            e.preventDefault();
                            return;
                          }
                          if (key === 'Backspace') {
                            typeaheadBufferRef.current = typeaheadBufferRef.current.slice(0, -1);
                            if (typeaheadBufferRef.current) selectByTypeahead(typeaheadBufferRef.current);
                            else typeaheadBufferRef.current = '';
                            e.preventDefault();
                            return;
                          }
                          if (key === 'Escape') {
                            typeaheadBufferRef.current = '';
                            return;
                          }
                        }}
                        onChange={(e) => {
                          const selectedIdStr = e.target.value || '';
                          const selectedIdNum = selectedIdStr ? parseInt(selectedIdStr, 10) : undefined;
                          const selected = consultorios.find(c => (c.id === selectedIdStr) || (c.Id === selectedIdStr) || (c.IdI === selectedIdNum));
                          const effectiveIdNum = selected?.IdI ?? (selected?.id ? parseInt(selected.id, 10) : undefined);
                          setFormData(prev => ({
                            ...prev,
                            consultorioId: effectiveIdNum,
                            consultorioNombre: selected?.value1 ?? selected?.Value1 ?? undefined
                          }));
                        }}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent max-h-48 overflow-y-auto"
                      >
                        <option value="" disabled>
                          {loadingConsultorios ? 'Cargando consultorios...' : 'Seleccione consultorio'}
                        </option>
                        {consultorios.map((c) => (
                          <option key={`${c.GrupoId ?? ''}-${c.IdI ?? ''}-${c.id ?? c.Id ?? ''}`} value={c.id ?? c.Id ?? (c.IdI !== undefined ? String(c.IdI) : '')}>
                            {c.value1 ?? c.Value1}
                          </option>
                        ))}
                      </select>
                      {loadingConsultorios && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fecha de Inicio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      value={formData.fechaInicio}
                      max={getCurrentDate()}
                      onChange={(e) => {
                        setFormData({ ...formData, fechaInicio: e.target.value });
                      }}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  {/* Fecha de Fin */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Fecha de Fin *
                    </label>
                    <input
                      type="date"
                      value={formData.fechaFin}
                      max={getCurrentDate()}
                      onChange={(e) => {
                        setFormData({ ...formData, fechaFin: e.target.value });
                      }}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Período seleccionado */}
                {formData.fechaInicio && formData.fechaFin && (
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                    <div className="text-sm text-primary font-medium">
                      📅 Período de análisis: {formatDateForDisplay(formData.fechaInicio)} - {formatDateForDisplay(formData.fechaFin)}
                      {formData.consultorioNombre && (
                        <span className="ml-2">• {formData.consultorioNombre}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={handleLimpiar}
                    disabled={loadingAnalisis}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Limpiar
                  </button>

                  {/* Botón de Carga de Excel */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!showAnalisis || !analisisData}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Carga de Excel
                  </button>

                  {/* Botón para limpiar validación */}
                  {isValidationActive && (
                    <motion.button
                      onClick={() => {
                        setIsValidationActive(false);
                        setValidationErrors([]);
                        setShowValidationModal(false);
                        
                        // Actualizar analisisData sin validación
                        if (analisisData?.detalles) {
                          const cleanedDetalles = analisisData.detalles.map(detalle => {
                            // Crear nuevo objeto sin la propiedad esValido
                            const {
                              v_ServiceComponentId,
                              numeroLinea,
                              d_ServiceDate,
                              fechaServicioFormateada,
                              paciente,
                              v_ComprobantePago,
                              precioServicio,
                              precioServicioFormateado,
                              porcentajeMedico,
                              pagoMedico,
                              pagoMedicoFormateado,
                              esPagado,
                              estadoPago
                            } = detalle;
                            
                            return {
                              v_ServiceComponentId,
                              numeroLinea,
                              d_ServiceDate,
                              fechaServicioFormateada,
                              paciente,
                              v_ComprobantePago,
                              precioServicio,
                              precioServicioFormateado,
                              porcentajeMedico,
                              pagoMedico,
                              pagoMedicoFormateado,
                              esPagado,
                              estadoPago
                            } as PagoMedicoDetalle;
                          });
                          setAnalisisData({
                            ...analisisData,
                            detalles: cleanedDetalles
                          });
                        }
                        
                        ToastAlerts.info({
                          title: "Validación limpiada",
                          message: "Se ha vuelto al modo de selección manual",
                          duration: 3000
                        });
                      }}
                      className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <XCircle className="w-4 h-4" />
                      Limpiar Validación
                    </motion.button>
                  )}

                  {/* Input oculto para archivo */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  <motion.button
                    onClick={handleAnalizar}
                    disabled={loadingAnalisis || !formData.consultorioId}
                    className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loadingAnalisis ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-4 h-4" />
                        Realizar Análisis
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Resultados del análisis */}
              <AnimatePresence>
                {showAnalisis && analisisData && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Card de Cabecera */}
                <CabeceraCard cabeceras={analisisData?.cabecera || []} />
                
                {/* Card Lista de Médicos */}
                <ListaMedicosCard 
                  medicos={analisisData?.cabecera || []} 
                  selectedMedicos={selectedMedicos}
                  onToggleMedico={handleToggleMedico}
                  onToggleAll={handleToggleAllMedicos}
                />
                
                {/* Grid de Detalles */}
                <DetallesGrid 
                  detalles={detallesFiltrados as PagoMedicoDetalleExtendido[]} 
                  selectedServicios={selectedServicios}
                      setSelectedServicios={setSelectedServicios}
                      isValidationActive={isValidationActive}
                      isAnalysisLoaded={true}
                      cabeceras={analisisData?.cabecera || []}
                      onSelectionChange={(nuevasSelecciones) => {
                        const nuevoPagoRequest = construirPagoRequest(nuevasSelecciones, (detallesFiltrados || []) as PagoMedicoDetalle[]);
                        setPagoRequest(nuevoPagoRequest);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancelar
              </button>
              
              {/* Botón de Imprimir PDF */}
              {showAnalisis && analisisData && (
                <motion.button
                  onClick={handleImprimirPDF}
                  disabled={!pagoRequest || !pagoRequest.servicesDetails || pagoRequest.servicesDetails.length === 0 || generatingPDF}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    pagoRequest && pagoRequest.servicesDetails && pagoRequest.servicesDetails.length > 0 && !generatingPDF
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                  whileHover={pagoRequest && pagoRequest.servicesDetails && pagoRequest.servicesDetails.length > 0 && !generatingPDF ? { scale: 1.02 } : {}}
                  whileTap={pagoRequest && pagoRequest.servicesDetails && pagoRequest.servicesDetails.length > 0 && !generatingPDF ? { scale: 0.98 } : {}}
                >
                  {generatingPDF ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 inline mr-2" />
                      Imprimir
                    </>
                  )}
                </motion.button>
              )}

              {/* Botón de Generar Pago */}
              {showAnalisis && analisisData && (
                <motion.button
                  onClick={handleGenerarPagoCompleto}
                  disabled={!pagoRequest || !pagoRequest.servicesDetails || pagoRequest.servicesDetails.length === 0 || generatingPDF}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    pagoRequest && pagoRequest.servicesDetails && pagoRequest.servicesDetails.length > 0 && !generatingPDF
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                  whileHover={pagoRequest && pagoRequest.servicesDetails && pagoRequest.servicesDetails.length > 0 && !generatingPDF ? { scale: 1.02 } : {}}
                  whileTap={pagoRequest && pagoRequest.servicesDetails && pagoRequest.servicesDetails.length > 0 && !generatingPDF ? { scale: 0.98 } : {}}
                >
                  {generatingPDF ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      {pagoRequest && pagoRequest.servicesDetails && pagoRequest.servicesDetails.length > 0 
                        ? `Generar Pago (S/ ${pagoRequest.r_PagadoTotal.toFixed(2)})` 
                        : 'Seleccione servicios'
                      }
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Modal de errores de validación */}
        <AnimatePresence>
          {showValidationModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Errores de Validación
                    </h3>
                    <button
                      onClick={() => setShowValidationModal(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Se encontraron {validationErrors.length} error(es) en la validación del Excel:
                    </p>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {validationErrors.map((error, index) => (
                      <div
                        key={`validation-error-${error.comprobante.replace(/[^a-zA-Z0-9]/g, '')}-${index}-${error.motivo.length}`}
                        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                              Comprobante: {error.comprobante}
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-300">
                              {error.motivo}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowValidationModal(false)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </AnimatePresence>
  );
};

// Componente para mostrar la cabecera del análisis
const CabeceraCard: React.FC<{ cabeceras: PagoMedicoCabecera[] | null }> = ({ cabeceras }) => {
  // Verificar que cabeceras tenga datos
  if (!cabeceras || cabeceras.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Cargando análisis...</h3>
              <p className="text-white/80 text-sm">
                Procesando información del análisis
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Cargando datos del análisis...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalServicios = cabeceras.reduce((sum, c) => sum + (c.totalServiciosGenerados || 0), 0);
  const totalAPagar = cabeceras.reduce((sum, c) => sum + (c.totalAPagar || 0), 0);
  const yaPagadoSum = cabeceras.reduce((sum, c) => sum + ((c.montoYaPagado ?? c.pagoYaRealizado) || 0), 0);
  const serviciosPendientes = cabeceras.reduce((sum, c) => sum + (c.serviciosPendientes || 0), 0);
  const nombreProfesional = cabeceras.length === 1 ? (cabeceras[0].nombreMedico || 'N/A') : 'Varios médicos';
  const especialidadProfesional = cabeceras.length === 1 ? (cabeceras[0].especialidadMedico || 'N/A') : '—';
  const primerServicioTs = Math.min(...cabeceras.map(c => new Date(c.primerServicio).getTime()));
  const ultimoServicioTs = Math.max(...cabeceras.map(c => new Date(c.ultimoServicio).getTime()));
  const porcentajeMedicoLabel = cabeceras.length === 1 ? `${cabeceras[0].porcentajeMedico}%` : '—';
  const estadoGeneralLabel = cabeceras.length === 1 ? (cabeceras[0].estadoGeneral || 'En Proceso') : 'Mixto';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Análisis de Pagos Médicos</h3>
            <p className="text-white/80 text-sm">
              {nombreProfesional} • {especialidadProfesional}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Servicios */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">
                  Total Servicios
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {totalServicios}
                </p>
              </div>
            </div>
          </div>

          {/* Monto Total */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide">
                  Total a Pagar
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {`S/ ${totalAPagar.toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Ya Pagado */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wide">
                  Ya Pagado
                </p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {`S/ ${yaPagadoSum.toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Pendiente */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
                <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wide">
                  Servicios Pendientes
                </p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {serviciosPendientes}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Período de Servicios
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>
                {new Date(primerServicioTs).toLocaleDateString()} - {new Date(ultimoServicioTs).toLocaleDateString()} • 
                <span className="font-medium text-primary ml-1">Porcentaje médico: {porcentajeMedicoLabel}</span>
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Estado General
            </h4>
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                estadoGeneralLabel === 'Completado' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
              }`}>
                {estadoGeneralLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Card para listar médicos con check individual y "Marcar todos"
const ListaMedicosCard: React.FC<{ 
  medicos: PagoMedicoCabecera[];
  selectedMedicos: Set<number>;
  onToggleMedico: (medicoId: number, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
}> = ({ medicos, selectedMedicos, onToggleMedico, onToggleAll }) => {
  if (!medicos || medicos.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-blue-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">Lista de Médicos</h3>
          </div>
          <label className="inline-flex items-center gap-2 text-white">
            <input
              type="checkbox"
              className="w-4 h-4 text-white bg-white/20 border-white/60 rounded focus:ring-white"
              checked={selectedMedicos.size > 0 && selectedMedicos.size === medicos.length}
              onChange={(e) => onToggleAll(e.target.checked)}
            />
            <span className="text-sm">Marcar todos</span>
          </label>
        </div>
      </div>

      <div className="p-6 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <span className="sr-only">Seleccionar</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Profesional</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Servicios</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Primer Servicio</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Último Servicio</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {medicos.map((m, idx) => (
              <tr key={`medico-${m.medicoId ?? idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                    checked={selectedMedicos.has(m.medicoId)}
                    onChange={(e) => onToggleMedico(m.medicoId, e.target.checked)}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{m.nombreMedico || 'N/A'}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{m.totalServiciosGenerados ?? 0}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{m.primerServicio ? formatDateForDisplay(m.primerServicio) : '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{m.ultimoServicio ? formatDateForDisplay(m.ultimoServicio) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Componente para mostrar el grid de detalles
const DetallesGrid: React.FC<{ 
  detalles: PagoMedicoDetalleExtendido[];
  selectedServicios: Set<string>;
  setSelectedServicios: React.Dispatch<React.SetStateAction<Set<string>>>;
  onSelectionChange?: (selecciones: Set<string>) => void;
  isValidationActive?: boolean;
  isAnalysisLoaded?: boolean;
  cabeceras?: PagoMedicoCabecera[];
}> = ({ detalles, selectedServicios, setSelectedServicios, onSelectionChange, isValidationActive = false, isAnalysisLoaded = false, cabeceras = [] }) => {

  // Los checkboxes están deshabilitados si hay análisis cargado O si la validación está activa
  const areCheckboxesDisabled = isAnalysisLoaded || isValidationActive;

  // Función para manejar la selección individual de servicios
  const handleSelectServicio = (serviceId: string, isChecked: boolean) => {
    // Bloquear si los checkboxes están deshabilitados
    if (areCheckboxesDisabled) {
      ToastAlerts.warning({
        title: "Selección deshabilitada",
        message: "Los checkboxes están deshabilitados después de cargar el análisis",
        duration: 2000
      });
      return;
    }
    
    const newSelected = new Set(selectedServicios);
    if (isChecked) {
      newSelected.add(serviceId);
    } else {
      newSelected.delete(serviceId);
    }
    setSelectedServicios(newSelected);
    onSelectionChange?.(newSelected);
  };

  // Función para seleccionar/deseleccionar todos los servicios no pagados
  const handleSelectAll = (isChecked: boolean) => {
    // Bloquear si los checkboxes están deshabilitados
    if (areCheckboxesDisabled) {
      ToastAlerts.warning({
        title: "Selección deshabilitada",
        message: "Los checkboxes están deshabilitados después de cargar el análisis",
        duration: 2000
      });
      return;
    }
    
    let nuevosSeleccionados: Set<string>;
    if (isChecked) {
      nuevosSeleccionados = new Set<string>();
      detalles.forEach(detalle => {
        if (detalle.esPagado !== 1) {
          nuevosSeleccionados.add(detalle.v_ServiceComponentId || `${detalle.numeroLinea}`);
        }
      });
    } else {
      nuevosSeleccionados = new Set();
    }
    setSelectedServicios(nuevosSeleccionados);
    onSelectionChange?.(nuevosSeleccionados);
  };

  // Función para extraer el primer comprobante del campo separado por pipes
  const getFirstComprobante = (comprobante?: string): string => {
    if (!comprobante || comprobante.trim() === '') return 'N/A';
    const comprobantes = comprobante.split('|');
    return comprobantes[0]?.trim() || 'N/A';
  };

  // Función para generar key única para cada detalle
  const generateUniqueKey = (detalle: PagoMedicoDetalleExtendido, index: number): string => {
    const baseId = detalle.v_ServiceComponentId || detalle.v_ServiceId || detalle.numeroLinea || index;
    const fecha = detalle.d_ServiceDate ? new Date(detalle.d_ServiceDate).getTime() : index;
    return `detalle-${baseId}-idx${index}-dt${fecha}`;
  };

  // Resumen de selección (global y por médico)
  const selectedDetails = useMemo(() => {
    return detalles.filter(d => selectedServicios.has(d.v_ServiceComponentId || `${d.numeroLinea}`));
  }, [detalles, selectedServicios]);

  const globalServiciosSeleccionados = selectedDetails.length;
  const globalTotalComprobantes = selectedDetails.reduce((sum, d) => sum + (d.precioServicio || 0), 0);

  // Agrupar por médico y calcular totales y porcentajes
  const resumenPorMedico = useMemo(() => {
    const grupos = new Map<number, { medicoId: number; nombreMedico: string; porcentaje: number; serviciosCount: number; totalComprobantes: number; pagoMedicoTotal: number }>();
    selectedDetails.forEach(d => {
      const mId = (d as any).medicoId as number | undefined; // medicoId viene del backend
      if (mId === undefined || mId === null) return;
      const cab = cabeceras.find(c => c.medicoId === mId);
      const nombre = cab?.nombreMedico || 'Médico';
      const porcentaje = cab?.porcentajeMedico ?? d.porcentajeMedico ?? 0;
      const prev = grupos.get(mId);
      const nuevoTotal = (prev?.totalComprobantes || 0) + (d.precioServicio || 0);
      const nuevoCount = (prev?.serviciosCount || 0) + 1;
      const pagoTotal = (nuevoTotal * (porcentaje || 0)) / 100;
      grupos.set(mId, {
        medicoId: mId,
        nombreMedico: nombre,
        porcentaje,
        serviciosCount: nuevoCount,
        totalComprobantes: nuevoTotal,
        pagoMedicoTotal: pagoTotal
      });
    });
    return Array.from(grupos.values());
  }, [selectedDetails, cabeceras]);

  const pagoMedicoGlobal = resumenPorMedico.reduce((sum, g) => sum + g.pagoMedicoTotal, 0);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Detalle de Servicios ({detalles.length})
            </h3>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedServicios.size > 0 && selectedServicios.size === detalles.filter(d => d.esPagado !== 1).length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={areCheckboxesDisabled}
                    className={`w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                      areCheckboxesDisabled ? 'opacity-30 cursor-not-allowed' : ''
                    }`}
                    style={{
                      pointerEvents: areCheckboxesDisabled ? 'none' : 'auto'
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fecha Servicio
                </th>
                {isValidationActive && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Válido
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                  Paciente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-40">
                  Comprobante
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Precio Servicio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {detalles.length === 0 ? (
              <tr>
                <td colSpan={isValidationActive ? 8 : 7} className="px-6 py-12 text-center text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No se encontraron servicios en el período seleccionado</p>
                </td>
              </tr>
            ) : (
              detalles.map((detalle, index) => (
                <motion.tr
                  key={generateUniqueKey(detalle, index)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      disabled={detalle.esPagado === 1 || areCheckboxesDisabled}
                      checked={selectedServicios.has(detalle.v_ServiceComponentId || `${detalle.numeroLinea}`)}
                      onChange={(e) => handleSelectServicio(
                        detalle.v_ServiceComponentId || `${detalle.numeroLinea}`, 
                        e.target.checked
                      )}
                      className={`w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                        areCheckboxesDisabled ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                      style={{
                        pointerEvents: areCheckboxesDisabled ? 'none' : 'auto'
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {detalle.numeroLinea}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {detalle.fechaServicioFormateada || new Date(detalle.d_ServiceDate).toLocaleDateString()}
                  </td>
                  {isValidationActive && (
                    <td className="px-4 py-3 text-center">
                      {detalle.esValido === true ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : detalle.esValido === false ? (
                        <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white w-32 truncate" title={detalle.paciente || 'N/A'}>
                    {detalle.paciente || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 w-40 truncate" title={getFirstComprobante(detalle.v_ComprobantePago)}>
                    {getFirstComprobante(detalle.v_ComprobantePago)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {detalle.precioServicioFormateado || `S/ ${detalle.precioServicio.toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      detalle.esPagado === 1
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                    }`}>
                      {detalle.estadoPago || (detalle.esPagado === 1 ? 'Pagado' : 'Pendiente')}
                    </span>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Resumen al pie del card */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Servicios seleccionados</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{globalServiciosSeleccionados}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Total comprobantes</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{`S/ ${globalTotalComprobantes.toFixed(2)}`}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Pago médico total (aplicando % al total)</h4>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{`S/ ${pagoMedicoGlobal.toFixed(2)}`}</p>
          </div>
        </div>

        {resumenPorMedico.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Detalle por médico</h5>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Médico</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">% Médico</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Servicios</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Total comprobantes</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Pago médico</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {resumenPorMedico.map((r) => (
                    <tr key={`resumen-medico-${r.medicoId}`}>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{r.nombreMedico}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{`${r.porcentaje}%`}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{r.serviciosCount}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{`S/ ${r.totalComprobantes.toFixed(2)}`}</td>
                      <td className="px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300">{`S/ ${r.pagoMedicoTotal.toFixed(2)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerarPagoModal;