import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, ChevronLeft, ChevronRight, Download, Edit, Plus, Trash2 } from 'lucide-react';
import { 
  cashClosingService,
  CashClosingPagedItem,
  CashClosingDetailPagedRequest,
  CashClosingDetailPagedItem
} from '../../services/CashClosingService';
import ToastAlerts from './ToastAlerts';
import CashClosingDetailModal from './CashClosingDetailModal';

interface DetalleModalProps {
  isOpen: boolean;
  cierre: CashClosingPagedItem | null;
  onClose: () => void;
  onDataChange?: () => void; // Callback para recargar datos del padre
}

interface DetalleFiltersState {
  correlativoDocumento?: string;
  esEgreso?: boolean | null;
  fechaVenta?: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

// Estado local para los totales del cierre
interface CierreTotales {
  totalIngresos: number;
  totalEgresos: number;
  totalNeto: number;
  formattedTotalIngresos: string;
  formattedTotalEgresos: string;
  formattedTotalNeto: string;
}

const DetalleModal: React.FC<DetalleModalProps> = ({ isOpen, cierre, onClose, onDataChange }) => {
  // Función para determinar si es cierre diario o mensual
  const esCierreDiario = (cierre: CashClosingPagedItem | null): boolean => {
    return cierre?.idCierreDiario !== undefined && cierre?.idCierreDiario !== null;
  };

  // Estado local del modal
  const [detalles, setDetalles] = useState<CashClosingDetailPagedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<DetalleFiltersState>({});
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 5,
    totalPages: 0,
    totalRecords: 0
  });

  // Estado local para manejar los totales del cierre
  const [cierreTotales, setCierreTotales] = useState<CierreTotales>({
    totalIngresos: 0,
    totalEgresos: 0,
    totalNeto: 0,
    formattedTotalIngresos: '',
    formattedTotalEgresos: '',
    formattedTotalNeto: ''
  });

  // Estado para el modal de crear/editar detalle
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailModalOperation, setDetailModalOperation] = useState<'INSERT' | 'UPDATE'>('INSERT');
  const [selectedDetalle, setSelectedDetalle] = useState<CashClosingDetailPagedItem | undefined>();

  // Estado para el modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [detalleToDelete, setDetalleToDelete] = useState<CashClosingDetailPagedItem | undefined>();

  // Función para formatear números como moneda
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }, []);

  // Función para actualizar los totales locales
  const updateCierreTotales = useCallback((totalIngresos: number, totalEgresos: number) => {
    const totalNeto = totalIngresos - totalEgresos;
    
    setCierreTotales({
      totalIngresos,
      totalEgresos,
      totalNeto,
      formattedTotalIngresos: formatCurrency(totalIngresos),
      formattedTotalEgresos: formatCurrency(totalEgresos),
      formattedTotalNeto: formatCurrency(totalNeto)
    });
  }, [formatCurrency]);

  // Función para restar de los totales cuando se elimina un detalle
  const restarDeTotal = useCallback((detalle: CashClosingDetailPagedItem) => {
    setCierreTotales(prev => {
      let newTotalIngresos = prev.totalIngresos;
      let newTotalEgresos = prev.totalEgresos;

      if (detalle.esEgreso) {
        // Es un egreso, restar de totalEgresos
        newTotalEgresos = prev.totalEgresos - detalle.montoVenta;
      } else {
        // Es un ingreso, restar de totalIngresos
        newTotalIngresos = prev.totalIngresos - detalle.montoVenta;
      }

      const newTotalNeto = newTotalIngresos - newTotalEgresos;

      return {
        totalIngresos: newTotalIngresos,
        totalEgresos: newTotalEgresos,
        totalNeto: newTotalNeto,
        formattedTotalIngresos: formatCurrency(newTotalIngresos),
        formattedTotalEgresos: formatCurrency(newTotalEgresos),
        formattedTotalNeto: formatCurrency(newTotalNeto)
      };
    });
  }, [formatCurrency]);

  // Función para sumar a los totales cuando se agrega un detalle
  const sumarATotal = useCallback((monto: number, esEgreso: boolean) => {
    setCierreTotales(prev => {
      let newTotalIngresos = prev.totalIngresos;
      let newTotalEgresos = prev.totalEgresos;

      if (esEgreso) {
        // Es un egreso, sumar a totalEgresos
        newTotalEgresos = prev.totalEgresos + monto;
      } else {
        // Es un ingreso, sumar a totalIngresos
        newTotalIngresos = prev.totalIngresos + monto;
      }

      const newTotalNeto = newTotalIngresos - newTotalEgresos;

      return {
        totalIngresos: newTotalIngresos,
        totalEgresos: newTotalEgresos,
        totalNeto: newTotalNeto,
        formattedTotalIngresos: formatCurrency(newTotalIngresos),
        formattedTotalEgresos: formatCurrency(newTotalEgresos),
        formattedTotalNeto: formatCurrency(newTotalNeto)
      };
    });
  }, [formatCurrency]);

  // Inicializar totales cuando se abre el modal o cambia el cierre
  useEffect(() => {
    if (isOpen && cierre) {
      updateCierreTotales(cierre.totalIngresos, cierre.totalEgresos);
    }
  }, [isOpen, cierre, updateCierreTotales]);

  // Cargar detalles del cierre
  const loadDetalles = useCallback(async (page: number = 1, resetPagination: boolean = false, customFilters?: DetalleFiltersState) => {
    if (!cierre) return;

    try {
      setLoading(true);
      
      const currentPage = resetPagination ? 1 : page;
      let filtersToUse = customFilters || filters;
      
      // Si es cierre diario, aplicar filtro automático por fecha del día
      if (esCierreDiario(cierre)) {
        // Para cierres diarios, usar fechaInicio como la fecha específica del día
        const fechaDia = cierre.fechaInicio; // Fecha específica del día
        filtersToUse = {
          ...filtersToUse,
          fechaVenta: fechaDia
        };
        console.log('🟡 CIERRE DIARIO DETECTADO - Filtrando por fecha:', fechaDia);
      }
      
      const request: CashClosingDetailPagedRequest = {
        IdCierreCaja: cierre.idCierreCaja,
        Page: currentPage,
        PageSize: pagination.pageSize,
        CorrelativoDocumento: filtersToUse.correlativoDocumento?.trim() || undefined,
        EsEgreso: filtersToUse.esEgreso === null || filtersToUse.esEgreso === undefined ? undefined : filtersToUse.esEgreso,
        FechaVenta: filtersToUse.fechaVenta || undefined
      };

      console.log('🟢 REQUEST ENVIADO:', request); // DEBUG

      const response = await cashClosingService.getCashClosingDetailPaged(request);
      
      setDetalles(response.detalles);
      setPagination(prev => ({
        ...prev,
        page: currentPage,
        totalPages: response.paginacion.totalPaginas,
        totalRecords: response.paginacion.totalRegistros
      }));
    } catch (err) {
      console.error('Error loading detalles:', err);
      ToastAlerts.error({
        title: "Error al cargar detalles",
        message: "No se pudieron cargar los detalles del cierre de caja"
      });
    } finally {
      setLoading(false);
    }
  }, [cierre, filters, pagination.pageSize]);

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && cierre) {
      setFilters({});
      setPagination(prev => ({ ...prev, page: 1 }));
      loadDetalles(1, true, {}); // Pasar filtros vacíos explícitamente
    }
  }, [isOpen, cierre]);

  // Recargar cuando cambien los filtros
  useEffect(() => {
    if (isOpen && cierre && Object.keys(filters).length > 0) {
      loadDetalles(1, true, filters);
    }
  }, [filters, isOpen, cierre, loadDetalles]);

  // Aplicar filtros
  const applyFilters = useCallback((newFilters: DetalleFiltersState) => {
    console.log('🟢 APLICANDO FILTROS:', newFilters); // DEBUG
    setFilters(newFilters);
    setShowFilters(false);
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // Los filtros se aplicarán automáticamente por el useEffect
  }, []);

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    const emptyFilters = {};
    setFilters(emptyFilters);
    setShowFilters(false);
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // Recargar inmediatamente con filtros vacíos
    loadDetalles(1, true, emptyFilters);
  }, [loadDetalles]);

  // Cambiar página
  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    loadDetalles(newPage, false);
  }, [loadDetalles]);

  // Funciones para el modal de crear/editar detalle
  const handleOpenEditModal = useCallback((detalle: CashClosingDetailPagedItem) => {
    setDetailModalOperation('UPDATE');
    setSelectedDetalle(detalle);
    setShowDetailModal(true);
  }, []);

  const handleOpenCreateModal = useCallback(() => {
    setDetailModalOperation('INSERT');
    setSelectedDetalle(undefined);
    setShowDetailModal(true);
  }, []);

  const handleDeleteDetail = useCallback(async (detalle: CashClosingDetailPagedItem) => {
    // Verificar permisos - temporalmente deshabilitado
    // if (!authService.isUserCreator(detalle.usuarioCreacion)) {
    //   ToastAlerts.warning({
    //     title: "Sin permisos", 
    //     message: "Solo el usuario que creó este movimiento puede eliminarlo",
    //     duration: 5000
    //   });
    //   return;
    // }

    try {
      const loadingId = ToastAlerts.loading("Eliminando movimiento...");

      // Usar la interfaz correcta del servicio
      const deleteRequest = {
        operacion: 'DELETE',
        idCierreCajaDetalle: detalle.idCierreCajaDetalle
      };

      await cashClosingService.deleteCashClosingDetail(detalle.idCierreCajaDetalle, deleteRequest);
      
      ToastAlerts.promiseToSuccess(loadingId, {
        title: "¡Movimiento eliminado!",
        message: `El ${detalle.esEgreso ? 'egreso' : 'ingreso'} se eliminó correctamente`,
        duration: 3000
      });
      
      // Actualizar totales localmente sin consultar al backend
      restarDeTotal(detalle);
      
      // Recargar detalles
      loadDetalles(pagination.page, false);
      // Notificar al padre para que recargue sus datos
      onDataChange?.();
      
      // Cerrar el modal de confirmación
      setShowDeleteModal(false);
      setDetalleToDelete(undefined);
      
    } catch (err) {
      const errorLoadingId = ToastAlerts.loading(""); 
      ToastAlerts.promiseToError(errorLoadingId, {
        title: "Error al eliminar",
        message: "No se pudo eliminar el movimiento. Inténtelo nuevamente.",
        action: {
          label: "Reintentar",
          onClick: () => handleDeleteDetail(detalle)
        }
      });
      console.error('Error deleting detail:', err);
    }
  }, [restarDeTotal, loadDetalles, pagination.page, onDataChange]);

  const handleCloseDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedDetalle(undefined);
  }, []);

  const handleDetailModalSuccess = useCallback((operacion?: string, monto?: number, esEgreso?: boolean, detallePrevio?: CashClosingDetailPagedItem) => {
    // Actualizar totales localmente según la operación realizada
    if (operacion === 'INSERT' && monto !== undefined && esEgreso !== undefined) {
      // Nuevo detalle agregado
      sumarATotal(monto, esEgreso);
    } else if (operacion === 'UPDATE' && monto !== undefined && esEgreso !== undefined && detallePrevio) {
      // Detalle editado: restar el monto anterior y sumar el nuevo
      restarDeTotal(detallePrevio);
      sumarATotal(monto, esEgreso);
    }
    
    // Recargar detalles
    loadDetalles(pagination.page, false);
    // Notificar al padre para que recargue sus datos
    onDataChange?.();
  }, [sumarATotal, restarDeTotal, loadDetalles, pagination.page, onDataChange]);

  if (!isOpen || !cierre) return null;

  return (
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
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-6 border-b border-primary-dark">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">
                  Detalle del Cierre de Caja
                </h2>
                {/* Badge para cierre diario */}
                {esCierreDiario(cierre) && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-yellow-900">
                    📅 Diario
                  </span>
                )}
              </div>
              <p className="text-blue-100 mt-1">
                {cierre.periodoFormateado} - {cierre.nombreMes} {cierre.año}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white hover:text-blue-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Resumen del cierre */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
              <div className="text-sm text-green-100 font-medium">Total Ingresos</div>
              <div className="text-xl font-bold text-white">{cierreTotales.formattedTotalIngresos}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
              <div className="text-sm text-red-100 font-medium">Total Egresos</div>
              <div className="text-xl font-bold text-white">{cierreTotales.formattedTotalEgresos}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
              <div className="text-sm text-blue-100 font-medium">Total Neto</div>
              <div className={`text-xl font-bold ${cierreTotales.totalNeto >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {cierreTotales.formattedTotalNeto}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Movimientos del Período
              </h3>
              {/* Indicador de filtro automático para cierres diarios */}
              {esCierreDiario(cierre) && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  📅 Mostrando solo movimientos del día: {new Date(cierre?.fechaInicio || '').toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {pagination.totalRecords} registros
              </div>
              
              {/* Botones de Agregar y Filtros - Disponibles para todos los cierres */}
              <motion.button
                onClick={handleOpenCreateModal}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Agregar nuevo movimiento"
              >
                <Plus className="w-4 h-4 mr-1 inline" />
                Agregar
              </motion.button>
              <motion.button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  showFilters 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Filter className="w-4 h-4 mr-2 inline" />
                Filtros
              </motion.button>
            </div>
          </div>

          {/* Panel de filtros - Disponible para todos los cierres */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-3"
              >
                <FilterPanel 
                  filters={filters} 
                  onApply={applyFilters} 
                  onClear={clearFilters}
                  fechaInicio={cierre?.fechaInicio}
                  fechaFin={cierre?.fechaFin}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Indicadores de filtros aplicados */}
          {(
            // Para cierres diarios: mostrar siempre el filtro automático de fecha
            esCierreDiario(cierre) ||
            // Para cierres mensuales: mostrar si hay filtros aplicados
            (!esCierreDiario(cierre) && (filters.correlativoDocumento || filters.fechaVenta || filters.esEgreso !== null && filters.esEgreso !== undefined))
          ) && (
            <div className="mb-3 flex flex-wrap gap-2">
              {/* Indicador automático para cierres diarios */}
              {esCierreDiario(cierre) && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700 border border-yellow-300">
                  📅 Filtro automático: {new Date(cierre?.fechaInicio || '').toLocaleDateString()}
                </span>
              )}
              
              {/* Indicadores de filtros manuales - Disponibles para todos los cierres */}
              {filters.correlativoDocumento && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                  Correlativo: {filters.correlativoDocumento}
                </span>
              )}
              {filters.fechaVenta && !esCierreDiario(cierre) && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                  Fecha: {new Date(filters.fechaVenta).toLocaleDateString()}
                </span>
              )}
              {filters.esEgreso === false && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                  💰 Solo Ingresos
                </span>
              )}
              {filters.esEgreso === true && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
                  💸 Solo Egresos
                </span>
              )}
            </div>
          )}

          {/* Lista de detalles */}
          <div className="space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : detalles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay movimientos registrados
              </div>
            ) : (
              detalles.map((detalle) => (
                <motion.div
                  key={detalle.idCierreCajaDetalle}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          detalle.esEgreso ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {detalle.esEgreso ? 'Egreso' : 'Ingreso'}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {detalle.nombreTipoDocumento}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          : {detalle.correlativoDocumento}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Monto:</span>
                          <div className={`font-medium ${detalle.esEgreso ? 'text-red-600' : 'text-green-600'}`}>
                            {detalle.formattedMonto}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Fecha:</span>
                          <div className="font-medium">{detalle.formattedFecha}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Concepto:</span>
                          <div className="font-medium">{detalle.concepto || detalle.categoria || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Operación:</span>
                          <div className="font-medium">{detalle.tipoOperacion}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1 ml-2">
                      {/* Botón de descarga si hay URL */}
                      {detalle.urlEnvio && (
                        <button
                          onClick={() => window.open(detalle.urlEnvio, '_blank')}
                          className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="Descargar documento"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Botones de editar y eliminar - Disponibles para todos los cierres */}
                      <button
                        onClick={() => handleOpenEditModal(detalle)}
                        className="p-1 text-orange-500 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                        title="Editar monto"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setDetalleToDelete(detalle);
                          setShowDeleteModal(true);
                        }}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Eliminar movimiento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <Pagination 
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal de crear/editar detalle - Disponible para todos los cierres */}
      <CashClosingDetailModal
        isOpen={showDetailModal}
        operation={detailModalOperation}
        idCierreCaja={cierre?.idCierreCaja || 0}
        detalle={selectedDetalle}
        fechaInicio={cierre?.fechaInicio}
        fechaFin={cierre?.fechaFin}
        onClose={handleCloseDetailModal}
        onSuccess={handleDetailModalSuccess}
      />

      {/* Modal de confirmación de eliminación - Disponible para todos los cierres */}
      {showDeleteModal && detalleToDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-red-600 text-white p-4">
              <div className="flex items-center gap-3">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-lg font-bold">Confirmar Eliminación</h3>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                ¿Está seguro que desea eliminar este movimiento?
              </p>
              
              {/* Información del detalle */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Tipo:</span>
                    <div className={`font-medium ${detalleToDelete.esEgreso ? 'text-red-600' : 'text-green-600'}`}>
                      {detalleToDelete.esEgreso ? '💸 Egreso' : '💰 Ingreso'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Monto:</span>
                    <div className="font-medium">{detalleToDelete.formattedMonto}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Correlativo:</span>
                    <div className="font-medium">{detalleToDelete.correlativoDocumento}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Fecha:</span>
                    <div className="font-medium">{detalleToDelete.formattedFecha}</div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-6">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  ⚠️ <strong>Advertencia:</strong> Esta acción no se puede deshacer.
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDetalleToDelete(undefined);
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteDetail(detalleToDelete)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Componente de filtros independiente
interface FilterPanelProps {
  filters: DetalleFiltersState;
  onApply: (filters: DetalleFiltersState) => void;
  onClear: () => void;
  fechaInicio?: string;
  fechaFin?: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onApply, onClear, fechaInicio, fechaFin }) => {
  const [localFilters, setLocalFilters] = useState<DetalleFiltersState>(filters);

  // Sincronizar con los props cuando cambien
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Formatear fecha para input date
  const formatDateForInput = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  // Manejar cambio de correlativo
  const handleCorrelativoChange = (value: string) => {
    const newFilters = { ...localFilters, correlativoDocumento: value };
    console.log('🟢 Correlativo cambio:', newFilters); // DEBUG
    setLocalFilters(newFilters);
  };

  // Manejar cambio de fecha
  const handleDateChange = (value: string) => {
    const newFilters = {
      ...localFilters,
      fechaVenta: value ? `${value}T00:00:00` : undefined
    };
    console.log('🟢 Fecha cambio:', newFilters); // DEBUG
    setLocalFilters(newFilters);
  };

  // Manejar cambio de radio button - CORREGIDO
  const handleEsEgresoChange = (value: boolean | null) => {
    console.log('🟢 Radio cambio:', value); // DEBUG
    const newFilters = { ...localFilters, esEgreso: value };
    console.log('🟢 Nuevos filtros locales:', newFilters); // DEBUG
    setLocalFilters(newFilters);
  };

  // Aplicar filtros
  const handleApply = () => {
    console.log('🟢 Aplicando filtros desde panel:', localFilters); // DEBUG
    onApply(localFilters);
  };

  // Limpiar filtros
  const handleClear = () => {
    const emptyFilters = {};
    setLocalFilters(emptyFilters);
    onClear();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Correlativo Documento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Correlativo Documento
          </label>
          <input
            type="text"
            value={localFilters.correlativoDocumento || ''}
            onChange={(e) => handleCorrelativoChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Buscar por correlativo..."
          />
        </div>

        {/* Fecha de Venta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fecha de Venta
          </label>
          <input
            type="date"
            value={formatDateForInput(localFilters.fechaVenta)}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            min={fechaInicio ? fechaInicio.split('T')[0] : undefined}
            max={fechaFin ? fechaFin.split('T')[0] : undefined}
          />
          {fechaInicio && fechaFin && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Período válido: {new Date(fechaInicio).toLocaleDateString()} - {new Date(fechaFin).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Tipo de Movimiento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo de Movimiento
          </label>
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="esEgresoRadio"
                checked={localFilters.esEgreso === null || localFilters.esEgreso === undefined}
                onChange={() => handleEsEgresoChange(null)}
                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 font-medium">Todos los movimientos</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="esEgresoRadio"
                checked={localFilters.esEgreso === false}
                onChange={() => handleEsEgresoChange(false)}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-green-700 dark:text-green-400 font-medium">💰 Solo Ingresos</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="esEgresoRadio"
                checked={localFilters.esEgreso === true}
                onChange={() => handleEsEgresoChange(true)}
                className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
              />
              <span className="ml-2 text-sm text-red-700 dark:text-red-400 font-medium">💸 Solo Egresos</span>
            </label>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-600">
        <button
          onClick={handleClear}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Limpiar
        </button>
        <button
          onClick={handleApply}
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
            className={`px-3 py-1 rounded-lg text-sm ${
              page === currentPage
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

export default DetalleModal; 