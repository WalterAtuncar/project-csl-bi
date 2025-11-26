import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Calendar, BarChart3, 
  PieChart as PieChartIcon,
  TrendingUp, TrendingDown, Wallet
} from 'lucide-react';
import { 
  dashboardService, 
  FinancialDashboardRequest,
  FinancialDashboardResponse,
  StatItem
} from '../../services/DashboardService';
import FloatingDashboardChat from '../../components/UI/FloatingDashboardChat';


// Componente para filtros avanzados de fecha - Optimizado con React.memo
const DateRangeFilter: React.FC<{onApplyFilter: (range: {startDate: string, endDate: string}) => void}> = React.memo(({ onApplyFilter }) => {
  // Usar fechas dinámicas por defecto
  const getDefaultDates = () => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return {
      startDate: threeMonthsAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    };
  };

  const [startDate, setStartDate] = useState(getDefaultDates().startDate);
  const [endDate, setEndDate] = useState(getDefaultDates().endDate);
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = useCallback(() => {
    onApplyFilter({ startDate, endDate });
    setIsOpen(false);
  }, [onApplyFilter, startDate, endDate]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 text-sm focus:outline-none"
      >
        <Calendar className="w-4 h-4 mr-2" />
        <span>Rango de fechas</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 p-4 border border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 text-sm"
              />
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 mr-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                className="px-3 py-1 bg-primary text-white rounded-md text-sm"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Configuración de tipos de caja
const CASH_TYPES = [
  { id: 'empresarial', label: 'Empresarial', clienteEsAgente: '1', documentoEgreso: 500 },
  { id: 'asistencial', label: 'Asistencial', clienteEsAgente: '2,8,9', documentoEgreso: 502 },
  { id: 'farmacia', label: 'Farmacia', clienteEsAgente: '3,4', documentoEgreso: 504 },
  { id: 'seguros', label: 'Seguros', clienteEsAgente: '5,6', documentoEgreso: -1 },
  { id: 'mtc', label: 'MTC', clienteEsAgente: '7', documentoEgreso: 509 },
  { id: 'hospital_solidaridad', label: 'Hospital de la Solidaridad', clienteEsAgente: '10', documentoEgreso: 512 }
];

// Componente para seleccionar tipo de caja - Optimizado con React.memo
const CashTypeFilter: React.FC<{
  selectedType: string;
  onTypeChange: (type: string) => void;
}> = React.memo(({ selectedType, onTypeChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleTypeChange = useCallback((value: string) => {
    onTypeChange(value);
    setIsOpen(false);
  }, [onTypeChange]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 text-sm focus:outline-none"
      >
        <span className="mr-2">💰</span>
        <span>Tipo de Caja</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Seleccionar Tipo de Caja
          </h3>
          <div className="space-y-2">
            {CASH_TYPES.map((type) => (
              <label key={type.id} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="cashType"
                  value={type.id}
                  checked={selectedType === type.id}
                  onChange={(e) => {
                    handleTypeChange(e.target.value);
                  }}
                  className="mr-3 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {type.label}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-primary text-white rounded-md text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
});





const GeneralDashboard: React.FC = () => {
  const [financialData, setFinancialData] = useState<FinancialDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Referencias para control de requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef<boolean>(false);
  
  // Calcular los últimos 3 meses por defecto
  const getDefaultDateRange = () => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return {
      startDate: threeMonthsAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [periodType, setPeriodType] = useState<'semanal' | 'mensual'>('mensual');
  const [selectedCashType, setSelectedCashType] = useState<string>('asistencial'); // Por defecto Asistencial

  // Función optimizada para cargar datos del dashboard financiero
  const loadDashboardData = useCallback(async () => {
    // Evitar llamadas simultáneas
    if (isLoadingRef.current) {
      console.log('⏳ Ya hay una llamada en progreso, omitiendo...');
      return;
    }

    try {
      isLoadingRef.current = true;

      // Cancelar request anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Crear nuevo AbortController
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      // Obtener configuración del tipo de caja seleccionado
      const selectedCashConfig = CASH_TYPES.find(type => type.id === selectedCashType);
      if (!selectedCashConfig) {
        throw new Error('Tipo de caja no válido');
      }

      // Request para dashboard financiero
      const financialRequest: FinancialDashboardRequest = {
        startDate: new Date(dateRange.startDate + 'T00:00:00.000Z').toISOString(),
        endDate: new Date(dateRange.endDate + 'T23:59:59.999Z').toISOString(),
        clienteEsAgente: selectedCashConfig.clienteEsAgente,
        documentoEgreso: selectedCashConfig.documentoEgreso,
        distribucion: periodType
      };

      console.log('🚀 Enviando request financiero al backend:', {
        startDate: financialRequest.startDate,
        endDate: financialRequest.endDate,
        clienteEsAgente: financialRequest.clienteEsAgente,
        documentoEgreso: financialRequest.documentoEgreso,
        distribucion: financialRequest.distribucion,
        selectedCashType: selectedCashType,
        timestamp: new Date().toISOString()
      });

      // Cargar solo el dashboard financiero
      const financialDataResponse = await dashboardService.getFinancialDashboard(financialRequest);

      // Verificar si el componente aún está montado y el request no fue cancelado
      if (!abortControllerRef.current?.signal.aborted) {
        setFinancialData(financialDataResponse);
        
        console.log('✅ Respuesta del dashboard financiero recibida:', {
          timestamp: new Date().toISOString(),
          resumenComparativo: financialDataResponse.resumenComparativo,
          datosPorPeriodo: financialDataResponse.datosPorPeriodo?.length || 0,
          datosPorConsultorio: financialDataResponse.datosPorConsultorio?.length || 0
        });
      }
      
    } catch (err) {
      // No mostrar error si fue cancelado
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('❌ Request cancelado:', err.message);
        return;
      }
      
      console.error('❌ Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [dateRange, periodType, selectedCashType]);

  // Función con debouncing para cargar datos
  const debouncedLoadData = useCallback(() => {
    // Limpiar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Establecer nuevo timer con debounce de 300ms
    debounceTimerRef.current = setTimeout(() => {
      loadDashboardData();
    }, 300);
  }, [loadDashboardData]);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadDashboardData(); // Carga inicial inmediata
  }, []); // Solo al montar

  // Cargar datos cuando cambien los filtros (con debouncing)
  useEffect(() => {
    debouncedLoadData();
    
    // Cleanup del timer
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debouncedLoadData]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handlers optimizados con useCallback
  const handleDateRangeFilter = useCallback((range: {startDate: string, endDate: string}) => {
    console.log('📅 Nuevo rango de fechas seleccionado:', range);
    setDateRange(range);
  }, []);

  const handlePeriodChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriodType = e.target.value as 'semanal' | 'mensual';
    console.log('📊 Nuevo tipo de período seleccionado:', newPeriodType);
    setPeriodType(newPeriodType);
  }, []);

  const handleCashTypeChange = useCallback((type: string) => {
    console.log('💰 Nuevo tipo de caja seleccionado:', type);
    setSelectedCashType(type);
  }, []);

  // Función helper para crear StatItems desde datos financieros
  const createFinancialStatItems = (resumenComparativo: FinancialDashboardResponse['resumenComparativo']) => {
    const formatCurrency = (amount: number | null | undefined) => {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return 'S/. 0.00';
      }
      return `S/. ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatNumber = (num: number | null | undefined) => {
      if (num === null || num === undefined || isNaN(num)) {
        return '0';
      }
      return num.toLocaleString('es-PE');
    };

    const formatPercentage = (percentage: number | null | undefined) => {
      if (percentage === null || percentage === undefined || isNaN(percentage)) {
        return '0.00%';
      }
      return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
    };

    const getTrendDirection = (percentage: number | null | undefined): 'up' | 'down' | 'neutral' => {
      if (percentage === null || percentage === undefined || isNaN(percentage)) {
        return 'neutral';
      }
      if (percentage > 0) return 'up';
      if (percentage < 0) return 'down';
      return 'neutral';
    };

    // Calcular porcentaje de variación para balance con validaciones
    const balanceVariationPercentage = (resumenComparativo.balanceActual && resumenComparativo.balanceActual !== 0) 
      ? (resumenComparativo.diferenciaBalance || 0) / resumenComparativo.balanceActual * 100 
      : 0;

    return {
      patientsAttended: {
        title: 'Pacientes Atendidos',
        value: formatNumber(resumenComparativo.pacientesActual),
        numericValue: resumenComparativo.pacientesActual || 0,
        trend: formatPercentage(resumenComparativo.porcentajeCrecimientoPacientes),
        trendDirection: getTrendDirection(resumenComparativo.porcentajeCrecimientoPacientes),
        trendValue: resumenComparativo.porcentajeCrecimientoPacientes || 0,
        trendDescription: 'vs período anterior'
      },
      income: {
        title: 'Ingresos',
        value: formatCurrency(resumenComparativo.ingresosActual),
        numericValue: resumenComparativo.ingresosActual || 0,
        trend: formatPercentage(resumenComparativo.porcentajeCrecimientoIngresos),
        trendDirection: getTrendDirection(resumenComparativo.porcentajeCrecimientoIngresos),
        trendValue: resumenComparativo.porcentajeCrecimientoIngresos || 0,
        trendDescription: 'vs período anterior'
      },
      expenses: {
        title: 'Egresos',
        value: formatCurrency(resumenComparativo.egresosActual),
        numericValue: resumenComparativo.egresosActual || 0,
        trend: formatPercentage(resumenComparativo.porcentajeCrecimientoEgresos),
        trendDirection: getTrendDirection(resumenComparativo.porcentajeCrecimientoEgresos),
        trendValue: resumenComparativo.porcentajeCrecimientoEgresos || 0,
        trendDescription: 'vs período anterior'
      },
      balance: {
        title: 'Balance',
        value: formatCurrency(resumenComparativo.balanceActual),
        numericValue: resumenComparativo.balanceActual || 0,
        trend: formatPercentage(balanceVariationPercentage),
        trendDirection: getTrendDirection(balanceVariationPercentage),
        trendValue: balanceVariationPercentage || 0,
        trendDescription: 'vs período anterior'
      }
    };
  };

  // Función helper para formatear fechas sin problemas de zona horaria
  const formatDateForDisplay = (dateString: string): string => {
    // Si la fecha viene en formato YYYYMMDD del API, convertirla primero
    if (dateString.length === 8 && !dateString.includes('-')) {
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      dateString = `${year}-${month}-${day}`;
    }
    
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  // Función helper para calcular días entre fechas
  const calculateDaysBetween = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // +1 para incluir ambos días
  };

  // Mostrar loading
  if (loading && !financialData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <motion.h1 
            className="text-2xl font-bold text-gray-800 dark:text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            Dashboard General
          </motion.h1>
          <div className="flex space-x-3">
            <DateRangeFilter onApplyFilter={handleDateRangeFilter} />
          <CashTypeFilter 
            selectedType={selectedCashType} 
            onTypeChange={handleCashTypeChange} 
          />
          </div>
        </div>

        {/* Rango de fechas seleccionado */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-800 dark:text-blue-200 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          <span>
            Mostrando datos desde {formatDateForDisplay(dateRange.startDate)} hasta {formatDateForDisplay(dateRange.endDate)} 
            ({calculateDaysBetween(dateRange.startDate, dateRange.endDate)} días)
          <span className="ml-2 font-medium">
            - Tipo de Caja: {CASH_TYPES.find(type => type.id === selectedCashType)?.label || 'No especificado'}
          </span>
            <span className="ml-2 text-xs">(Cargando...)</span>
          </span>
        </div>

        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <motion.h1 
            className="text-2xl font-bold text-gray-800 dark:text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            Dashboard General
          </motion.h1>
          <div className="flex space-x-3">
            <DateRangeFilter onApplyFilter={handleDateRangeFilter} />
            <CashTypeFilter 
              selectedType={selectedCashType} 
              onTypeChange={handleCashTypeChange} 
            />
          </div>
        </div>

        {/* Rango de fechas seleccionado */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-800 dark:text-blue-200 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          <span>
            Mostrando datos desde {formatDateForDisplay(dateRange.startDate)} hasta {formatDateForDisplay(dateRange.endDate)} 
            ({calculateDaysBetween(dateRange.startDate, dateRange.endDate)} días)
            <span className="ml-2 font-medium">
              - Tipo de Caja: {CASH_TYPES.find(type => type.id === selectedCashType)?.label || 'No especificado'}
            </span>
          </span>
        </div>

        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button 
              onClick={loadDashboardData}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No hay datos
  if (!financialData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <motion.h1 
            className="text-2xl font-bold text-gray-800 dark:text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            Dashboard General
          </motion.h1>
          <div className="flex space-x-3">
            <DateRangeFilter onApplyFilter={handleDateRangeFilter} />
            <CashTypeFilter 
              selectedType={selectedCashType} 
              onTypeChange={handleCashTypeChange} 
            />
          </div>
        </div>

        {/* Rango de fechas seleccionado */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-800 dark:text-blue-200 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          <span>
            Mostrando datos desde {formatDateForDisplay(dateRange.startDate)} hasta {formatDateForDisplay(dateRange.endDate)} 
            ({calculateDaysBetween(dateRange.startDate, dateRange.endDate)} días)
            <span className="ml-2 font-medium">
              - Tipo de Caja: {CASH_TYPES.find(type => type.id === selectedCashType)?.label || 'No especificado'}
            </span>
          </span>
        </div>

        <div className="flex items-center justify-center min-h-96">
          <p className="text-gray-600 dark:text-gray-400">No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <motion.h1 
          className="text-2xl font-bold text-gray-800 dark:text-white"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          Dashboard General
        </motion.h1>
        <div className="flex space-x-3">
          <DateRangeFilter onApplyFilter={handleDateRangeFilter} />
          <CashTypeFilter 
            selectedType={selectedCashType} 
            onTypeChange={handleCashTypeChange} 
          />
        </div>
      </div>

      {/* Rango de fechas seleccionado */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-800 dark:text-blue-200 flex items-center">
        <Calendar className="w-4 h-4 mr-2" />
        <span>
          Mostrando datos desde {formatDateForDisplay(dateRange.startDate)} hasta {formatDateForDisplay(dateRange.endDate)} 
          ({calculateDaysBetween(dateRange.startDate, dateRange.endDate)} días)
          <span className="ml-2 font-medium">
            - Tipo de Caja: {CASH_TYPES.find(type => type.id === selectedCashType)?.label || 'No especificado'}
          </span>
          {loading && <span className="ml-2 text-xs">(Cargando...)</span>}
        </span>
      </div>

      {/* Estadísticas principales */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        initial="hidden"
        animate="show"
      >
        {financialData?.resumenComparativo ? (
          (() => {
            const financialStats = createFinancialStatItems(financialData.resumenComparativo);
            return (
              <>
        <StatCard 
                  stat={financialStats.patientsAttended}
          icon={<Users className="w-6 h-6" />} 
          color="bg-blue-500" 
        />
        
        <StatCard 
                  stat={financialStats.income}
                  icon={<TrendingUp className="w-6 h-6" />} 
          color="bg-green-500" 
        />
        
        <StatCard 
                  stat={financialStats.expenses}
                  icon={<TrendingDown className="w-6 h-6" />} 
                  color="bg-red-500" 
        />
        
        <StatCard 
                  stat={financialStats.balance}
                  icon={<Wallet className="w-6 h-6" />} 
          color="bg-purple-500" 
        />
              </>
            );
          })()
        ) : (
          <div className="col-span-4 text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No hay datos disponibles</p>
          </div>
        )}
      </motion.div>

      {/* Gráfico de ingresos - Ancho completo */}
        <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-primary" />
            Tendencia de Ingresos - {CASH_TYPES.find(type => type.id === selectedCashType)?.label || 'Sin especificar'}
            </h2>
            <select 
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md px-2 py-1 text-sm"
              value={periodType}
              onChange={handlePeriodChange}
            >
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
            </select>
          </div>
          
        {financialData?.datosPorPeriodo ? (
          <GroupedBarChart data={financialData.datosPorPeriodo} />
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay datos del gráfico disponibles</p>
          </div>
        )}
        </motion.div>

      {/* Datos por Consultorio */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
            <PieChartIcon className="w-5 h-5 mr-2 text-primary" />
          Datos por Consultorio ({formatDateForDisplay(dateRange.startDate)} - {formatDateForDisplay(dateRange.endDate)})
          </h2>
          
        <div className="space-y-4">
          {financialData?.datosPorConsultorio && financialData.datosPorConsultorio.length > 0 ? (
            financialData.datosPorConsultorio.map((consultorio, index) => (
              <ConsultorioDataBar key={`consultorio-${consultorio.nombreConsultorio}-${index}`} consultorio={consultorio} allData={financialData.datosPorConsultorio} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <PieChartIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay datos de consultorios disponibles</p>
              <p className="text-sm">Los datos se mostrarán cuando estén disponibles desde el backend</p>
            </div>
          )}
          </div>
        </motion.div>

      {/* Chat AI Flotante */}
      <FloatingDashboardChat 
        dashboardData={financialData}
        dashboardType="general"
        dashboardTitle="Dashboard General - Financiero"
        disabled={!financialData}
      />
    </div>
  );
};

interface StatCardProps {
  stat: StatItem;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ stat, icon, color }) => {
  // Formatear el valor con separadores de millar si es un número entero sin formato monetario
  const formatValue = (stat: StatItem): string => {
    // Si el valor ya viene formateado como moneda (contiene "S/." o "$"), usarlo tal como viene
    if (stat.value.includes('S/.') || stat.value.includes('$') || stat.value.includes('%')) {
      return stat.value;
    }
    
    // Si es un número entero, formatearlo con separadores de millar
    if (Number.isInteger(stat.numericValue)) {
      return stat.numericValue.toLocaleString();
    }
    
    // Para otros casos, usar el valor original
    return stat.value;
  };

  return (
    <motion.div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
      }}
    >
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{formatValue(stat)}</p>
        </div>
        <div className={`${color} rounded-lg p-3 text-white`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <span className={`text-sm font-medium ${
          stat.trendDirection === 'up' ? 'text-green-600 dark:text-green-400' : 
          stat.trendDirection === 'down' ? 'text-red-600 dark:text-red-400' : 
          'text-gray-600 dark:text-gray-400'
        }`}>
          {stat.trend}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{stat.trendDescription}</span>
      </div>
    </motion.div>
  );
};



// Nuevo componente para mostrar datos por consultorio
interface ConsultorioDataBarProps {
  consultorio: {
    nombreConsultorio: string;
    cantidadVentas: number;
    montoTotal: number;
    promedioVenta: number;
  };
  allData: Array<{
    nombreConsultorio: string;
    cantidadVentas: number;
    montoTotal: number;
    promedioVenta: number;
  }>;
}

const ConsultorioDataBar: React.FC<ConsultorioDataBarProps> = ({ consultorio, allData }) => {
  // Calcular valores máximos para las barras de progreso
  const maxCantidadVentas = Math.max(...allData.map(item => item.cantidadVentas));
  const maxMontoTotal = Math.max(...allData.map(item => item.montoTotal));
  const maxPromedioVenta = Math.max(...allData.map(item => item.promedioVenta));

  // Calcular porcentajes
  const cantidadVentasPercentage = maxCantidadVentas > 0 ? (consultorio.cantidadVentas / maxCantidadVentas) * 100 : 0;
  const montoTotalPercentage = maxMontoTotal > 0 ? (consultorio.montoTotal / maxMontoTotal) * 100 : 0;
  const promedioVentaPercentage = maxPromedioVenta > 0 ? (consultorio.promedioVenta / maxPromedioVenta) * 100 : 0;

  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return `S/. ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-3">
        {consultorio.nombreConsultorio}
      </h3>
      
      <div className="space-y-3">
        {/* Progress Bar - Cantidad de Ventas */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Cantidad de Ventas</span>
            <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
              {consultorio.cantidadVentas.toLocaleString()}
            </span>
      </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5 overflow-hidden">
        <motion.div 
              className="bg-gradient-to-r from-blue-600 to-blue-500 h-full rounded-full shadow-sm"
          initial={{ width: 0 }}
              animate={{ width: `${cantidadVentasPercentage}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
              style={{ minWidth: cantidadVentasPercentage > 0 ? '2px' : '0px' }}
            />
          </div>
        </div>

        {/* Progress Bar - Monto Total */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Monto Total</span>
            <span className="text-sm font-bold text-green-800 dark:text-green-200">
              {formatCurrency(consultorio.montoTotal)}
            </span>
          </div>
          <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2.5 overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-green-600 to-green-500 h-full rounded-full shadow-sm"
              initial={{ width: 0 }}
              animate={{ width: `${montoTotalPercentage}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
              style={{ minWidth: montoTotalPercentage > 0 ? '2px' : '0px' }}
            />
          </div>
        </div>

        {/* Progress Bar - Promedio de Venta */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Promedio de Venta</span>
            <span className="text-sm font-bold text-purple-800 dark:text-purple-200">
              {formatCurrency(consultorio.promedioVenta)}
            </span>
          </div>
          <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2.5 overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-purple-600 to-purple-500 h-full rounded-full shadow-sm"
              initial={{ width: 0 }}
              animate={{ width: `${promedioVentaPercentage}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              style={{ minWidth: promedioVentaPercentage > 0 ? '2px' : '0px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface GroupedBarChartProps {
  data: Array<{
    nombre: string;
    ingresos: number;
    egresos: number;
    balance: number;
    esMensual: boolean;
    esSemanal: boolean;
  }>;
}

const GroupedBarChart: React.FC<GroupedBarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
  return (
      <div className="w-full h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay datos disponibles para mostrar</p>
            </div>
      </div>
    );
  }

  // Encontrar el valor máximo real de las barras
  const maxValueRaw = Math.max(
    ...data.flatMap(item => [item.ingresos, item.egresos, item.balance])
  );
  
  // Agregar 5% adicional para mejor visualización estética
  const maxValue = maxValueRaw * 1.02;

  const formatCurrency = (amount: number) => {
    return `S/. ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calcular ancho dinámico de barras basado en número de períodos - Optimizado para mejor densidad
  const barWidth = Math.max(50, Math.min(100, (1000 / data.length) / 3.5));
  const chartHeight = 320; // Altura fija del gráfico

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-lg p-4">
      {/* Contenedor del gráfico con dimensiones fijas */}
      <div className="relative w-full" style={{ height: `${chartHeight + 80}px` }}>
        
        {/* Grid de fondo */}
        <div className="absolute left-16 right-4 top-0" style={{ height: `${chartHeight}px` }}>
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className="absolute w-full border-t border-gray-200 dark:border-gray-600 opacity-30"
              style={{ top: `${(i * chartHeight) / 4}px` }}
            />
        ))}
      </div>
        
        {/* Etiquetas del eje Y */}
        <div className="absolute left-0 top-0 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 w-14" style={{ height: `${chartHeight}px` }}>
          {[...Array(6)].map((_, i) => {
            const value = (maxValue * (5 - i)) / 5;
            return (
              <div key={i} className="text-right pr-2 flex items-center justify-end h-0">
                <span>{value > 0 ? `S/. ${Math.round(value / 1000)}K` : '0'}</span>
    </div>
  );
          })}
        </div>

        {/* Contenedor de las barras */}
        <div 
          className="absolute left-16 right-4 bottom-0 flex items-end justify-center gap-3"
          style={{ height: `${chartHeight}px` }}
        >
          {data.map((period, index) => {
            // Calcular alturas en píxeles directamente
            const ingresosHeightPx = maxValue > 0 ? Math.max(8, (period.ingresos / maxValue) * chartHeight) : 0;
            const egresosHeightPx = maxValue > 0 ? Math.max(8, (period.egresos / maxValue) * chartHeight) : 0;
            const balanceHeightPx = maxValue > 0 ? Math.max(8, (period.balance / maxValue) * chartHeight) : 0;
            
              return (
              <div 
                key={`period-${period.nombre}-${index}`} 
                className="flex items-end justify-center gap-1"
                style={{ width: `${barWidth * 3 + 12}px` }}
              >
                {/* Barra de Ingresos */}
    <motion.div 
                  className="bg-gradient-to-t from-green-700 to-green-400 rounded-t-lg shadow-md group relative border border-green-600 hover:shadow-2xl hover:scale-105 transition-all duration-300"
          style={{ 
                    height: `${ingresosHeightPx}px`,
                    width: `${barWidth}px`
                  }}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ 
                    height: `${ingresosHeightPx}px`,
                    opacity: 1 
                  }}
                  transition={{ duration: 0.8, delay: index * 0.15, type: "spring", stiffness: 120, damping: 20 }}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30">
                    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap">
                      <div className="font-semibold text-green-300">Ingresos</div>
                      <div>{formatCurrency(period.ingresos)}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </motion.div>

                {/* Barra de Egresos */}
                <motion.div
                  className="bg-gradient-to-t from-red-700 to-red-400 rounded-t-lg shadow-md group relative border border-red-600 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  style={{ 
                    height: `${egresosHeightPx}px`,
                    width: `${barWidth}px`
                  }}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ 
                    height: `${egresosHeightPx}px`,
                    opacity: 1 
                  }}
                  transition={{ duration: 0.8, delay: index * 0.15 + 0.1, type: "spring", stiffness: 120, damping: 20 }}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30">
                    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap">
                      <div className="font-semibold text-red-300">Egresos</div>
                      <div>{formatCurrency(period.egresos)}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
      </div>
    </motion.div>

                {/* Barra de Balance */}
    <motion.div 
                  className="bg-gradient-to-t from-blue-700 to-blue-400 rounded-t-lg shadow-md group relative border border-blue-600 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  style={{ 
                    height: `${balanceHeightPx}px`,
                    width: `${barWidth}px`
                  }}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ 
                    height: `${balanceHeightPx}px`,
                    opacity: 1 
                  }}
                  transition={{ duration: 0.8, delay: index * 0.15 + 0.2, type: "spring", stiffness: 120, damping: 20 }}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30">
                    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap">
                      <div className="font-semibold text-blue-300">Balance</div>
                      <div>{formatCurrency(period.balance)}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
      </div>
    </motion.div>
              </div>
            );
          })}
        </div>
        
        {/* Etiquetas del eje X */}
        <div 
          className="absolute left-16 right-4 flex justify-center gap-3"
          style={{ top: `${chartHeight + 10}px` }}
        >
          {data.map((period, index) => (
            <div 
              key={`label-${period.nombre}-${index}`} 
              className="text-center"
              style={{ width: `${barWidth * 3 + 12}px` }}
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {period.nombre}
        </span>
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex justify-center items-center gap-6 mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-t from-green-700 to-green-400 rounded border border-green-600 shadow-sm"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ingresos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-t from-red-700 to-red-400 rounded border border-red-600 shadow-sm"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Egresos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-t from-blue-700 to-blue-400 rounded border border-blue-600 shadow-sm"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Balance</span>
        </div>
      </div>
    </div>
  );
};



export default GeneralDashboard;