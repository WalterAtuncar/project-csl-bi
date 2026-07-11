import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Filter, Eye, Trash2, Printer, Search, ChevronLeft, ChevronRight, Calculator, FileSpreadsheet } from 'lucide-react';
import { EspecialidadesModal, GenerarPagoModal, PDFViewer } from '../../components/UI';
import {
  especialidadesMedicasService,
  ProfesionalResponse,
  SearchProfesionalesRequest
} from '../../services/EspecialidadesMedicasService';
import {
  pagoMedicosService,
  ListarPagosMedicosRequest,
  ListarPagosMedicosResponse
} from '../../services/PagoMedicosService';
import ToastAlerts from '../../components/UI/ToastAlerts';
import * as XLSX from 'xlsx';

// Interfaces para el manejo de filtros y datos
interface FilterState {
  profesionalSystemUserId?: number;
  profesionalNombre?: string; // Para mostrar en el header
  fechaInicio?: string;
  fechaFin?: string;
  incluirEliminados: boolean;
}

interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

// Usamos la interface real del servicio
type HonorarioMedicoItem = ListarPagosMedicosResponse;

const HonorariosMedicos: React.FC = () => {
  // Estados para controlar los modales
  const [showEspecialidadesModal, setShowEspecialidadesModal] = useState(false);
  const [showGenerarPagoModal, setShowGenerarPagoModal] = useState(false);

  // Función helper para obtener fechas por defecto
  const getDefaultDates = () => {
    const today = new Date();
    // Fecha fin: hoy
    const fechaFin = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // Fecha inicio: hace un mes
    const fechaInicio = new Date(today);
    fechaInicio.setMonth(fechaInicio.getMonth() - 1);
    const fechaInicioStr = fechaInicio.toISOString().split('T')[0]; // YYYY-MM-DD

    return { fechaInicio: fechaInicioStr, fechaFin };
  };

  // Función para resetear a fechas por defecto válidas
  const resetDatesToDefault = () => {
    const { fechaInicio, fechaFin } = getDefaultDates();
    setFilters(prev => ({ ...prev, fechaInicio, fechaFin }));
  };

  // Función helper para formatear fechas correctamente (evita problema de zona horaria)
  const formatDateForDisplay = (dateString: string): string => {
    // Dividir la fecha YYYY-MM-DD y crear fecha local
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month es 0-indexed
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Función para obtener la fecha actual en formato YYYY-MM-DD
  const getCurrentDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  // Función para validar fechas (solo valida, no muestra alertas automáticas)
  const validateDatesFilter = (fechaInicio: string, fechaFin: string): boolean => {
    if (!fechaInicio || !fechaFin) {
      return false;
    }

    const inicioDate = new Date(fechaInicio);
    const finDate = new Date(fechaFin);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Establecer a inicio del día para comparación

    // Validar que fecha de fin no sea mayor que hoy
    if (finDate > today) {
      return false;
    }

    // Validar que fecha de inicio no sea mayor que fecha de fin
    if (inicioDate > finDate) {
      return false;
    }

    // Validar que el rango no sea mayor a 1 año
    const diffTime = Math.abs(finDate.getTime() - inicioDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      return false;
    }

    return true;
  };

  // Estados para filtros y autocomplete
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => {
    const { fechaInicio, fechaFin } = getDefaultDates();
    return {
      fechaInicio,
      fechaFin,
      incluirEliminados: false
    };
  });

  // Estados para el autocomplete de profesionales
  const [searchProfesional, setSearchProfesional] = useState('');
  const [profesionales, setProfesionales] = useState<ProfesionalResponse[]>([]);
  const [showProfesionales, setShowProfesionales] = useState(false);
  const [loadingProfesionales, setLoadingProfesionales] = useState(false);

  // Estados para el grid (datos reales)
  const [honorarios, setHonorarios] = useState<HonorarioMedicoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    totalPages: 0,
    totalRecords: 0
  });

  // Estados para el visor PDF
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string>('');

  // Buscar profesionales cuando el texto tenga 3+ caracteres
  useEffect(() => {
    const searchProfesionales = async () => {
      if (searchProfesional.length >= 3) {
        try {
          setLoadingProfesionales(true);
          const request: SearchProfesionalesRequest = {
            TextSearch: searchProfesional
          };
          const response = await especialidadesMedicasService.searchProfesionales(request);
          setProfesionales(response || []);
          setShowProfesionales(true);
        } catch {
          ToastAlerts.error({
            title: "Error",
            message: "No se pudieron cargar los profesionales"
          });
        } finally {
          setLoadingProfesionales(false);
        }
      } else {
        setProfesionales([]);
        setShowProfesionales(false);
      }
    };

    const debounceTimer = setTimeout(searchProfesionales, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchProfesional]);

  // Cargar honorarios médicos
  const loadHonorarios = async (customFilters?: FilterState) => {
    try {
      setLoading(true);

      // Usar filtros personalizados o los del estado
      const currentFilters = customFilters || filters;

      // Construir el request basado en los filtros
      const request: ListarPagosMedicosRequest = {};

      if (currentFilters.profesionalSystemUserId) {
        request.i_MedicoTratanteId = currentFilters.profesionalSystemUserId;
      }

      if (currentFilters.fechaInicio) {
        // Convertir fecha YYYY-MM-DD a formato ISO con hora de inicio del día
        request.d_FechaInicio = `${currentFilters.fechaInicio}T00:00:00.000Z`;
      }

      if (currentFilters.fechaFin) {
        // Convertir fecha YYYY-MM-DD a formato ISO con hora de fin del día
        request.d_FechaFin = `${currentFilters.fechaFin}T23:59:59.999Z`;
      }

      request.i_IncludeDeleted = currentFilters.incluirEliminados;

      const response = await pagoMedicosService.listarPagosMedicos(request);

      setHonorarios(response || []);
      setPagination(prev => ({
        ...prev,
        totalRecords: response?.length || 0,
        totalPages: Math.ceil((response?.length || 0) / prev.pageSize)
      }));

      // Mostrar notificación de resultado solo si hay filtros aplicados
      const hasFilters = currentFilters.profesionalSystemUserId || currentFilters.fechaInicio || currentFilters.fechaFin;
      if (response && response.length > 0 && hasFilters) {
        ToastAlerts.success({
          title: "Datos cargados",
          message: `Se encontraron ${response.length} honorario(s) médico(s)`,
          duration: 3000
        });
      }

    } catch {
      setHonorarios([]);
      setPagination(prev => ({ ...prev, totalRecords: 0, totalPages: 0 }));

      ToastAlerts.error({
        title: "Error de conexión",
        message: "No se pudieron cargar los honorarios médicos. Verifique su conexión a internet.",
        action: {
          label: "Reintentar",
          onClick: () => loadHonorarios(customFilters)
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales al montar el componente
  useEffect(() => {
    // Verificar que las fechas por defecto sean válidas
    if (filters.fechaInicio && filters.fechaFin) {
      if (!validateDatesFilter(filters.fechaInicio, filters.fechaFin)) {
        // Si las fechas por defecto no son válidas, resetear
        resetDatesToDefault();
        return;
      }
    }

    // Cargar honorarios con filtros por defecto (último mes)
    loadHonorarios();
  }, []); // Solo se ejecuta al montar el componente

  // Funciones para manejar los botones de modales
  const handleGestionEspecialidades = () => {
    setShowEspecialidadesModal(true);
  };

  const handleGenerarPago = () => {
    setShowGenerarPagoModal(true);
  };

  const handlePagoGenerado = () => {
    // Callback cuando se genera un pago exitosamente
    loadHonorarios(); // Recargar datos
    ToastAlerts.success({
      title: "Pago generado",
      message: "El pago médico se ha generado exitosamente",
      duration: 4000
    });
  };

  // Aplicar filtros
  const applyFilters = async (newFilters: FilterState) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFilters(false);

    // Cargar datos con los nuevos filtros
    await loadHonorarios(newFilters);
  };

  // Limpiar filtros (volver a valores por defecto)
  const clearFilters = async () => {
    const { fechaInicio, fechaFin } = getDefaultDates();
    const defaultFilters = {
      fechaInicio,
      fechaFin,
      incluirEliminados: false
    };

    setFilters(defaultFilters);
    setSearchProfesional('');
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFilters(false);

    // Recargar con filtros por defecto
    await loadHonorarios(defaultFilters);
  };

  // Seleccionar profesional del autocomplete
  const selectProfesional = (profesional: ProfesionalResponse) => {
    setFilters(prev => ({
      ...prev,
      profesionalSystemUserId: profesional.systemUserId,
      profesionalNombre: profesional.name
    }));
    setSearchProfesional(profesional.name);
    setShowProfesionales(false);
  };

  // Cambiar página
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Funciones para las acciones del grid
  const handleVer = (item: HonorarioMedicoItem) => {
    ToastAlerts.info({
      title: "Ver detalles",
      message: `Mostrando detalles del pago médico ID: ${item.i_PaidId} - ${item.nombreMedico}`,
      duration: 4000
    });
  };

  const handleEliminar = (item: HonorarioMedicoItem) => {
    if (item.i_IsDeleted === 1) {
      ToastAlerts.warning({
        title: "Registro ya eliminado",
        message: `El pago médico ID: ${item.i_PaidId} ya está eliminado`,
        duration: 3000
      });
      return;
    }

    const confirm = window.confirm(`¿Está seguro de eliminar el pago médico ID: ${item.i_PaidId} de ${item.nombreMedico}?`);

    if (confirm) {
      ToastAlerts.info({
        title: "Funcionalidad en desarrollo",
        message: `Eliminación del pago médico ID: ${item.i_PaidId} pendiente de implementar`,
        duration: 4000
      });
    }
  };

  const handleImprimir = (item: HonorarioMedicoItem) => {
    // Verificar si el item tiene comprobante en base64
    if (!item.v_Comprobante) {
      ToastAlerts.warning({
        title: "Sin comprobante",
        message: `El pago médico ID: ${item.i_PaidId} no tiene un comprobante PDF disponible`,
        duration: 4000
      });
      return;
    }

    // Verificar que el comprobante sea un PDF válido en base64
    if (!item.v_Comprobante.startsWith('JVBER') && !item.v_Comprobante.startsWith('data:application/pdf;base64,')) {
      ToastAlerts.warning({
        title: "Formato inválido",
        message: `El comprobante del pago médico ID: ${item.i_PaidId} no es un PDF válido`,
        duration: 4000
      });
      return;
    }

    try {
      // Preparar el base64 SIN prefijo para react-pdf (type: 'base64')
      let cleanBase64 = item.v_Comprobante;

      // Si tiene el prefijo, quitarlo
      if (cleanBase64.startsWith('data:application/pdf;base64,')) {
        cleanBase64 = cleanBase64.replace('data:application/pdf;base64,', '');
      }

      // Guardar el PDF y abrir el visor
      setPdfBase64(cleanBase64);
      setShowPDFViewer(true);

      ToastAlerts.success({
        title: "Comprobante abierto",
        message: `Mostrando comprobante del pago médico ID: ${item.i_PaidId} - ${item.nombreMedico}`,
        duration: 3000
      });

    } catch {
      ToastAlerts.error({
        title: "Error al abrir comprobante",
        message: "No se pudo abrir el comprobante PDF. Intente nuevamente.",
        duration: 4000
      });
    }
  };

  const handleDescargarPlantilla = () => {
    try {
      // Crear los datos para la plantilla Excel
      const templateData = [
        // Cabeceras
        ['Fecha Servicio', 'Paciente', 'Comprobante'],
        // Registros de ejemplo para guía del usuario
        ['05/06/2025', 'GARCIA LOPEZ, MARIA ELENA', 'B008-00074950'],
        ['05/06/2025', 'RODRIGUEZ PEREZ, JUAN CARLOS', 'B008-00074951'],
        // Filas vacías para que el usuario complete
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
      ];

      // Crear libro de trabajo
      const workbook = XLSX.utils.book_new();

      // Crear datos para la hoja de instrucciones
      const instructionsData = [
        ['INSTRUCCIONES PARA LLENAR LA PLANTILLA DE ATENCIONES'],
        [''],
        ['Esta plantilla debe ser llenada con los datos de las atenciones médicas realizadas.'],
        ['Por favor, siga las siguientes indicaciones para cada columna:'],
        [''],
        ['📅 FECHA SERVICIO: (OBLIGATORIO)'],
        ['• Formato: DD/MM/YYYY (ejemplo: 05/06/2025)'],
        ['• Descripción: Fecha en que se realizó la atención médica'],
        ['• Ejemplo: 05/06/2025'],
        [''],
        ['👤 PACIENTE: (OPCIONAL)'],
        ['• Formato: APELLIDOS, NOMBRES (todo en mayúsculas)'],
        ['• Descripción: Nombre completo del paciente'],
        ['• Ejemplo: GARCIA LOPEZ, MARIA ELENA'],
        [''],
        ['🧾 COMPROBANTE: (OBLIGATORIO)'],
        ['• Formato: B008-00074XXX (donde XXX son números)'],
        ['• Descripción: Código del comprobante de la atención'],
        ['• Ejemplo: B008-00074950'],
        [''],
        ['⚠️ NOTAS IMPORTANTES:'],
        ['• Complete los campos obligatorios: FECHA SERVICIO y COMPROBANTE'],
        ['• Verifique que las fechas sean válidas'],
        ['• Asegúrese de que los nombres estén correctamente escritos'],
        ['• No modifique las cabeceras de las columnas'],
        ['• Puede agregar tantas filas como necesite'],
        ['• No deje filas vacías entre registros'],
        ['• Las filas con ejemplos son solo para referencia'],
        [''],
        ['✅ PASOS A SEGUIR:'],
        ['1. Vaya a la hoja "Plantilla Atenciones"'],
        ['2. Complete los datos a partir de la fila 2 (reemplace los ejemplos)'],
        ['3. Guarde el archivo cuando termine'],
        ['4. Envíe el archivo al administrador'],
        [''],
        ['❓ En caso de dudas, comuníquese con el administrador.']
      ];

      // Crear hoja de instrucciones
      const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);

      // Configurar ancho de columnas para instrucciones
      const instructionsColWidths = [
        { wch: 80 } // Columna única más ancha para las instrucciones
      ];
      instructionsSheet['!cols'] = instructionsColWidths;

      // Agregar hoja de instrucciones al libro
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

      // Crear hoja de trabajo desde array de arrays
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);

      // Configurar ancho de columnas
      const colWidths = [
        { wch: 15 }, // Fecha Servicio
        { wch: 35 }, // Paciente
        { wch: 20 }  // Comprobante
      ];
      worksheet['!cols'] = colWidths;

      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Atenciones');

      // Generar nombre de archivo con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `plantilla-atenciones-${timestamp}.xlsx`;

      // Escribir archivo Excel
      XLSX.writeFile(workbook, filename);

      ToastAlerts.success({
        title: "Plantilla descargada",
        message: `La plantilla de atenciones se ha descargado exitosamente: ${filename}`,
        duration: 4000
      });

    } catch {
      ToastAlerts.error({
        title: "Error de descarga",
        message: "No se pudo generar la plantilla de atenciones. Intente nuevamente.",
        duration: 4000
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Honorarios Médicos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestión y control de honorarios médicos por especialidad
          </p>
          {filters.fechaInicio && filters.fechaFin && (
            <div className="mt-2 text-sm text-primary font-medium">
              📅 Período: {formatDateForDisplay(filters.fechaInicio)} - {formatDateForDisplay(filters.fechaFin)}
              {!filters.profesionalSystemUserId && (
                <span className="ml-2 text-gray-500">• Todos los médicos</span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <motion.button
            onClick={handleDescargarPlantilla}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-green-600 border border-green-600 hover:border-green-700 rounded-lg text-sm font-medium transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 inline text-green-600" />
            Descargar plantilla de atenciones
          </motion.button>

          <motion.button
            onClick={handleGenerarPago}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Calculator className="w-4 h-4 mr-2 inline text-white" />
            Generar Nuevo Pago
          </motion.button>

          {/* TODO: Habilitar cuando se implemente la funcionalidad de gestión de especialidades */}
          {/* <motion.button
            onClick={handleGestionEspecialidades}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings className="w-4 h-4 mr-2 inline text-white" />
            Gestión de especialidades
          </motion.button> */}

          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter className="w-4 h-4 mr-2 inline" />
            Filtros
          </motion.button>
        </div>
      </div>

      {/* Panel de filtros */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <FilterPanel
              filters={filters}
              searchProfesional={searchProfesional}
              profesionales={profesionales}
              showProfesionales={showProfesionales}
              loadingProfesionales={loadingProfesionales}
              onSearchProfesionalChange={setSearchProfesional}
              onSelectProfesional={selectProfesional}
              onApply={applyFilters}
              onClear={clearFilters}
              getCurrentDate={getCurrentDate}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid de Honorarios Médicos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header de la tabla */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Honorarios Médicos
              {filters.profesionalSystemUserId && filters.profesionalNombre && (
                <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm font-medium">
                  {filters.profesionalNombre}
                </span>
              )}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {pagination.totalRecords} registros encontrados
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  ID Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fecha de Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Médico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Pagado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Servicios
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : honorarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron registros. Utilice los filtros para buscar honorarios médicos.
                  </td>
                </tr>
              ) : (
                honorarios.map((honorario, index) => (
                  <motion.tr
                    key={`honorario-${honorario.i_PaidId}-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {honorario.i_PaidId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {honorario.fechaPagoFormateada || new Date(honorario.d_PayDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {honorario.nombreMedico}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {honorario.totalFormateado || `S/ ${honorario.r_PagadoTotal.toFixed(2)}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {honorario.totalServicios}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${honorario.i_IsDeleted === 1
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                        }`}>
                        {honorario.estado || (honorario.i_IsDeleted === 1 ? 'Eliminado' : 'Activo')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">

                        <motion.button
                          onClick={() => handleImprimir(honorario)}
                          className="text-gray-600 hover:text-gray-800"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          title="Imprimir"
                        >
                          <Printer className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Modal de Gestión de Especialidades */}
      <EspecialidadesModal
        isOpen={showEspecialidadesModal}
        onClose={() => setShowEspecialidadesModal(false)}
      />

      {/* Modal de Generar Nuevo Pago */}
      <GenerarPagoModal
        isOpen={showGenerarPagoModal}
        onClose={() => setShowGenerarPagoModal(false)}
        onPagoGenerado={handlePagoGenerado}
      />

      {/* Visor de PDF para comprobantes */}
      <PDFViewer
        isOpen={showPDFViewer}
        onClose={() => {
          setShowPDFViewer(false);
          setPdfBase64('');
        }}
        source={{
          type: 'base64',
          data: pdfBase64,
          filename: 'comprobante-pago-medico.pdf'
        }}
        title="Comprobante de Pago Médico"
      />
    </div>
  );
};

// Componente de filtros
interface FilterPanelProps {
  filters: FilterState;
  searchProfesional: string;
  profesionales: ProfesionalResponse[];
  showProfesionales: boolean;
  loadingProfesionales: boolean;
  onSearchProfesionalChange: (value: string) => void;
  onSelectProfesional: (profesional: ProfesionalResponse) => void;
  onApply: (filters: FilterState) => void;
  onClear: () => Promise<void>;
  getCurrentDate: () => string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  searchProfesional,
  profesionales,
  showProfesionales,
  loadingProfesionales,
  onSearchProfesionalChange,
  onSelectProfesional,
  onApply,
  onClear,
  getCurrentDate
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Sincronizar localFilters cuando filters cambie (ej: selección de profesional)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Autocomplete de Profesionales */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Buscar Profesional
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchProfesional}
              onChange={(e) => onSearchProfesionalChange(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Mínimo 3 caracteres..."
            />
            {loadingProfesionales && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}
          </div>

          {/* Dropdown de profesionales */}
          {showProfesionales && profesionales.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {profesionales.map((profesional) => (
                <button
                  key={profesional.systemUserId}
                  onClick={() => onSelectProfesional(profesional)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {profesional.userName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {profesional.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fecha de Inicio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fecha de Inicio
          </label>
          <input
            type="date"
            value={localFilters.fechaInicio || ''}
            max={getCurrentDate()}
            onChange={(e) => {
              setLocalFilters({ ...localFilters, fechaInicio: e.target.value });
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Fecha de Fin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fecha de Fin
          </label>
          <input
            type="date"
            value={localFilters.fechaFin || ''}
            max={getCurrentDate()}
            onChange={(e) => {
              setLocalFilters({ ...localFilters, fechaFin: e.target.value });
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Checkbox Incluir Eliminados */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Opciones
          </label>
          <div className="flex items-center gap-4 mt-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.incluirEliminados}
                onChange={(e) => setLocalFilters({ ...localFilters, incluirEliminados: e.target.checked })}
                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Incluir eliminados
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => onClear()}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Limpiar
        </button>
        <button
          onClick={() => onApply(localFilters)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
};

// Componente de paginación
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Página {currentPage} de {totalPages}
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getVisiblePages().map((page, index) => (
          <button
            key={`page-${page}-${index}`}
            onClick={() => typeof page === 'number' ? onPageChange(page) : undefined}
            disabled={typeof page !== 'number'}
            className={`px-3 py-1 rounded-lg text-sm ${page === currentPage
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              } ${typeof page !== 'number' ? 'cursor-default' : ''}`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default HonorariosMedicos; 
