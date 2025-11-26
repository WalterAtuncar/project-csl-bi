import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, Eye, Plus, PlusCircle, MinusCircle,
  ChevronLeft, ChevronRight, Lock
} from 'lucide-react';
import { 
  CajaService,
  GetCajaMayorListRequest,
  CajaMayorListResponse,
  CajaMayorDetalleResponse,
  CerrarCajaMayorRequest,
  CreateIngresoMensualRequest,
  CreateEgresoMensualRequest,
  TipoCajaResponse,
  TipoIngresoMensualResponse,
  TipoEgresoMensualResponse
} from '../../services';
import ToastAlerts from '../../components/UI/ToastAlerts';
import { CierreCajaGrid } from '../../components/CierresCaja';

// Servicio de Caja
const cajaService = CajaService.getInstance();

interface FilterState {
  anio?: number;
  mes?: number;
  idTipoCaja?: number;
  estadoCierre?: number;
}

interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

interface IngresoEgresoForm {
  idCajaMayor: number;
  idTipoIngresoMensual?: number;
  idTipoEgresoMensual?: number;
  concepto: string;
  fecha: string;
  monto: number;
  numeroDocumento?: string;
  origen?: string;
  beneficiario?: string;
  observaciones?: string;
}

const CajaMayor: React.FC = () => {
  // Estados principales
  const [cajas, setCajas] = useState<CajaMayorListResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogosLoaded, setCatalogosLoaded] = useState(false);
  
  // Estados de filtros y paginación
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState<FilterState>({
    anio: currentYear,
    idTipoCaja: 1
  });
  
  // Estados para tipos de caja (catálogos)
  const [tiposCaja, setTiposCaja] = useState<TipoCajaResponse[]>([]);
  const [tiposIngreso, setTiposIngreso] = useState<TipoIngresoMensualResponse[]>([]);
  const [tiposEgreso, setTiposEgreso] = useState<TipoEgresoMensualResponse[]>([]);
  
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    totalPages: 0,
    totalRecords: 0
  });
  
  // Estados del modal de detalle
  const [selectedCaja, setSelectedCaja] = useState<CajaMayorListResponse | null>(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [detalleData, setDetalleData] = useState<CajaMayorDetalleResponse | null>(null);
  
  // Estados de formularios
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados del modal de ingreso/egreso
  const [showIngresoModal, setShowIngresoModal] = useState(false);
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [showCierreGrid, setShowCierreGrid] = useState(false);
  const [ingresoEgresoForm, setIngresoEgresoForm] = useState<IngresoEgresoForm>({
    idCajaMayor: 0,
    concepto: '',
    fecha: new Date().toISOString().split('T')[0],
    monto: 0
  });
  const [ingresoEgresoLoading, setIngresoEgresoLoading] = useState(false);

  // Definir meses para usar en el header y filtros
  const months = React.useMemo(() => [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ], []);

  // Cargar catálogos (tipos de caja, ingreso, egreso)
  const loadCatalogos = useCallback(async () => {
    try {
      const [tiposCajaResponse, tiposIngresoResponse, tiposEgresoResponse] = await Promise.all([
        cajaService.getTiposCaja(),
        cajaService.getTiposIngresoMensual(),
        cajaService.getTiposEgresoMensual()
      ]);

      setTiposCaja(tiposCajaResponse.objModel || []);
      setTiposIngreso(tiposIngresoResponse.objModel || []);
      setTiposEgreso(tiposEgresoResponse.objModel || []);

      // Establecer el primer tipo de caja como default si no hay uno seleccionado
      if (tiposCajaResponse.objModel && tiposCajaResponse.objModel.length > 0) {
        setFilters(prev => ({
          ...prev,
          idTipoCaja: prev.idTipoCaja || tiposCajaResponse.objModel[0].idTipoCaja
        }));
      }

      // Marcar que los catálogos están listos
      setCatalogosLoaded(true);
    } catch {
      ToastAlerts.error({
        title: "Error al cargar catálogos",
        message: "No se pudieron cargar los tipos de caja, ingreso y egreso",
        action: {
          label: "Reintentar",
          onClick: () => loadCatalogos()
        }
      });
    }
  }, []); // Solo ejecutar una vez al montar el componente

  // Cargar cajas mayor
  const loadCajas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Validar que el año esté presente (es obligatorio)
      if (!filters.anio) {
        setError('El año es obligatorio para consultar las cajas mayor');
        ToastAlerts.warning({
          title: "Filtro requerido",
          message: "El año es obligatorio para consultar las cajas mayor"
        });
        return;
      }

      const request: GetCajaMayorListRequest = {
        idTipoCaja: filters.idTipoCaja,
        anio: filters.anio.toString(),
        mes: filters.mes?.toString(),
        estadoCierre: filters.estadoCierre,
        pageNumber: pagination.page,
        pageSize: pagination.pageSize
      };

      const response = await cajaService.getCajaMayorList(request);
      
      const cajasData = response.objModel || [];
      setCajas(cajasData);
      
      // Calcular paginación basada en los datos obtenidos
      const totalRecords = cajasData.length > 0 ? cajasData[0].totalRecords : 0;
      const totalPages = Math.ceil(totalRecords / pagination.pageSize);
      
      setPagination(prev => ({
        ...prev,
        totalPages,
        totalRecords
      }));

      // Mostrar información sobre los resultados
      const selectedTipoCaja = tiposCaja.find(tipo => tipo.idTipoCaja === filters.idTipoCaja);
      const tipoCajaLabel = selectedTipoCaja?.nombreTipoCaja || 'Sin especificar';
      
      if (cajasData.length === 0) {
        ToastAlerts.info({
          message: `No se encontraron cajas mayor (${tipoCajaLabel}) para ${filters.anio}${filters.mes ? ` - ${months.find(m => m.value === filters.mes)?.label}` : ''}`,
          duration: 3000
        });
      } else if (pagination.page === 1) {
        ToastAlerts.info({
          message: `Se encontraron ${totalRecords} caja(s) mayor (${tipoCajaLabel})`,
          duration: 2000
        });
      }
    } catch {
      setError('Error al cargar las cajas mayor');
      ToastAlerts.error({
        title: "Error de conexión",
        message: "No se pudieron cargar las cajas mayor. Verifique su conexión a internet.",
        action: {
          label: "Reintentar",
          onClick: () => loadCajas()
        }
      });
    } finally {
      setLoading(false);
    }
  }, [filters.anio, filters.idTipoCaja, filters.mes, filters.estadoCierre, pagination.page, pagination.pageSize, months, tiposCaja]);

  // Cargar datos iniciales
  useEffect(() => {
    loadCatalogos();
  }, [loadCatalogos]);

  // Efecto para cargar cajas cuando cambien los filtros principales
  useEffect(() => {
    if (catalogosLoaded && filters.anio && filters.idTipoCaja) {
      loadCajas();
    }
  }, [catalogosLoaded, filters.idTipoCaja, filters.anio, filters.mes, loadCajas]);

  // Efecto separado para paginación
  useEffect(() => {
    if (catalogosLoaded && filters.anio && filters.idTipoCaja) {
      loadCajas();
    }
  }, [catalogosLoaded, filters.anio, filters.idTipoCaja, pagination.page, pagination.pageSize, loadCajas]);

  // Abrir modal de detalle
  const openDetalleModal = async (caja: CajaMayorListResponse) => {
    try {
      setSelectedCaja(caja);
    setShowDetalleModal(true);
      
      // Cargar el detalle de la caja
      const loadingId = ToastAlerts.loading("Cargando detalle de la caja...");
      const response = await cajaService.getCajaMayorDetalle(caja.idCajaMayor);
      setDetalleData(response.objModel);
      ToastAlerts.dismiss(loadingId);
    } catch {
      ToastAlerts.error({
        title: "Error al cargar detalle",
        message: "No se pudo cargar el detalle de la caja mayor",
        action: {
          label: "Reintentar",
          onClick: () => openDetalleModal(caja)
        }
      });
    }
  };

  // Cerrar modal de detalle
  const closeDetalleModal = () => {
    setSelectedCaja(null);
    setDetalleData(null);
    setShowDetalleModal(false);
  };

  // Abrir modal de ingreso
  const openIngresoModal = (caja: CajaMayorListResponse) => {
    setIngresoEgresoForm({
      idCajaMayor: caja.idCajaMayor,
      concepto: '',
      fecha: new Date().toISOString().split('T')[0],
      monto: 0,
      idTipoIngresoMensual: tiposIngreso.length > 0 ? tiposIngreso[0].idTipoIngresoMensual : undefined,
      numeroDocumento: '',
      origen: '',
      observaciones: ''
    });
    setShowIngresoModal(true);
  };

  // Abrir modal de egreso
  const openEgresoModal = (caja: CajaMayorListResponse) => {
    setIngresoEgresoForm({
      idCajaMayor: caja.idCajaMayor,
      concepto: '',
      fecha: new Date().toISOString().split('T')[0],
      monto: 0,
      idTipoEgresoMensual: tiposEgreso.length > 0 ? tiposEgreso[0].idTipoEgresoMensual : undefined,
      numeroDocumento: '',
      beneficiario: '',
      observaciones: ''
    });
    setShowEgresoModal(true);
  };

  // Crear ingreso mensual
  const handleCreateIngreso = async () => {
    try {
      setIngresoEgresoLoading(true);
      
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const usuarioId = userData.systemUserId;
      
      if (!usuarioId) {
        ToastAlerts.error({
          title: "Error de autenticación",
          message: "No se pudo obtener el usuario actual"
        });
        return;
      }

      const request: CreateIngresoMensualRequest = {
        idCajaMayor: ingresoEgresoForm.idCajaMayor,
        idTipoIngresoMensual: ingresoEgresoForm.idTipoIngresoMensual!,
        conceptoIngreso: ingresoEgresoForm.concepto,
        fechaIngreso: ingresoEgresoForm.fecha,
        montoIngreso: ingresoEgresoForm.monto,
        numeroDocumento: ingresoEgresoForm.numeroDocumento,
        origen: ingresoEgresoForm.origen,
        observaciones: ingresoEgresoForm.observaciones,
        insertaIdUsuario: usuarioId
      };

      const loadingId = ToastAlerts.loading("Creando ingreso...");
      await cajaService.createIngresoMensual(request);
      
      ToastAlerts.promiseToSuccess(loadingId, {
        title: "¡Ingreso creado exitosamente!",
        message: `Se registró el ingreso de ${ingresoEgresoForm.monto.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}`
      });
      
      setShowIngresoModal(false);
      loadCajas(); // Recargar la lista
      
    } catch {
      ToastAlerts.error({
        title: "Error al crear ingreso",
        message: "No se pudo registrar el ingreso mensual"
      });
    } finally {
      setIngresoEgresoLoading(false);
    }
  };

  // Crear egreso mensual
  const handleCreateEgreso = async () => {
    try {
      setIngresoEgresoLoading(true);
      
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const usuarioId = userData.systemUserId;
      
      if (!usuarioId) {
        ToastAlerts.error({
          title: "Error de autenticación",
          message: "No se pudo obtener el usuario actual"
        });
        return;
      }

      const request: CreateEgresoMensualRequest = {
        idCajaMayor: ingresoEgresoForm.idCajaMayor,
        idTipoEgresoMensual: ingresoEgresoForm.idTipoEgresoMensual!,
        conceptoEgreso: ingresoEgresoForm.concepto,
        fechaEgreso: ingresoEgresoForm.fecha,
        montoEgreso: ingresoEgresoForm.monto,
        numeroDocumento: ingresoEgresoForm.numeroDocumento,
        beneficiario: ingresoEgresoForm.beneficiario,
        observaciones: ingresoEgresoForm.observaciones,
        insertaIdUsuario: usuarioId
      };

      const loadingId = ToastAlerts.loading("Creando egreso...");
      await cajaService.createEgresoMensual(request);
      
      ToastAlerts.promiseToSuccess(loadingId, {
        title: "¡Egreso creado exitosamente!",
        message: `Se registró el egreso de ${ingresoEgresoForm.monto.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}`
      });
      
      setShowEgresoModal(false);
      loadCajas(); // Recargar la lista
      
    } catch {
      ToastAlerts.error({
        title: "Error al crear egreso",
        message: "No se pudo registrar el egreso mensual"
      });
    } finally {
      setIngresoEgresoLoading(false);
    }
  };

  // Cerrar caja mayor
  const handleCerrarCaja = async (caja: CajaMayorListResponse) => {
    try {
      // Verificar que la caja no esté ya cerrada
      if (caja.estadoCierre === 2) {
        ToastAlerts.warning({
          title: "Acción no permitida",
          message: "Esta caja ya se encuentra cerrada"
        });
        return;
      }

      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const usuarioId = userData.systemUserId;
      
      if (!usuarioId) {
        ToastAlerts.error({
          title: "Error de autenticación",
          message: "No se pudo obtener el usuario actual"
        });
        return;
      }

      const request: CerrarCajaMayorRequest = {
        idCajaMayor: caja.idCajaMayor,
        observacionesCierre: '',
        usuarioIdCierre: usuarioId
      };

      const loadingId = ToastAlerts.loading("Cerrando caja...");
      await cajaService.cerrarCajaMayor(request);
      
      ToastAlerts.promiseToSuccess(loadingId, {
        title: "¡Caja cerrada exitosamente!",
        message: `La caja mayor de ${caja.periodo} se cerró correctamente`
      });
      
      loadCajas(); // Recargar la lista
      
    } catch {
      ToastAlerts.error({
        title: "Error al cerrar caja",
        message: "No se pudo cerrar la caja mayor"
      });
    }
  };

  // Aplicar filtros
  const applyFilters = (newFilters: FilterState) => {
    const filtersWithDefaults = {
      ...newFilters,
      anio: newFilters.anio || currentYear,
      idTipoCaja: newFilters.idTipoCaja || (tiposCaja.length > 0 ? tiposCaja[0].idTipoCaja : 1)
    };
    setFilters(filtersWithDefaults);
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFilters(false);
  };

  // Limpiar filtros
  const clearFilters = () => {
            setFilters({ 
      anio: currentYear, 
      idTipoCaja: tiposCaja.length > 0 ? tiposCaja[0].idTipoCaja : 1
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFilters(false);
  };

  // Cambiar página
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Obtener color de estado
  const getEstadoColor = (estadoCierre: number) => {
    switch (estadoCierre) {
      case 1: return 'text-green-600 bg-green-100';
      case 2: return 'text-yellow-600 bg-yellow-100';
      case 3: return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Caja Mayor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestión y control de cajas mayor mensuales
            {filters.anio && (
              <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm font-medium">
                {tiposCaja.find(tipo => tipo.idTipoCaja === filters.idTipoCaja)?.nombreTipoCaja || 'Sin especificar'} - Año {filters.anio}
                {filters.mes && ` - ${months.find(m => m.value === filters.mes)?.label}`}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-2">
          <motion.button
            onClick={() => setShowCierreGrid(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            Crear nueva caja mayor
          </motion.button>
          
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters 
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
              onApply={applyFilters}
              onClear={clearFilters}
              months={months}
              tiposCaja={tiposCaja}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid de cajas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header de la tabla */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Cajas Mayor - {tiposCaja.find(tipo => tipo.idTipoCaja === filters.idTipoCaja)?.nombreTipoCaja || 'Sin especificar'}
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
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fecha Rango
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Saldo Inicial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ingresos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Egresos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Saldo Final
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
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : cajas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                cajas.map((caja) => (
                  <motion.tr
                    key={caja.idCajaMayor}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {caja.periodo}
                      </div>
                      <div className="text-sm text-gray-500">
                        {caja.mes}/{caja.anio}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Inicio: {new Date(caja.fechaInicio).toLocaleDateString()}</div>
                      <div>Fin: {new Date(caja.fechaFin).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600">
                        {caja.saldoInicialMes.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {caja.totalIngresos.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-red-600">
                        {caja.totalEgresos.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${caja.saldoFinalMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {caja.saldoFinalMes.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(caja.estadoCierre)}`}>
                        {caja.estadoCierreDescripcion}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {/* Ver detalle */}
                            <motion.button
                          onClick={() => openDetalleModal(caja)}
                              className="text-primary hover:text-primary-dark"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                          title="Ver detalle"
                            >
                          <Eye className="w-4 h-4" />
                            </motion.button>
                            
                        {/* Agregar ingreso */}
                            <motion.button
                          onClick={() => openIngresoModal(caja)}
                          disabled={caja.estadoCierre === 2}
                          className={`transition-colors ${
                            caja.estadoCierre === 2 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-green-600 hover:text-green-800'
                          }`}
                          whileHover={caja.estadoCierre === 2 ? {} : { scale: 1.1 }}
                          whileTap={caja.estadoCierre === 2 ? {} : { scale: 0.95 }}
                          title={caja.estadoCierre === 2 ? 'Caja cerrada' : 'Agregar ingreso'}
                        >
                          <PlusCircle className="w-4 h-4" />
                            </motion.button>
                        
                        {/* Agregar egreso */}
                            <motion.button
                          onClick={() => openEgresoModal(caja)}
                          disabled={caja.estadoCierre === 2}
                          className={`transition-colors ${
                            caja.estadoCierre === 2 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-red-600 hover:text-red-800'
                          }`}
                          whileHover={caja.estadoCierre === 2 ? {} : { scale: 1.1 }}
                          whileTap={caja.estadoCierre === 2 ? {} : { scale: 0.95 }}
                          title={caja.estadoCierre === 2 ? 'Caja cerrada' : 'Agregar egreso'}
                        >
                          <MinusCircle className="w-4 h-4" />
                            </motion.button>
                            
                        {/* Cerrar caja */}
                            <motion.button
                          onClick={() => handleCerrarCaja(caja)}
                          disabled={caja.estadoCierre === 2}
                              className={`transition-colors ${
                            caja.estadoCierre === 2 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-orange-600 hover:text-orange-800'
                              }`}
                          whileHover={caja.estadoCierre === 2 ? {} : { scale: 1.1 }}
                          whileTap={caja.estadoCierre === 2 ? {} : { scale: 0.95 }}
                          title={caja.estadoCierre === 2 ? 'Caja ya cerrada' : 'Cerrar caja'}
                            >
                              <Lock className="w-4 h-4" />
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

      {/* Modal de detalle */}
      <AnimatePresence>
        {showDetalleModal && selectedCaja && (
      <DetalleModal
            caja={selectedCaja}
            detalleData={detalleData}
        onClose={closeDetalleModal}
      />
        )}
      </AnimatePresence>

      {/* Modal de ingreso */}
      <AnimatePresence>
        {showIngresoModal && (
          <IngresoEgresoModal
            tipo="ingreso"
            form={ingresoEgresoForm}
            loading={ingresoEgresoLoading}
            tiposIngreso={tiposIngreso}
            tiposEgreso={tiposEgreso}
            onClose={() => setShowIngresoModal(false)}
            onFormChange={setIngresoEgresoForm}
            onSubmit={handleCreateIngreso}
          />
        )}
      </AnimatePresence>

      {/* Modal de egreso */}
      <AnimatePresence>
        {showEgresoModal && (
          <IngresoEgresoModal
            tipo="egreso"
            form={ingresoEgresoForm}
            loading={ingresoEgresoLoading}
            tiposIngreso={tiposIngreso}
            tiposEgreso={tiposEgreso}
            onClose={() => setShowEgresoModal(false)}
            onFormChange={setIngresoEgresoForm}
            onSubmit={handleCreateEgreso}
          />
        )}
      </AnimatePresence>

      {/* Modal de Grid de Cierre de Caja */}
      <AnimatePresence>
        {showCierreGrid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCierreGrid(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-full flex flex-col">
                {/* Header del modal */}
                <div className="p-6 bg-primary text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Generar Cierre de Caja Mensual
                      </h2>
                      <p className="text-white/80 mt-1">
                        Gestionar resumen de cierre para cajas mensuales
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCierreGrid(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Contenido del modal con scroll */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  <CierreCajaGrid onCierreExitoso={() => setShowCierreGrid(false)} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Componente de filtros
interface FilterPanelProps {
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  onClear: () => void;
  months: { value: number; label: string }[];
  tiposCaja: TipoCajaResponse[];
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onApply, onClear, months, tiposCaja }) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 + 1 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Año <span className="text-red-500">*</span>
          </label>
          <select
            value={localFilters.anio || currentYear}
            onChange={(e) => setLocalFilters({ 
              ...localFilters, 
              anio: Number(e.target.value) 
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Mes
          </label>
          <select
            value={localFilters.mes || ''}
            onChange={(e) => setLocalFilters({ 
              ...localFilters, 
              mes: e.target.value ? Number(e.target.value) : undefined 
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Todos los meses</option>
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo de Caja <span className="text-red-500">*</span>
          </label>
          <select
            value={localFilters.idTipoCaja || ''}
            onChange={(e) => setLocalFilters({ 
              ...localFilters, 
              idTipoCaja: Number(e.target.value) 
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          >
            {tiposCaja.map(tipo => (
              <option key={tipo.idTipoCaja} value={tipo.idTipoCaja}>{tipo.nombreTipoCaja}</option>
            ))}
          </select>
      </div>

      <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estado
        </label>
          <select
            value={localFilters.estadoCierre || ''}
                onChange={(e) => setLocalFilters({ 
                  ...localFilters, 
              estadoCierre: e.target.value ? Number(e.target.value) : undefined
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value={1}>Abierta</option>
            <option value={2}>Cerrada</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onClear}
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
            key={`page-btn-${page}-${index}`}
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

// Modal de detalle de caja mayor
interface DetalleModalProps {
  caja: CajaMayorListResponse;
  detalleData: CajaMayorDetalleResponse | null;
  onClose: () => void;
}

const DetalleModal: React.FC<DetalleModalProps> = ({ caja, detalleData, onClose }) => {
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
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="p-6 bg-primary text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white">
                Detalle de Caja Mayor
              </h2>
              <p className="text-white/80 mt-1">
                {caja.periodo} - {caja.mes}/{caja.anio}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido del modal */}
                <div className="p-6 overflow-y-auto">
          {/* Información General Compacta */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Información General
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Período</label>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{caja.periodo}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</label>
                <div className="mt-2">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    caja.estadoCierre === 1 ? 'text-green-700 bg-green-100' :
                    caja.estadoCierre === 2 ? 'text-yellow-700 bg-yellow-100' :
                    'text-gray-700 bg-gray-100'
                  }`}>
                    {caja.estadoCierreDescripcion}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Mes/Año</label>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{caja.mes}/{caja.anio}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Fechas</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(caja.fechaInicio).toLocaleDateString('es-PE')} - {new Date(caja.fechaFin).toLocaleDateString('es-PE')}
                </p>
              </div>
            </div>
          </div>

          {/* Resumen Financiero en Grid */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resumen Financiero
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-blue-700 dark:text-blue-300">Saldo Inicial</label>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      S/ {caja.saldoInicialMes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-blue-200 dark:bg-blue-700 p-2 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-green-700 dark:text-green-300">Total Ingresos</label>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      S/ {caja.totalIngresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-green-200 dark:bg-green-700 p-2 rounded-lg">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-red-700 dark:text-red-300">Total Egresos</label>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      S/ {caja.totalEgresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-red-200 dark:bg-red-700 p-2 rounded-lg">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className={`bg-gradient-to-br p-4 rounded-lg border ${
                caja.saldoFinalMes >= 0 
                  ? 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700' 
                  : 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <label className={`text-sm font-medium ${
                      caja.saldoFinalMes >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                    }`}>
                      Saldo Final
                    </label>
                    <p className={`text-xl font-bold ${
                      caja.saldoFinalMes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      S/ {caja.saldoFinalMes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${
                    caja.saldoFinalMes >= 0 ? 'bg-emerald-200 dark:bg-emerald-700' : 'bg-red-200 dark:bg-red-700'
                  }`}>
                    <svg className={`w-6 h-6 ${
                      caja.saldoFinalMes >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {caja.saldoFinalMes >= 0 ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      )}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Movimientos si hay datos de detalle */}
          {detalleData && detalleData.movimientos && detalleData.movimientos.length > 0 && (
            <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Movimientos ({detalleData.movimientos.length})
                  </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {detalleData.movimientos.map((movimiento) => (
                    <div key={movimiento.idCajaMayorDetalle} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {movimiento.conceptoMovimiento}
                        </p>
                        <p className="text-xs text-gray-500">
                          {movimiento.tipoMovimientoDescripcion} - {new Date(movimiento.fechaMovimiento).toLocaleDateString()}
                    </p>
                  </div>
                      <div className={`text-sm font-bold ${
                        movimiento.tipoMovimiento === 'I' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movimiento.tipoMovimiento === 'I' ? '+' : '-'}
                        {movimiento.total.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                </div>
            </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Cerrar
            </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Modal de ingreso/egreso
interface IngresoEgresoModalProps {
  tipo: 'ingreso' | 'egreso';
  form: IngresoEgresoForm;
  loading: boolean;
  tiposIngreso: TipoIngresoMensualResponse[];
  tiposEgreso: TipoEgresoMensualResponse[];
  onClose: () => void;
  onFormChange: (form: IngresoEgresoForm) => void;
  onSubmit: () => void;
}

const IngresoEgresoModal: React.FC<IngresoEgresoModalProps> = ({
  tipo,
  form,
  loading,
  tiposIngreso,
  tiposEgreso,
  onClose,
  onFormChange,
  onSubmit
}) => {
  const isIngreso = tipo === 'ingreso';
  const tipos = isIngreso ? tiposIngreso : tiposEgreso;

  const isFormValid = form.concepto.trim() !== '' && 
                     form.monto > 0 && 
                     form.fecha !== '' &&
                     (isIngreso ? form.idTipoIngresoMensual : form.idTipoEgresoMensual);

  const handleSubmit = () => {
    if (!isFormValid) {
      ToastAlerts.warning({
        title: "Campos incompletos",
        message: "Por favor complete todos los campos obligatorios"
      });
      return;
    }
    onSubmit();
  };

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
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className={`p-6 ${isIngreso ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white">
                {isIngreso ? 'Registrar Ingreso' : 'Registrar Egreso'}
              </h2>
              <p className="text-white/80 mt-1">
                {isIngreso ? 'Agregar un nuevo ingreso mensual' : 'Agregar un nuevo egreso mensual'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              disabled={loading}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de {isIngreso ? 'Ingreso' : 'Egreso'} <span className="text-red-500">*</span>
              </label>
              <select
                value={isIngreso ? form.idTipoIngresoMensual || '' : form.idTipoEgresoMensual || ''}
                onChange={(e) => onFormChange({ 
                  ...form, 
                  ...(isIngreso 
                    ? { idTipoIngresoMensual: Number(e.target.value) }
                    : { idTipoEgresoMensual: Number(e.target.value) }
                  )
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                required
                disabled={loading}
              >
                <option value="">Seleccionar tipo</option>
                {tipos.map(tipo => (
                  <option key={isIngreso 
                    ? (tipo as TipoIngresoMensualResponse).idTipoIngresoMensual 
                    : (tipo as TipoEgresoMensualResponse).idTipoEgresoMensual} 
                          value={isIngreso 
                            ? (tipo as TipoIngresoMensualResponse).idTipoIngresoMensual 
                            : (tipo as TipoEgresoMensualResponse).idTipoEgresoMensual}>
                    {isIngreso 
                      ? (tipo as TipoIngresoMensualResponse).nombreTipoIngreso 
                      : (tipo as TipoEgresoMensualResponse).nombreTipoEgreso}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Concepto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.concepto}
                onChange={(e) => onFormChange({ ...form, concepto: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={`Descripción del ${isIngreso ? 'ingreso' : 'egreso'}`}
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                  value={form.fecha}
                  onChange={(e) => onFormChange({ ...form, fecha: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monto <span className="text-red-500">*</span>
              </label>
                    <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monto}
                  onChange={(e) => onFormChange({ ...form, monto: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                  required
                      disabled={loading}
                />
                      </div>
                    </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Número de Documento
                  </label>
              <input
                type="text"
                value={form.numeroDocumento || ''}
                onChange={(e) => onFormChange({ ...form, numeroDocumento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Número de documento relacionado"
                disabled={loading}
              />
              </div>

            {isIngreso ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Origen
                </label>
                <input
                  type="text"
                  value={form.origen || ''}
                  onChange={(e) => onFormChange({ ...form, origen: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Origen del ingreso"
                  disabled={loading}
                />
            </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Beneficiario
                </label>
                <input
                  type="text"
                  value={form.beneficiario || ''}
                  onChange={(e) => onFormChange({ ...form, beneficiario: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Beneficiario del egreso"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Observaciones
              </label>
              <textarea
                value={form.observaciones || ''}
                onChange={(e) => onFormChange({ ...form, observaciones: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="Observaciones adicionales"
                disabled={loading}
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                isFormValid && !loading
                  ? `${isIngreso ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isIngreso ? 'Registrando...' : 'Registrando...'}
                </span>
              ) : (
                `Registrar ${isIngreso ? 'Ingreso' : 'Egreso'}`
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CajaMayor; 