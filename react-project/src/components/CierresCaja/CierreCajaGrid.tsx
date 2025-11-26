import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, Search, RefreshCw, Download, Calendar,
  ChevronLeft, ChevronRight, FileText, TrendingUp, Save
} from 'lucide-react';
import { 
  CajaService,
  DatosCierreCajaResponse,
  TipoCajaResponse
} from '../../services';
import { CreateCajaMayorRequest, CajaMayorDetalleRequest } from '../../@types/caja';
import { GerenciaVentasDetalleResponse } from '../../@types/facturacion';
import ToastAlerts from '../UI/ToastAlerts';

// Servicio de Caja
const cajaService = CajaService.getInstance();

interface CierreCajaState {
  idTipoCaja: number;
  anio: string;
  mes: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

interface CierreCajaGridProps {
  onCierreExitoso?: () => void; // Callback cuando se genera exitosamente un cierre
}

const CierreCajaGrid: React.FC<CierreCajaGridProps> = ({ onCierreExitoso }) => {
  // Estados principales
  const [datosGrid, setDatosGrid] = useState<DatosCierreCajaResponse | null>(null);
  const [tiposCaja, setTiposCaja] = useState<TipoCajaResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado de filtros
  const [filtros, setFiltros] = useState<CierreCajaState>({
    idTipoCaja: 1,
    anio: new Date().getFullYear().toString(),
    mes: (new Date().getMonth() + 1).toString().padStart(2, '0')
  });

  // Estado de paginación
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    totalPages: 1,
    totalRecords: 0
  });

  // Estados de modales y UI
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerarCierreModal, setShowGenerarCierreModal] = useState(false);
  
  // Estado para datos del cierre
  const [datosCierre, setDatosCierre] = useState({
    saldoInicialMes: 0,
    observacionesCierre: ''
  });

  // Meses disponibles
  const meses = useMemo(() => [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ], []);

  // Años disponibles (últimos 5 años + 2 años futuros)
  const anios = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 2; i++) {
      years.push({ value: i.toString(), label: i.toString() });
    }
    return years;
  }, []);

  // Cargar tipos de caja
  const loadTiposCaja = useCallback(async () => {
    try {
      const response = await cajaService.getTiposCaja({ includeInactive: false });
      if (response?.objModel) {
        setTiposCaja(response.objModel);
      }
    } catch (error) {
      console.error('Error cargando tipos de caja:', error);
      ToastAlerts.error('Error al cargar tipos de caja');
    }
  }, []);

  // Cargar datos del cierre de caja
  const loadDatosCierre = useCallback(async () => {
    if (!filtros.idTipoCaja || !filtros.anio || !filtros.mes) return;

    setLoading(true);
    setError(null);

    try {
      const datos = await cajaService.prepararDatosCierreCaja(
        filtros.idTipoCaja,
        filtros.anio,
        filtros.mes
      );

      setDatosGrid(datos);
      
      // Actualizar paginación
      setPagination(prev => ({
        ...prev,
        totalRecords: datos.datos.length,
        totalPages: Math.ceil(datos.datos.length / prev.pageSize)
      }));

      ToastAlerts.success(`Datos cargados: ${datos.resumen.totalRegistros} registros encontrados`);
    } catch (error) {
      console.error('Error cargando datos de cierre:', error);
      setError('Error al cargar los datos del cierre de caja');
      ToastAlerts.error('Error al cargar los datos del cierre de caja');
    } finally {
      setLoading(false);
    }
  }, [filtros.idTipoCaja, filtros.anio, filtros.mes]);

  // Filtrar datos según término de búsqueda
  const datosFiltrados = useMemo(() => {
    if (!datosGrid?.datos || !searchTerm) return datosGrid?.datos || [];

    return datosGrid.datos.filter(item =>
      item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.venta?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.paciente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.servicio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [datosGrid?.datos, searchTerm]);

  // Estadísticas agrupadas por tipo
  const estadisticasPorTipo = useMemo(() => {
    if (!datosGrid?.datos) return { ingresos: 0, egresos: 0, totalIngresos: 0, totalEgresos: 0 };

    const ingresos = datosGrid.datos.filter(item => item.tipo !== 'EGRESO');
    const egresos = datosGrid.datos.filter(item => item.tipo === 'EGRESO');

    const totalIngresos = ingresos.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalEgresos = egresos.reduce((sum, item) => sum + (item.total || 0), 0);

    return {
      ingresos: ingresos.length,
      egresos: egresos.length,
      totalIngresos,
      totalEgresos
    };
  }, [datosGrid?.datos]);

  // Datos paginados
  const datosPaginados = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return datosFiltrados.slice(start, end);
  }, [datosFiltrados, pagination.page, pagination.pageSize]);

  // Cargar datos iniciales
  useEffect(() => {
    loadTiposCaja();
  }, [loadTiposCaja]);

  // Cargar datos solo cuando cambie el mes (no el año o tipo de caja)
  useEffect(() => {
    const cargarDatosPorMes = async () => {
      if (!filtros.idTipoCaja || !filtros.anio || !filtros.mes) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const datos = await cajaService.prepararDatosCierreCaja(
          filtros.idTipoCaja,
          filtros.anio,
          filtros.mes
        );

        setDatosGrid(datos);
        
        // Actualizar paginación
        setPagination(prev => ({
          ...prev,
          totalRecords: datos.datos.length,
          totalPages: Math.ceil(datos.datos.length / prev.pageSize)
        }));

        ToastAlerts.success(`Datos cargados: ${datos.resumen.totalRegistros} registros encontrados`);
      } catch (error) {
        console.error('Error cargando datos de cierre:', error);
        setError('Error al cargar los datos del cierre de caja');
        ToastAlerts.error('Error al cargar los datos del cierre de caja');
      } finally {
        setLoading(false);
      }
    };

    // Solo cargar datos si tenemos filtros válidos y el mes cambió
    if (filtros.mes && filtros.anio && filtros.idTipoCaja) {
      cargarDatosPorMes();
    }
  }, [filtros.mes]); // Solo depende del mes

  // Manejar cambio de filtros
  const handleFiltroChange = useCallback((key: keyof CierreCajaState, value: string | number) => {
    setFiltros(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Manejar paginación
  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);



  // Obtener información del tipo de caja seleccionado
  const tipoCajaInfo = useMemo(() => {
    return cajaService.getTipoCajaInfo(filtros.idTipoCaja);
  }, [filtros.idTipoCaja]);

  // Exportar a PDF
  const handleExportPDF = useCallback(async () => {
    if (!datosGrid?.datos || !estadisticasPorTipo) return;

    try {
      // Importar dinámicamente el ExportService
      const { ExportService } = await import('../../services/ExportService');
      
      await ExportService.exportCierreCajaToPDF(
        datosGrid,
        estadisticasPorTipo,
        tipoCajaInfo,
        filtros
      );
      
      ToastAlerts.success('Archivo PDF generado correctamente');
    } catch (error) {
      console.error('Error exportando PDF:', error);
      ToastAlerts.error('Error al generar archivo PDF');
    }
  }, [datosGrid, estadisticasPorTipo, tipoCajaInfo, filtros]);

  // Manejar la generación del cierre
  const handleGenerarCierre = useCallback(async () => {
    if (!datosGrid?.datos?.length) return;

    try {
      setLoading(true);

      // Generar rango de fechas para el mes
      const rangoFechas = cajaService.generateDateRangeForMonth(parseInt(filtros.anio), parseInt(filtros.mes));
      
      // Preparar los detalles de las transacciones usando los datos reales
      const detalles: CajaMayorDetalleRequest[] = datosGrid.datos.map((item) => ({
        idVenta: item.venta || '', // idVenta es venta
        codigoDocumento: item.servicio || '', // codigoDocumento es servicio
        numeroDocumento: item.correlativo || '', // numeroDocumento es correlativo
        serieDocumento: item.serie || '', // serieDocumento es serie
        tipoMovimiento: item.tipo === 'EGRESO' ? 'E' : 'I',
        conceptoMovimiento: item.descripcion || '', // conceptoMovimiento es descripcion
        fechaMovimiento: item.fechaEmision,
        subtotal: (item.total || 0) * 0.82, // Aproximación sin IGV
        igv: (item.total || 0) * 0.18, // IGV aproximado
        total: item.total || 0,
        observaciones: item.descripcion || `${item.tipo} - ${item.cliente} - ${item.servicio}`
      }));

      // Preparar el objeto de cierre de caja mayor
      const cierreData: CreateCajaMayorRequest = {
        idTipoCaja: filtros.idTipoCaja,
        periodo: `${filtros.anio}${filtros.mes.padStart(2, '0')}`, // YYYYMM formato de 6 caracteres
        mes: filtros.mes,
        anio: filtros.anio,
        fechaInicio: rangoFechas.fechaInicio,
        fechaFin: rangoFechas.fechaFin,
        saldoInicialMes: datosCierre.saldoInicialMes,
        totalIngresos: estadisticasPorTipo?.totalIngresos || 0,
        totalEgresos: estadisticasPorTipo?.totalEgresos || 0,
        observacionesCierre: datosCierre.observacionesCierre || 'Cierre automático generado desde el sistema',
        insertaIdUsuario: 1, // TODO: Obtener del contexto de usuario
        detalle: detalles
      };

      // Debug: Mostrar el objeto que se va a enviar
      console.log('📋 Objeto de cierre a enviar:', JSON.stringify(cierreData, null, 2));

      // Llamar al servicio para crear la caja mayor
      const response = await cajaService.createCajaMayor(cierreData);

      if (response.isExitoso) {
        ToastAlerts.success(`Cierre de caja generado correctamente. Saldo Final: S/ ${response.objModel?.saldoFinal?.toFixed(2) || '0.00'}`);
        
        // Cerrar el modal de generar cierre
        setShowGenerarCierreModal(false);
        
        // Limpiar los datos del formulario
        setDatosCierre({
          saldoInicialMes: 0,
          observacionesCierre: ''
        });

        // Cerrar también el modal principal y regresar a la grilla
        setTimeout(() => {
          onCierreExitoso?.(); // Llamar al callback del componente padre
        }, 1500); // Esperar 1.5 segundos para que el usuario vea el mensaje de éxito

      } else {
        throw new Error(response.mensaje || 'Error al generar el cierre');
      }
    } catch (error) {
      console.error('Error generando cierre:', error);
      ToastAlerts.error(error instanceof Error ? error.message : 'Error al generar el cierre de caja');
    } finally {
      setLoading(false);
    }
  }, [datosGrid, filtros, datosCierre, estadisticasPorTipo, cajaService]);

  return (
    <div className="bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Cierre de Caja Mensual
              </h1>
              <p className="text-gray-600">
                Generar resumen de cierre para {tipoCajaInfo.nombre} - {meses.find(m => m.value === filtros.mes)?.label} {filtros.anio}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Filter size={16} />
                Filtros
              </button>
              <button
                onClick={loadDatosCierre}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Cargando...' : 'Buscar'}
              </button>
              <button
                onClick={handleExportPDF}
                disabled={!datosGrid?.datos?.length}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Download size={16} />
                Exportar PDF
              </button>
              <button
                onClick={() => setShowGenerarCierreModal(true)}
                disabled={!datosGrid?.datos?.length}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                Generar Cierre
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-lg shadow-md p-6 mb-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros de Búsqueda</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Caja
                  </label>
                  <select
                    value={filtros.idTipoCaja}
                    onChange={(e) => handleFiltroChange('idTipoCaja', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {tiposCaja.map(tipo => (
                      <option key={tipo.idTipoCaja} value={tipo.idTipoCaja}>
                        {tipo.nombreTipoCaja}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año
                  </label>
                  <select
                    value={filtros.anio}
                    onChange={(e) => handleFiltroChange('anio', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {anios.map(anio => (
                      <option key={anio.value} value={anio.value}>
                        {anio.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mes
                  </label>
                  <select
                    value={filtros.mes}
                    onChange={(e) => handleFiltroChange('mes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {meses.map(mes => (
                      <option key={mes.value} value={mes.value}>
                        {mes.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cliente, venta, paciente..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registros por página
                      </label>
                      <select
                        value={pagination.pageSize}
                        onChange={(e) => setPagination(prev => ({ 
                          ...prev, 
                          pageSize: parseInt(e.target.value), 
                          page: 1,
                          totalPages: Math.ceil(datosFiltrados.length / parseInt(e.target.value))
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                    <div className="text-sm text-gray-600">
                      Mostrando {Math.min(datosFiltrados.length, pagination.pageSize)} de {datosFiltrados.length} registros
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resumen */}
        {datosGrid?.resumen && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Registros</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {datosGrid.resumen.totalRegistros.toLocaleString()}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos</p>
                  <p className="text-lg font-bold text-green-600">
                    {estadisticasPorTipo.ingresos.toLocaleString()} registros
                  </p>
                  <p className="text-sm text-green-600">
                    S/ {estadisticasPorTipo.totalIngresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Egresos</p>
                  <p className="text-lg font-bold text-red-600">
                    {estadisticasPorTipo.egresos.toLocaleString()} registros
                  </p>
                  <p className="text-sm text-red-600">
                    S/ {estadisticasPorTipo.totalEgresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Balance Neto</p>
                  <p className={`text-lg font-bold ${
                    (estadisticasPorTipo.totalIngresos - estadisticasPorTipo.totalEgresos) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    S/ {(estadisticasPorTipo.totalIngresos - estadisticasPorTipo.totalEgresos).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className={`h-8 w-8 ${
                  (estadisticasPorTipo.totalIngresos - estadisticasPorTipo.totalEgresos) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`} />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Período</p>
                  <p className="text-lg font-bold text-purple-600">
                    {meses.find(m => m.value === filtros.mes)?.label}
                  </p>
                  <p className="text-sm text-purple-600">{filtros.anio}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Grid de datos */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Detalle de Ventas - {datosFiltrados.length} registros
            </h3>
          </div>

          {error && (
            <div className="p-6 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center gap-2">
                <RefreshCw className="animate-spin h-4 w-4" />
                <span>Cargando datos...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Venta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Servicio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Emisión
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {datosPaginados.map((item, index) => (
                      <motion.tr
                        key={`${item.venta}-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.tipo === 'EGRESO' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {item.tipo === 'EGRESO' ? 'EGRESO' : 'INGRESO'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.serie}-{item.correlativo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.cliente}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.paciente}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.servicio}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.fechaEmision).toLocaleDateString('es-PE')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.cantidad}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                          item.tipo === 'EGRESO' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          S/ {item.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando{' '}
                        <span className="font-medium">
                          {(pagination.page - 1) * pagination.pageSize + 1}
                        </span>{' '}
                        a{' '}
                        <span className="font-medium">
                          {Math.min(pagination.page * pagination.pageSize, datosFiltrados.length)}
                        </span>{' '}
                        de{' '}
                        <span className="font-medium">{datosFiltrados.length}</span>{' '}
                        resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page <= 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                          .filter(page => 
                            page === 1 || 
                            page === pagination.totalPages || 
                            Math.abs(page - pagination.page) <= 2
                          )
                          .map(page => (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === pagination.page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page >= pagination.totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Generar Cierre */}
      <AnimatePresence>
        {showGenerarCierreModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowGenerarCierreModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
            >
              <div className="p-6 bg-primary text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Generar Cierre de Caja
                    </h3>
                    <p className="text-white/80 mt-1">
                      Complete los datos faltantes para generar el cierre mensual
                    </p>
                  </div>
                  <button
                    onClick={() => setShowGenerarCierreModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                {/* Información del período */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Información del Período
                  </h4>
                  <div className="text-sm text-blue-700">
                    <p><span className="font-medium">Tipo de Caja:</span> {tipoCajaInfo.nombre}</p>
                    <p><span className="font-medium">Período:</span> {meses.find(m => m.value === filtros.mes)?.label} {filtros.anio}</p>
                    <p><span className="font-medium">Total Transacciones:</span> {datosGrid?.datos?.length || 0}</p>
                  </div>
                </div>

                {/* Campos del formulario */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Saldo Inicial del Mes *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={datosCierre.saldoInicialMes}
                      onChange={(e) => setDatosCierre(prev => ({
                        ...prev,
                        saldoInicialMes: parseFloat(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observaciones del Cierre
                    </label>
                    <textarea
                      maxLength={500}
                      rows={3}
                      value={datosCierre.observacionesCierre}
                      onChange={(e) => setDatosCierre(prev => ({
                        ...prev,
                        observacionesCierre: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ingrese observaciones adicionales sobre el cierre..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {datosCierre.observacionesCierre.length}/500 caracteres
                    </p>
                  </div>

                  {/* Resumen calculado */}
                  {estadisticasPorTipo && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Resumen Calculado
                      </h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Saldo Inicial:</span>
                          <span className="font-medium">S/ {datosCierre.saldoInicialMes.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Total Ingresos:</span>
                          <span className="font-medium">+ S/ {estadisticasPorTipo.totalIngresos.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Total Egresos:</span>
                          <span className="font-medium">- S/ {estadisticasPorTipo.totalEgresos.toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-1 mt-2">
                          <div className="flex justify-between font-medium">
                            <span>Saldo Final:</span>
                            <span className={`${
                              (datosCierre.saldoInicialMes + estadisticasPorTipo.totalIngresos - estadisticasPorTipo.totalEgresos) >= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              S/ {(datosCierre.saldoInicialMes + estadisticasPorTipo.totalIngresos - estadisticasPorTipo.totalEgresos).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={() => setShowGenerarCierreModal(false)}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerarCierre}
                  disabled={loading || datosCierre.saldoInicialMes < 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Generar Cierre
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CierreCajaGrid;
