import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import CajaService from '../../services/CajaService';
import type { CajaMayorCabeceraResponse } from '../../@types/caja';
import FloatingDashboardChat from '../../components/UI/FloatingDashboardChat';


// Componente para filtro de período (año-mes) desde/hasta
const PeriodFilter: React.FC<{ onApplyFilter: (range: { from: string, to: string }) => void }> = React.memo(({ onApplyFilter }) => {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const [isOpen, setIsOpen] = useState(false);

  const [fromYear, setFromYear] = useState<number>(defaultFrom.getFullYear());
  const [fromMonth, setFromMonth] = useState<number>(defaultFrom.getMonth() + 1);
  const [toYear, setToYear] = useState<number>(now.getFullYear());
  const [toMonth, setToMonth] = useState<number>(now.getMonth() + 1);

  const years = Array.from({ length: 11 }, (_, i) => now.getFullYear() - i); // últimos 11 años
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const formatPeriod = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;

  const handleApply = useCallback(() => {
    onApplyFilter({ from: formatPeriod(fromYear, fromMonth), to: formatPeriod(toYear, toMonth) });
    setIsOpen(false);
  }, [fromYear, fromMonth, toYear, toMonth, onApplyFilter]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 text-sm focus:outline-none"
      >
        <Calendar className="w-4 h-4 mr-2" />
        <span>Período (año-mes)</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[420px] bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 p-4 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desde</label>
              <div className="flex gap-2">
                <select value={fromYear} onChange={(e) => setFromYear(parseInt(e.target.value, 10))}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 text-sm w-28">
                  {years.map(y => <option key={`fy-${y}`} value={y}>{y}</option>)}
                </select>
                <select value={fromMonth} onChange={(e) => setFromMonth(parseInt(e.target.value, 10))}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 text-sm w-28">
                  {months.map(m => <option key={`fm-${m}`} value={m}>{String(m).padStart(2, '0')}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasta</label>
              <div className="flex gap-2">
                <select value={toYear} onChange={(e) => setToYear(parseInt(e.target.value, 10))}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 text-sm w-28">
                  {years.map(y => <option key={`ty-${y}`} value={y}>{y}</option>)}
                </select>
                <select value={toMonth} onChange={(e) => setToMonth(parseInt(e.target.value, 10))}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 text-sm w-28">
                  {months.map(m => <option key={`tm-${m}`} value={m}>{String(m).padStart(2, '0')}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setIsOpen(false)} className="px-3 py-1 mr-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 text-sm">Cancelar</button>
            <button onClick={handleApply} className="px-3 py-1 bg-primary text-white rounded-md text-sm">Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
});

// Configuración de tipos de caja
const CASH_TYPES = [
  // Opción agregada: Todos (usa endpoints generales)
  { id: 'todos', label: 'Todos', clienteEsAgente: '1,2,3,4,5,6,7,8,9,10', documentoEgreso: -1 },
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
  const cajaService = CajaService.getInstance();
  
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
  // Nuevo estado para período (año-mes) desde/hasta
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const [periodRange, setPeriodRange] = useState<{ from: string; to: string }>({
    from: `${defaultFrom.getFullYear()}-${String(defaultFrom.getMonth() + 1).padStart(2, '0')}`,
    to: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  });
  const [periodType, setPeriodType] = useState<'semanal' | 'mensual'>('mensual');
  const [selectedCashType, setSelectedCashType] = useState<string>('asistencial'); // Por defecto Asistencial

  // Catálogo de tipos de caja para mapear idTipoCaja
  const [tiposCajaCatalog, setTiposCajaCatalog] = useState<Array<{ idTipoCaja: number; nombreTipoCaja: string }>>([]);

  // Estado para datos del gráfico provenientes de cajamayor_cierre
  const [closureChartData, setClosureChartData] = useState<Array<{
    nombre: string;
    ingresos: number;
    egresos: number;
    balance: number;
    esMensual: boolean;
    esSemanal: boolean;
  }>>([]);
  // Totales del rango para cabecera del gráfico
  const [closureTotals, setClosureTotals] = useState<{ ingresos: number; egresos: number; balance: number }>({ ingresos: 0, egresos: 0, balance: 0 });

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

  // Cargar cierres mensuales desde cajamayor_cierre y mapear al gráfico
  const getMonthNameEs = (m: number) => ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m-1] || `Mes ${m}`;
  const loadClosureChartData = useCallback(async () => {
    try {
      const [fy, fm] = periodRange.from.split('-').map(Number);
      const [ty, tm] = periodRange.to.split('-').map(Number);
      const periodoDesde = (fy * 100) + (isNaN(fm) ? 1 : fm);
      const periodoHasta = (ty * 100) + (isNaN(tm) ? 12 : tm);
      // Selección: si es 'todos' usar endpoint original; caso contrario usar resumen mensual por tipo
      let mapped: Array<{ nombre: string; ingresos: number; egresos: number; balance: number; esMensual: boolean; esSemanal: boolean }> = [];
      if (selectedCashType === 'todos') {
        const resp = await cajaService.getListCabeceraPorRango({
          periodoDesde,
          periodoHasta,
          page: 1,
          pageSize: 100
        });
        const rows: CajaMayorCabeceraResponse[] = Array.isArray(resp?.objModel) ? resp.objModel : [];
        // Normalizador robusto a número: acepta number o string, quitando caracteres no numéricos
        const toNum = (v: any): number => {
          if (v === null || v === undefined) return 0;
          if (typeof v === 'number') return isNaN(v) ? 0 : v;
          if (typeof v === 'string') {
            const cleaned = v.replace(/[^0-9,.-]/g, '').replace(',', '.');
            const n = Number(cleaned);
            return isNaN(n) ? 0 : n;
          }
          const n = Number(v);
          return isNaN(n) ? 0 : n;
        };

        mapped = rows.map(row => {
          const anio = row.anio ?? row.Anio ?? '';
          const mesStr = row.mes ?? row.Mes ?? '';
          const mesNum = parseInt(String(mesStr), 10);
          // Fallbacks más amplios para evitar 0 en egresos si cambia el contrato
          const ingresos = toNum(
            (row as any).totalIngresosTotal ?? (row as any).TotalIngresosTotal ??
            (row as any).totalIngresos ?? (row as any).TotalIngresos ?? 0
          );
          const egresos = toNum(
            (row as any).totalEgresosTotal ?? (row as any).TotalEgresosTotal ??
            (row as any).totalEgresos ?? (row as any).TotalEgresos ?? 0
          );
          const saldoFinal = toNum(
            (row as any).saldoFinalTotal ?? (row as any).SaldoFinalTotal ?? (ingresos - egresos)
          );
          return {
            nombre: `${getMonthNameEs(mesNum)} ${anio}`,
            ingresos,
            egresos,
            balance: saldoFinal,
            esMensual: true,
            esSemanal: false,
          };
        });
      } else {
        // Filtro en frontend cuando el backend devuelve todos los tipos juntos
        // 1) Resolver nombre(s) canónicos del tipo seleccionado para mapear a catálogo
        const TYPE_NAME_MAP: Record<string, string[]> = {
          asistencial: ['ATENCION_ASISTENCIAL', 'ASISTENCIAL'],
          empresarial: ['ATENCION_OCUPACIONAL', 'EMPRESARIAL', 'OCUPACIONAL'],
          farmacia: ['FARMACIA'],
          seguros: ['SEGUROS'],
          mtc: ['MTC'],
          hospital_solidaridad: ['SISOL', 'HOSPITAL DE LA SOLIDARIDAD']
        };
        const candidateNames = TYPE_NAME_MAP[selectedCashType] || [];

        // 2) Intentar encontrar idTipoCaja desde el catálogo cargado
        const tipoCatalog = tiposCajaCatalog.find(tc => candidateNames.some(n => (tc.nombreTipoCaja || '').toUpperCase() === n.toUpperCase()));
        const idTipoCajaSeleccionado = tipoCatalog?.idTipoCaja;

        // 3) Llamar al endpoint y luego filtrar por idTipoCaja (o por nombre en fallback)
        const resp = await cajaService.getResumenMensualPorTipoRango({
          periodoDesde,
          periodoHasta,
          idTipoCaja: idTipoCajaSeleccionado, // si el backend no filtra, filtramos igual abajo
          page: 1,
          pageSize: 100
        });

        const allRows = Array.isArray(resp?.objModel) ? resp.objModel : [];
        const filteredRows = (typeof idTipoCajaSeleccionado === 'number' && idTipoCajaSeleccionado > 0)
          ? allRows.filter((row: any) => {
              const id = row.idTipoCaja ?? row.IdTipoCaja;
              return id === idTipoCajaSeleccionado;
            })
          : allRows.filter((row: any) => {
              const nombre = String(row.nombreTipoCaja ?? row.NombreTipoCaja ?? '').toUpperCase();
              return candidateNames.some(n => nombre === n.toUpperCase());
            });

        // 4) Mapear por período (anio/mes) para el gráfico
        mapped = filteredRows.map((row: any) => {
          const anio = row.anio ?? row.Anio ?? '';
          const mesNum = parseInt(String(row.mes ?? row.Mes ?? ''), 10);
          const ingresos = row.totalIngresos ?? row.TotalIngresos ?? 0;
          const egresos = row.totalEgresos ?? row.TotalEgresos ?? 0;
          const balance = row.saldoFinal ?? row.SaldoFinal ?? 0;
          return {
            nombre: `${getMonthNameEs(mesNum)} ${anio}`,
            ingresos,
            egresos,
            balance,
            esMensual: true,
            esSemanal: false,
          };
        });
      }
      setClosureChartData(mapped);
      // Calcular sumatorias para cabecera del gráfico
      const totals = mapped.reduce((acc, cur) => {
        acc.ingresos += (typeof cur.ingresos === 'number' ? cur.ingresos : Number(cur.ingresos)) || 0;
        acc.egresos += (typeof cur.egresos === 'number' ? cur.egresos : Number(cur.egresos)) || 0;
        acc.balance += (typeof cur.balance === 'number' ? cur.balance : Number(cur.balance)) || 0;
        return acc;
      }, { ingresos: 0, egresos: 0, balance: 0 });
      setClosureTotals(totals);
    } catch (e) {
      console.error('Error cargando cierres de cajamayor_cierre:', e);
    }
  }, [periodRange, cajaService, selectedCashType, tiposCajaCatalog]);

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
    loadClosureChartData(); // Cargar gráfico de cierres
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

  // Cargar gráfico cuando cambie el período
  useEffect(() => {
    loadClosureChartData();
  }, [loadClosureChartData]);

  // Cargar catálogo de tipos de caja una vez
  useEffect(() => {
    const fetchTipos = async () => {
      try {
        const resp = await cajaService.getTiposCaja({ includeInactive: false });
        const list = Array.isArray(resp?.objModel) ? resp.objModel : [];
        // Estructura mínima: idTipoCaja y nombreTipoCaja
        const mapped = list.map((t: any) => ({
          idTipoCaja: t.idTipoCaja ?? t.IdTipoCaja ?? 0,
          nombreTipoCaja: t.nombreTipoCaja ?? t.NombreTipoCaja ?? ''
        }));
        setTiposCajaCatalog(mapped);
      } catch (err) {
        console.warn('No se pudo cargar catálogo de tipos de caja:', err);
      }
    };
    fetchTipos();
  }, [cajaService]);

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
  const handlePeriodFilter = useCallback((range: { from: string; to: string }) => {
    console.log('🗓️ Nuevo período seleccionado:', range);
    setPeriodRange(range);
    // Sincronizar dateRange para mantener otras secciones compatibles
    const [fy, fm] = range.from.split('-').map(Number);
    const [ty, tm] = range.to.split('-').map(Number);
    const start = new Date(fy, (fm || 1) - 1, 1);
    const end = new Date(ty, (tm || 1), 0); // último día del mes
    const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(1).padStart(2,'0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
    setDateRange({ startDate: startStr, endDate: endStr });
  }, []);

  const handlePeriodChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriodType = e.target.value as 'semanal' | 'mensual';
    console.log('📊 Nuevo tipo de período seleccionado:', newPeriodType);
    setPeriodType(newPeriodType);
  }, []);

  const handleCashTypeChange = useCallback((type: string) => {
    console.log('💰 Nuevo tipo de caja seleccionado:', type);
    setSelectedCashType(type);
    // Forzar actualización inmediata del gráfico y su cabecera al cambiar el tipo
    // Evita esperar únicamente al efecto dependiente
    try {
      // Ejecutar en microtask para asegurar que el estado se aplique primero
      Promise.resolve().then(() => loadClosureChartData());
    } catch {}
  }, [loadClosureChartData]);

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

    // Se descartan cálculos de comparación con el período anterior
    const emptyTrend = '' as const;
    const neutralDirection = 'neutral' as const;
    const zeroTrendValue = 0;

    return {
      patientsAttended: {
        title: 'Pacientes Atendidos',
        value: formatNumber(resumenComparativo.pacientesActual),
        numericValue: resumenComparativo.pacientesActual || 0,
        trend: emptyTrend,
        trendDirection: neutralDirection,
        trendValue: zeroTrendValue,
        trendDescription: ''
      },
      income: {
        title: 'Ingresos',
        value: formatCurrency(resumenComparativo.ingresosActual),
        numericValue: resumenComparativo.ingresosActual || 0,
        trend: emptyTrend,
        trendDirection: neutralDirection,
        trendValue: zeroTrendValue,
        trendDescription: ''
      },
      expenses: {
        title: 'Egresos',
        value: formatCurrency(resumenComparativo.egresosActual),
        numericValue: resumenComparativo.egresosActual || 0,
        trend: emptyTrend,
        trendDirection: neutralDirection,
        trendValue: zeroTrendValue,
        trendDescription: ''
      },
      balance: {
        title: 'Balance',
        value: formatCurrency(resumenComparativo.balanceActual),
        numericValue: resumenComparativo.balanceActual || 0,
        trend: emptyTrend,
        trendDirection: neutralDirection,
        trendValue: zeroTrendValue,
        trendDescription: ''
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

  // Formatear período para mostrar (YYYY-MM -> Mes Año)
  const formatPeriodForDisplay = (period: string): string => {
    const [yStr, mStr] = period.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    return `${getMonthNameEs(m)} ${y}`;
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
            <PeriodFilter onApplyFilter={handlePeriodFilter} />
            <CashTypeFilter 
              selectedType={selectedCashType} 
              onTypeChange={handleCashTypeChange} 
            />
          </div>
        </div>

        {/* Período seleccionado */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-800 dark:text-blue-200 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          <span>
            Mostrando datos desde {formatPeriodForDisplay(periodRange.from)} hasta {formatPeriodForDisplay(periodRange.to)}
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
            <PeriodFilter onApplyFilter={handlePeriodFilter} />
            <CashTypeFilter 
              selectedType={selectedCashType} 
              onTypeChange={handleCashTypeChange} 
            />
          </div>
        </div>

        {/* Período seleccionado */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-800 dark:text-blue-200 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          <span>
            Mostrando datos desde {formatPeriodForDisplay(periodRange.from)} hasta {formatPeriodForDisplay(periodRange.to)}
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
            <PeriodFilter onApplyFilter={handlePeriodFilter} />
            <CashTypeFilter 
              selectedType={selectedCashType} 
              onTypeChange={handleCashTypeChange} 
            />
          </div>
        </div>

        {/* Período seleccionado */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-800 dark:text-blue-200 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          <span>
            Mostrando datos desde {formatPeriodForDisplay(periodRange.from)} hasta {formatPeriodForDisplay(periodRange.to)}
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
          <PeriodFilter onApplyFilter={handlePeriodFilter} />
          <CashTypeFilter 
            selectedType={selectedCashType} 
            onTypeChange={handleCashTypeChange} 
          />
        </div>
      </div>

      {/* Período seleccionado */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-800 dark:text-blue-200 flex items-center">
        <Calendar className="w-4 h-4 mr-2" />
        <span>
          Mostrando datos desde {formatPeriodForDisplay(periodRange.from)} hasta {formatPeriodForDisplay(periodRange.to)}
          <span className="ml-2 font-medium">
            - Tipo de Caja: {CASH_TYPES.find(type => type.id === selectedCashType)?.label || 'No especificado'}
          </span>
          {loading && <span className="ml-2 text-xs">(Cargando...)</span>}
        </span>
      </div>

      {/* Estadísticas principales */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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
          {(() => {
            // Totales siempre recalculados a partir de los datos del gráfico
            const computedTotals = closureChartData.reduce((acc, cur) => {
              acc.ingresos += cur.ingresos || 0;
              acc.egresos += cur.egresos || 0;
              acc.balance += cur.balance || 0;
              return acc;
            }, { ingresos: 0, egresos: 0, balance: 0 });

            const formatCurrency = (amount: number) => `S/. ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-primary" />
              {`Tendencia de Ingresos - ${selectedCashType === 'todos' ? 'Totales' : (CASH_TYPES.find(type => type.id === selectedCashType)?.label || 'Totales')}`}
            </h2>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {`Ingresos: ${formatCurrency(computedTotals.ingresos)} | Egresos: ${formatCurrency(computedTotals.egresos)} | Balance: ${formatCurrency(computedTotals.balance)}`}
            </span>
          </div>
          })()}

        {closureChartData && closureChartData.length > 0 ? (
          <GroupedBarChart data={closureChartData} />
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
      {(stat.trend || stat.trendDescription) && (
        <div className="mt-3">
          <span className={`text-sm font-medium ${
            stat.trendDirection === 'up' ? 'text-green-600 dark:text-green-400' : 
            stat.trendDirection === 'down' ? 'text-red-600 dark:text-red-400' : 
            'text-gray-600 dark:text-gray-400'
          }`}>
            {stat.trend}
          </span>
          {stat.trendDescription && (
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{stat.trendDescription}</span>
          )}
        </div>
      )}
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