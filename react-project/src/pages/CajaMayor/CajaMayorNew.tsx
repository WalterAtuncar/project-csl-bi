// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, Eye, PlusCircle, MinusCircle, X, Save,
  ChevronLeft, ChevronRight, ListChecks, ArrowUpCircle, ArrowDownCircle, Calculator, Download, BarChart3, RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ToastAlerts from '../../components/UI/ToastAlerts';
import CajaService from '../../services/CajaService';
import { ExportService } from '../../services/ExportService';
import type { CajaMayorCabeceraResponse, GetListCabeceraRequest } from '../../@types/caja';
import { getInsertaIdUsuario } from '../../utils/auth';
import MovimientoManualModal from '../../components/CajaMayor/MovimientoManualModal';
import RegistroComprasModal from '../../components/CajaMayor/RegistroComprasModal';

// En esta nueva vista el backend está habilitado
const BACKEND_DISABLED = false;

interface FilterState {
  anio?: number;
  mes?: number; // 1-12
  estadoCierre?: number; // 1 abierta, 2 cerrada, 3 confirmada
}

interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

const formatDate = (iso?: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE');
  } catch {
    return iso;
  }
};

const getEstadoLabel = (estado?: number) => {
  switch (estado) {
    case 1: return 'Abierta';
    case 2: return 'Cerrada';
    case 3: return 'Confirmada';
    default: return 'Desconocido';
  }
};

const getEstadoColor = (estadoCierre?: number) => {
  switch (estadoCierre) {
    case 1: return 'text-green-600 bg-green-100';
    case 2: return 'text-yellow-600 bg-yellow-100';
    case 3: return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

const CajaMayorNew: React.FC = () => {
  const cajaService = CajaService.getInstance();

  // Estados principales
  const [cabeceras, setCabeceras] = useState<CajaMayorCabeceraResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showResumenModal, setShowResumenModal] = useState(false);
  const [cabeceraCreada, setCabeceraCreada] = useState<CajaMayorCabeceraResponse | null>(null);
  const [resumenTipos, setResumenTipos] = useState<any[]>([]);
  const [tiposCaja, setTiposCaja] = useState<any[]>([]);
  // Grid de detalles bajo la lista principal
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleTipos, setDetalleTipos] = useState<any[]>([]);
  const [detalleCabecera, setDetalleCabecera] = useState<CajaMayorCabeceraResponse | null>(null);
  // Modal de movimiento manual (Ingreso/Egreso)
  const [showMovModal, setShowMovModal] = useState(false);
  const [movModalState, setMovModalState] = useState<{ tipoMovimiento: 'I' | 'E'; idTipoCaja: number } | null>(null);
  // Modal de Registro de Compras (para Egresos)
  const [showRegistroComprasModal, setShowRegistroComprasModal] = useState(false);
  const [registroComprasIdTipoCaja, setRegistroComprasIdTipoCaja] = useState<number>(0);

  // Modal: Ver movimientos por tipo de caja
  const [showMovimientosModal, setShowMovimientosModal] = useState(false);
  const [movimientosLoading, setMovimientosLoading] = useState(false);
  const [movimientosAll, setMovimientosAll] = useState<any[]>([]);
  const [movimientosFiltroTipo, setMovimientosFiltroTipo] = useState<'T' | 'I' | 'E'>('T');
  const [movimientosPage, setMovimientosPage] = useState(1);
  const [movimientosTotalPages, setMovimientosTotalPages] = useState(1);
  const MOV_PAGE_SIZE = 10;
  const [movimientosTipoInfo, setMovimientosTipoInfo] = useState<{ idTipoCaja: number; nombreTipo: string; ingresos: number; egresos: number; balance: number } | null>(null);
  // Búsquedas locales (sin backend): número de comprobante y fecha
  const [movSearchNumero, setMovSearchNumero] = useState<string>('');
  const [movSearchFecha, setMovSearchFecha] = useState<string>('');

  // Modal gráfico por tipo de caja
  const [showGraficoModal, setShowGraficoModal] = useState(false);
  const graficoData = React.useMemo(() => {
    return (detalleTipos || []).map((r: any) => {
      const nombreTipo = tiposCaja.find(t => Number(t.idTipoCaja) === Number(r.idTipoCaja))?.nombreTipoCaja || `#${r.idTipoCaja}`;
      const ingresos = Number(r.totalIngresos ?? r.TotalIngresos ?? 0);
      const egresos = Number(r.totalEgresos ?? r.TotalEgresos ?? 0);
      const balance = ingresos - egresos;
      return { nombre: nombreTipo, ingresos, egresos, balance };
    });
  }, [detalleTipos, tiposCaja]);
  const openGraficoModal = () => setShowGraficoModal(true);
  const closeGraficoModal = () => setShowGraficoModal(false);

  const formatCurrencyPe = (n?: number) => Number(n || 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

  const CustomCashTypeTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const ingresosItem = payload.find((p: any) => p.dataKey === 'ingresos');
    const egresosItem = payload.find((p: any) => p.dataKey === 'egresos');
    const balanceItem = payload.find((p: any) => p.dataKey === 'balance');
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg px-4 py-3">
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">{label}</div>
        <div className="text-sm flex items-center gap-2"><span className="text-green-600 font-medium">Ingresos:</span><span className="text-green-700 dark:text-green-300">{formatCurrencyPe(ingresosItem?.value)}</span></div>
        <div className="text-sm flex items-center gap-2"><span className="text-red-600 font-medium">Egresos:</span><span className="text-red-700 dark:text-red-300">{formatCurrencyPe(egresosItem?.value)}</span></div>
        <div className="text-sm flex items-center gap-2"><span className="text-blue-600 font-medium">Balance:</span><span className="text-blue-700 dark:text-blue-300">{formatCurrencyPe(balanceItem?.value)}</span></div>
      </div>
    );
  };

  // Forma personalizada para efecto 3D en barras
  const ThreeDBar: React.FC<any> = (props) => {
    const { x, y, width, height, fill } = props;
    const side = Math.max(4, Math.min(8, Math.round(width * 0.12)));
    // Inferir familia por el fill (gradiente id)
    const isGreen = typeof fill === 'string' && fill.includes('ingresosGradient');
    const isRed = typeof fill === 'string' && fill.includes('egresosGradient');
    const sideColor = isGreen ? '#15803d' : isRed ? '#b91c1c' : '#1e40af';
    const topHighlight = 'rgba(255,255,255,0.18)';
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} rx={8} ry={8} fill={fill} filter="url(#barShadow)" />
        {/* Cara lateral derecha */}
        <polygon
          points={`${x+width},${y} ${x+width+side},${y-side} ${x+width+side},${y+height-side} ${x+width},${y+height}`}
          fill={sideColor}
          opacity={0.35}
        />
        {/* Cara superior */}
        <polygon
          points={`${x},${y} ${x+width},${y} ${x+width+side},${y-side} ${x+side},${y-side}`}
          fill={topHighlight}
        />
      </g>
    );
  };

  // Valores de año y mes actuales (deben declararse antes de usarse)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Formulario de creación de cierre (solo maquetación, sin llamadas)
  const [createForm, setCreateForm] = useState({
    anio: currentYear,
    mes: currentMonth,
    fechaInicio: '',
    fechaFin: '',
    observaciones: ''
  });

  // Filtros y paginación
  const [filters, setFilters] = useState<FilterState>({
    anio: currentYear,
    mes: currentMonth,
    estadoCierre: 2 // Cerrada por defecto
  });

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 5,
    totalPages: 0,
    totalRecords: 0
  });

  // Meses
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

  const estadosOptions = React.useMemo(() => [
    { value: 0, label: 'Todos los estados' },
    { value: 1, label: 'Abierta' },
    { value: 2, label: 'Cerrada' },
    { value: 3, label: 'Confirmada' }
  ], []);

  const loadCabeceras = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (BACKEND_DISABLED) {
        setCabeceras([]);
        setLoading(false);
        ToastAlerts.info({
          title: 'Backend deshabilitado',
          message: 'Las llamadas de CajaMayor (cabeceras) están bloqueadas temporalmente.'
        });
        return;
      }

      if (!filters.anio) {
        setError('El año es obligatorio para consultar las cajas mayor');
        ToastAlerts.warning({
          title: 'Filtro requerido',
          message: 'El año es obligatorio para consultar las cajas mayor'
        });
        return;
      }

      const request: GetListCabeceraRequest = {
        anio: String(filters.anio),
        mes: filters.mes ? String(filters.mes).padStart(2, '0') : undefined,
        estadoCierre: filters.estadoCierre && filters.estadoCierre > 0 ? filters.estadoCierre : undefined,
        page: pagination.page,
        pageSize: pagination.pageSize,
      };

      const resp = await cajaService.getListCabecera(request);
      const data = Array.isArray(resp.objModel) ? resp.objModel : [];
      setCabeceras(data);

      const totalRecords = resp.objPaginated?.total ?? data.length;
      const totalPages = resp.objPaginated?.totalPages ?? Math.ceil(totalRecords / pagination.pageSize);

      setPagination(prev => ({
        ...prev,
        totalRecords,
        totalPages
      }));

      if (data.length === 0) {
        const monthLabel = filters.mes ? (months.find(m => m.value === filters.mes)?.label || '') : '';
        ToastAlerts.info({
          message: `No se encontraron cabeceras ${filters.estadoCierre === 2 ? 'cerradas ' : ''}para ${filters.anio}${filters.mes ? ` - ${monthLabel}` : ''}`,
          duration: 3000
        });
      }
    } catch (e) {
      setError('Error al cargar cabeceras');
      ToastAlerts.error({
        title: 'Error de conexión',
        message: 'No se pudieron cargar las cabeceras. Verifique su conexión a internet.'
      });
    } finally {
      setLoading(false);
    }
  }, [filters.anio, filters.mes, filters.estadoCierre, pagination.page, pagination.pageSize, months]);

  useEffect(() => {
    loadCabeceras();
  }, [loadCabeceras]);

  // Cargar catálogo de tipos de caja al iniciar
  useEffect(() => {
    const fetchTiposCaja = async () => {
      try {
        if (BACKEND_DISABLED) return;
        const resp = await cajaService.getTiposCaja({ includeInactive: false });
        const list = Array.isArray(resp.objModel) ? resp.objModel : [];
        setTiposCaja(list);
      } catch {
        // Silenciar error y permitir fallback de mostrar id
      }
    };
    fetchTiposCaja();
  }, []);

  const applyFilters = (newFilters: FilterState) => {
    const filtersWithDefaults = {
      ...newFilters,
      anio: newFilters.anio || currentYear,
      mes: newFilters.mes || currentMonth,
      estadoCierre: newFilters.estadoCierre ?? 2
    };
    setFilters(filtersWithDefaults);
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({ anio: currentYear, mes: currentMonth, estadoCierre: 2 });
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFilters(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Abrir grid de detalles para una cabecera específica
  const openDetalleGrid = async (cab: CajaMayorCabeceraResponse) => {
    try {
      setDetalleVisible(true);
      setDetalleLoading(true);
      setDetalleCabecera(cab);

      if (BACKEND_DISABLED) {
        setDetalleTipos([]);
        ToastAlerts.info({ title: 'Backend deshabilitado', message: 'No se puede cargar el detalle de tipos de caja.' });
        return;
      }

      const userId = getInsertaIdUsuario();
      const resp = await cajaService.resumenTipos(cab.idCajaMayorCierre, {
        idCajaMayorCierre: cab.idCajaMayorCierre,
        actualizaIdUsuario: userId,
      });
      const list = Array.isArray(resp?.objModel) ? resp.objModel : [];
      setDetalleTipos(list);
    } catch (e) {
      ToastAlerts.error({ title: 'Error al cargar detalle', message: 'No se pudo cargar el detalle por tipo de caja.' });
    } finally {
      setDetalleLoading(false);
    }
  };

  const closeDetalleGrid = () => {
    setDetalleVisible(false);
    setDetalleCabecera(null);
    setDetalleTipos([]);
  };

  // Utilidad para calcular rango de fechas por año/mes (hoisted para evitar TDZ)
  function calcRange(anioNum: number, mesNum: number) {
    const start = new Date(anioNum, mesNum - 1, 1);
    const end = new Date(anioNum, mesNum, 0);
    const toIsoDate = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().split('T')[0];
    return { inicio: toIsoDate(start), fin: toIsoDate(end) };
  }

  // Cargar página de movimientos desde backend (paginación y filtro de tipo en servidor)
  const fetchMovimientos = useCallback(async (pageArg?: number, tipoArg?: 'T' | 'I' | 'E', idTipoCajaOverride?: number) => {
    if (!detalleCabecera) return;
    try {
      setMovimientosLoading(true);
      const idTipoCajaNum = Number((idTipoCajaOverride ?? movimientosTipoInfo?.idTipoCaja) ?? 0);
      if (!idTipoCajaNum) {
        setMovimientosLoading(false);
        return;
      }
      // Calcular el rango de fechas del período seleccionado (anio/mes de la cabecera)
      const anioNum = Number((detalleCabecera as any).anio ?? (detalleCabecera as any).Anio);
      const mesNum = Number((detalleCabecera as any).mes ?? (detalleCabecera as any).Mes);
      const { inicio, fin } = calcRange(anioNum, mesNum);

      const page = pageArg ?? movimientosPage;
      const tipoSel = tipoArg ?? movimientosFiltroTipo;
      const tipoMovimientoParam = tipoSel === 'T' ? undefined : (tipoSel === 'I' ? 'I' : 'E');

      const response = await cajaService.getMovimientos(detalleCabecera.idCajaMayorCierre, {
        idTipoCaja: idTipoCajaNum,
        tipoMovimiento: tipoMovimientoParam,
        fechaDesde: inicio,
        fechaHasta: fin,
        // Acordado: sin paginación en backend
        sinPaginacion: true,
      });

      const list = Array.isArray(response?.objModel) ? response.objModel : [];
      setMovimientosAll(list);
      // Sin paginación del backend: calcular páginas locales según MOV_PAGE_SIZE
      setMovimientosTotalPages(Math.max(1, Math.ceil(list.length / MOV_PAGE_SIZE)));
      // Reiniciar filtros locales al cargar nuevos datos
      setMovSearchNumero('');
      setMovSearchFecha(inicio);
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'No se pudo obtener los movimientos del cierre.';
      ToastAlerts.error({ title: 'Error al cargar movimientos', message: msg });
    } finally {
      setMovimientosLoading(false);
    }
  }, [detalleCabecera, movimientosTipoInfo, movimientosPage, movimientosFiltroTipo, cajaService, calcRange]);

  // Lista filtrada localmente por número y fecha
  const movimientosFiltered = React.useMemo(() => {
    let data = Array.isArray(movimientosAll) ? movimientosAll : [];
    const numeroQ = movSearchNumero.trim().toLowerCase();
    const fechaQ = movSearchFecha.trim(); // formato esperado: YYYY-MM-DD

    if (numeroQ) {
      data = data.filter((m: any) => {
        const num = (m.numeroDocumento ?? m.NumeroDocumento ?? m.correlativoDocumento ?? m.CorrelativoDocumento ?? '').toString().toLowerCase();
        return num.includes(numeroQ);
      });
    }

    if (fechaQ) {
      data = data.filter((m: any) => {
        const iso = (m.fechaRegistro ?? m.FechaRegistro ?? m.fechaMovimiento ?? m.t_FechaMovimiento ?? '') as string;
        try {
          const day = new Date(iso).toISOString().split('T')[0];
          return day === fechaQ;
        } catch {
          return false;
        }
      });
    }

    return data;
  }, [movimientosAll, movSearchNumero, movSearchFecha]);

  // Al cambiar filtros locales, regresar a página 1
  useEffect(() => {
    setMovimientosPage(1);
  }, [movSearchNumero, movSearchFecha]);

  // Abrir modal de movimientos (consulta por combos requeridos de origen/tipoMovimiento y filtra por idTipoCaja)
  const openMovimientosModal = async (rowResumen: any) => {
    if (!detalleCabecera) return;
    try {
      setMovimientosLoading(true);
      const nombreTipo = tiposCaja.find(t => Number(t.idTipoCaja) === Number(rowResumen.idTipoCaja))?.nombreTipoCaja || `#${rowResumen.idTipoCaja}`;
      const ingresos = Number(rowResumen.totalIngresos ?? rowResumen.TotalIngresos ?? 0);
      const egresos = Number(rowResumen.totalEgresos ?? rowResumen.TotalEgresos ?? 0);
      const balance = ingresos - egresos;
      const idTipoCajaNum = Number(rowResumen.idTipoCaja);
      setMovimientosTipoInfo({ idTipoCaja: idTipoCajaNum, nombreTipo, ingresos, egresos, balance });
      setMovimientosFiltroTipo('T');
      setMovimientosPage(1);

      if (BACKEND_DISABLED) {
        ToastAlerts.info({ title: 'Backend deshabilitado', message: 'No se puede cargar movimientos ahora.' });
        setMovimientosAll([]);
        setMovimientosTotalPages(1);
        setShowMovimientosModal(true);
        return;
      }
      setShowMovimientosModal(true);
      // Cargar primera página (Todos) desde backend
      await fetchMovimientos(1, 'T', idTipoCajaNum);
    } catch (e: any) {
      // Mostrar detalle si el backend valida origen/tipoMovimiento como requeridos
      const msg = typeof e?.message === 'string' ? e.message : 'No se pudo obtener los movimientos del cierre.';
      ToastAlerts.error({ title: 'Error al cargar movimientos', message: msg });
    } finally {
      setMovimientosLoading(false);
    }
  };

  const closeMovimientosModal = () => {
    setShowMovimientosModal(false);
    setMovimientosAll([]);
    setMovimientosFiltroTipo('T');
    setMovimientosPage(1);
    setMovimientosTipoInfo(null);
  };

  // Exportar PDF del modal de movimientos
  const handleExportMovimientosPDF = async () => {
    try {
      if (!detalleCabecera || !movimientosTipoInfo) {
        ToastAlerts.error({ title: 'Exportación no disponible', message: 'Falta información de cabecera o tipo de caja.' });
        return;
      }
      const anioNum = Number((detalleCabecera as any).anio ?? (detalleCabecera as any).Anio);
      const mesNum = Number((detalleCabecera as any).mes ?? (detalleCabecera as any).Mes);
      const { inicio, fin } = calcRange(anioNum, mesNum);

      await ExportService.exportMovimientosModalToPDF(
        {
          nombreTipo: movimientosTipoInfo.nombreTipo,
          ingresos: movimientosTipoInfo.ingresos,
          egresos: movimientosTipoInfo.egresos,
          balance: movimientosTipoInfo.balance,
          periodo: { inicio, fin },
          idCajaMayorCierre: Number((detalleCabecera as any).idCajaMayorCierre ?? (detalleCabecera as any).IdCajaMayorCierre),
          idTipoCaja: movimientosTipoInfo.idTipoCaja
        },
        movimientosAll,
        { filename: `movimientos_${movimientosTipoInfo.nombreTipo.toLowerCase().replace(/\s+/g, '_')}_${anioNum}_${mesNum}` }
      );
      ToastAlerts.success('Archivo PDF generado correctamente');
    } catch (error) {
      console.error('Error exportando PDF de movimientos:', error);
      ToastAlerts.error('Error al generar archivo PDF');
    }
  };

  

  // Abrir modal de creación y setear defaults desde filtros
  const openCreateModal = () => {
    const anioNum = filters.anio || currentYear;
    const mesNum = filters.mes || currentMonth;
    const { inicio, fin } = calcRange(anioNum, mesNum);
    setCreateForm({
      anio: anioNum,
      mes: mesNum,
      fechaInicio: inicio,
      fechaFin: fin,
      observaciones: ''
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => setShowCreateModal(false);

  const handleCreateInput = (field: string, value: string | number) => {
    // Actualiza el formulario y recalcula el rango si cambian año/mes
    setCreateForm(prev => {
      const updated = { ...prev, [field]: value } as typeof prev;
      if (field === 'anio' || field === 'mes') {
        const anioNum = field === 'anio' ? Number(value) : prevOrDefault(updated.anio, currentYear);
        const mesNum = field === 'mes' ? Number(value) : prevOrDefault(updated.mes, currentMonth);
        const { inicio, fin } = calcRange(anioNum, mesNum);
        return { ...updated, fechaInicio: inicio, fechaFin: fin };
      }
      return updated;
    });
  };

  const prevOrDefault = (val: number, d: number) => (val && val > 0 ? val : d);

  const handleSubmitCreate = async () => {
    try {
      if (BACKEND_DISABLED) {
        ToastAlerts.info({
          title: 'Backend deshabilitado',
          message: 'La creación de cierre está temporalmente bloqueada.'
        });
        return;
      }

      // Validaciones básicas
      if (!createForm.anio || !createForm.mes) {
        ToastAlerts.warning({
          title: 'Campos requeridos',
          message: 'Año y mes son obligatorios para crear el cierre.'
        });
        return;
      }

      // Observaciones obligatorio
      const observacionesTrim = (createForm.observaciones || '').trim();
      if (!observacionesTrim) {
        ToastAlerts.warning({
          title: 'Campo requerido',
          message: 'Observaciones es obligatorio para crear el cierre.'
        });
        return;
      }

      // Validación por periodo: seleccionado vs concurrente (actual)
      const selectedPeriod = (createForm.anio * 100) + createForm.mes;
      const currentPeriod = (currentYear * 100) + currentMonth;
      if (selectedPeriod > currentPeriod) {
        ToastAlerts.error({
          title: 'Período no permitido',
          message: 'No se puede generar cierre para un período futuro.'
        });
        return;
      }

      // Usuario
      const userId = getInsertaIdUsuario();
      if (!userId) {
        ToastAlerts.error({
          title: 'Sesión requerida',
          message: 'No se pudo obtener el usuario autenticado. Inicie sesión nuevamente.'
        });
        return;
      }

      // Payload para el backend
      const payload = {
        anio: String(createForm.anio),
        mes: String(createForm.mes).padStart(2, '0'),
        fechaInicio: createForm.fechaInicio,
        fechaFin: createForm.fechaFin,
        observaciones: observacionesTrim,
        insertaIdUsuario: userId,
      };
      // Función auxiliar para crear y orquestar (evita duplicación)
      const createAndOrchestrate = async () => {
        setCreateLoading(true);
        try {
          const resp = await cajaService.cierreCreateUpdate(payload);
          const created = resp.objModel;

          ToastAlerts.success({
            title: 'Cierre creado',
            message: `Se creó el cierre de ${months.find(m => m.value === Number(created.mes))?.label || created.mes} ${created.anio}.`
          });

          // Orquestación según periodo
          if (created?.idCajaMayorCierre) {
            if (selectedPeriod < currentPeriod) {
              try {
                const genIng = await cajaService.generarIngresosDesdeCobranzas(created.idCajaMayorCierre, {
                  insertaIdUsuario: userId,
                });
                const ingresosGenerados = Array.isArray(genIng?.objModel) ? genIng.objModel : [];
                ToastAlerts.success({ title: 'Ingresos generados', message: `Ingresos: ${ingresosGenerados.length}.` });

                const genEgr = await cajaService.generarEgresosDesdeVentas(created.idCajaMayorCierre, {
                  insertaIdUsuario: userId,
                } as any);
                const egresosGenerados = Array.isArray(genEgr?.objModel) ? genEgr.objModel : [];
                ToastAlerts.success({ title: 'Egresos generados', message: `Egresos: ${egresosGenerados.length}.` });

                const cabResp = await cajaService.getCabecera(created.idCajaMayorCierre);
                const cab = cabResp?.objModel || created;
                setCabeceraCreada(cab);

                const resumenResp = await cajaService.resumenTipos(created.idCajaMayorCierre, {
                  idCajaMayorCierre: created.idCajaMayorCierre,
                  actualizaIdUsuario: userId,
                });
                const resumen = Array.isArray(resumenResp?.objModel) ? resumenResp.objModel : [];
                setResumenTipos(resumen);
                setShowResumenModal(true);
              } catch (err) {
                ToastAlerts.error({ title: 'Orquestación de cierre', message: 'Ocurrió un error generando ingresos/egresos o cargando el resumen.' });
              }
            } else {
              // Igual al período concurrente: creación permitida, recálculo incremental disponible desde el botón en el detalle
            }
          }

          setShowCreateModal(false);
          await loadCabeceras();
        } finally {
          setCreateLoading(false);
        }
      };

      // Verificar existencia de cierre previo para el período
      const existsResp = await cajaService.checkCierreExists({
        anio: payload.anio,
        mes: payload.mes,
      });
      const existsModel = existsResp?.objModel || {};
      const alreadyExists = Boolean(existsModel.exists ?? existsModel.Exists);
      const existingId = existsModel.idCajaMayorCierre ?? existsModel.IdCajaMayorCierre;

      if (alreadyExists && existingId) {
        const mesLabel = months.find(m => m.value === Number(payload.mes))?.label || payload.mes;
        ToastAlerts.confirmation({
          title: 'Confirmar recalculo y borrado físico',
          message: `Ya existe un cierre para ${mesLabel} ${payload.anio}. Esta acción realizará un borrado físico del cierre y sus movimientos, y lo recreará. ¿Desea continuar?`,
          confirmText: 'Sí, borrar y recalcular',
          cancelText: 'Cancelar',
          confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
          cancelButtonClass: 'bg-gray-300 hover:bg-gray-400 text-gray-800',
          onConfirm: async () => {
            const loadingId = ToastAlerts.loading('Eliminando cierre existente y recalculando...');
            try {
              setCreateLoading(true);
              const delResp = await cajaService.deleteCajaMayorCierre(existingId, { eliminaIdUsuario: userId });
              const rows = delResp?.objModel?.rowsAffected ?? delResp?.objModel?.RowsAffected ?? 0;
              const msg = delResp?.objModel?.mensaje ?? delResp?.objModel?.Mensaje ?? 'Operación completada';
              if (rows <= 0) {
                ToastAlerts.promiseToError(loadingId, {
                  title: 'No se eliminó el cierre',
                  message: msg || 'El cierre no fue encontrado o no se pudo eliminar.'
                });
                setCreateLoading(false);
                return;
              }

              // Convertir loading a éxito preliminar y continuar con creación
              ToastAlerts.promiseToSuccess(loadingId, {
                title: 'Cierre eliminado',
                message: `Se eliminó el cierre existente de ${mesLabel} ${payload.anio}.`
              });

              await createAndOrchestrate();
            } catch (err) {
              const errLoadingId = ToastAlerts.loading('');
              ToastAlerts.promiseToError(errLoadingId, {
                title: 'Error al eliminar',
                message: 'No se pudo eliminar el cierre existente.'
              });
              setCreateLoading(false);
            }
          },
          onCancel: () => {
            // No hacer nada, cancelar flujo
          }
        });
      } else {
        // No existe cierre: crear directamente
        await createAndOrchestrate();
      }
    } catch (e) {
      ToastAlerts.error({
        title: 'Error al crear cierre',
        message: 'No se pudo crear el cierre mensual. Verifique su conexión o intente nuevamente.'
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Caja Mayor</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Listado de cabeceras de cierre mensual
            {filters.anio && (
              <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm font-medium">
                Año {filters.anio}{filters.mes ? ` - ${months.find(m => m.value === filters.mes)?.label}` : ''}
              </span>
            )}
          </p>
        </div>

      <div className="flex gap-2">
          <motion.button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <PlusCircle className="w-4 h-4 mr-2 inline" />
            Nuevo cierre de caja
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Año */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  value={filters.anio || ''}
                  onChange={e => setFilters(prev => ({ ...prev, anio: Number(e.target.value) }))}
                  min={2000}
                  max={2099}
                />
              </div>
              {/* Mes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mes</label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  value={filters.mes || ''}
                  onChange={e => setFilters(prev => ({ ...prev, mes: Number(e.target.value) }))}
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  value={filters.estadoCierre ?? 2}
                  onChange={e => setFilters(prev => ({ ...prev, estadoCierre: Number(e.target.value) }))}
                >
                  {estadosOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <motion.button
                onClick={() => applyFilters(filters)}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Aplicar Filtros
              </motion.button>
              <motion.button
                onClick={() => clearFilters()}
                className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Limpiar
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid de cabeceras */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header de la tabla */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Cierres de Cajas {filters.estadoCierre === 2 ? '(Cerradas)' : ''}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Período</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Rango</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Saldo Inicial</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ingresos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Egresos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Saldo Final</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Cargando...</td>
                </tr>
              ) : cabeceras.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Sin registros</td>
                </tr>
              ) : (
                cabeceras.map((c) => {
                  const mesLabel = months.find(m => m.value === Number(c.mes))?.label || c.mes;
                  return (
                    <tr key={c.idCajaMayorCierre} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{mesLabel} / {c.anio}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDate(c.fechaInicio)} - {formatDate(c.fechaFin)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{c.saldoInicialTotal?.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 dark:text-green-400">{c.totalIngresosTotal?.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 dark:text-red-400">{c.totalEgresosTotal?.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{c.saldoFinalTotal?.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(c.estadoCierre)}`}>
                          {getEstadoLabel(c.estadoCierre)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={() => openDetalleGrid(c)}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginador */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Página {pagination.page} de {Math.max(pagination.totalPages, 1)}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="w-4 h-4 inline mr-1" /> Anterior
            </button>
            <button
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Siguiente <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Detalle por tipo de caja bajo la lista principal */}
      {detalleVisible && detalleCabecera && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Detalle por tipo de caja</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Período: {months.find(m => m.value === Number(detalleCabecera.mes))?.label || detalleCabecera.mes} / {detalleCabecera.anio}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={openGraficoModal}
                title="Ver gráfico comparativo"
              >
                <BarChart3 className="w-4 h-4 inline mr-1" /> Ver gráfico
              </button>
              <button
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={async () => {
                  if (!detalleCabecera) return;
                  const svc = CajaService.getInstance();
                  const periodoStr = `${detalleCabecera.anio}-${String(detalleCabecera.mes).padStart(2,'0')}`;
                  const firstDay = new Date(Number(detalleCabecera.anio), Number(detalleCabecera.mes)-1, 1);
                  const lastDay = new Date(Number(detalleCabecera.anio), Number(detalleCabecera.mes), 0);
                  const today = new Date();
                  const endDate = (today > lastDay) ? lastDay : today;
                  const confirmMsg = `Se recalcularán ingresos (cobranzas) y egresos (ventas) del periodo ${periodoStr} desde ${firstDay.toLocaleDateString('es-PE')} hasta ${endDate.toLocaleDateString('es-PE')}. ¿Desea continuar?`;
                  if (!confirm(confirmMsg)) return;
                  const loadingId = ToastAlerts.loading('');
                  try {
                    await svc.recalcularIncremental(detalleCabecera.idCajaMayorCierre, { defaultIdTipoCaja: Number(detalleCabecera.idTipoCajaDefault || 1), preview: false });
                    ToastAlerts.promiseToSuccess(loadingId, { title: 'Recalculo completado', message: 'Se actualizaron movimientos y totales del cierre.' });
                    await reloadDetalleCabecera();
                  } catch (e) {
                    ToastAlerts.promiseToError(loadingId, { title: 'Error al recalcular', message: 'No se pudo completar el recálculo incremental.' });
                  }
                }}
                title="Recalcular ahora"
              >
                <RefreshCw className="w-4 h-4 inline mr-1" /> Recalcular ahora
              </button>
              <button
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={closeDetalleGrid}
              >
                <X className="w-4 h-4 inline mr-1" /> Cerrar detalle
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo Caja</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ingresos</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Egresos</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {detalleLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Cargando...</td>
                  </tr>
                ) : detalleTipos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Sin datos</td>
                  </tr>
                ) : (
                  detalleTipos.map((r: any, idx: number) => {
                    const nombreTipo = tiposCaja.find(t => Number(t.idTipoCaja) === Number(r.idTipoCaja))?.nombreTipoCaja || `#${r.idTipoCaja}`;
                    const ingresos = Number(r.totalIngresos ?? r.TotalIngresos ?? 0);
                    const egresos = Number(r.totalEgresos ?? r.TotalEgresos ?? 0);
                    const balance = (ingresos - egresos);
                    return (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{nombreTipo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 dark:text-green-400 text-right">{ingresos.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 dark:text-red-400 text-right">{egresos.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{balance.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {/* Ingreso */}
                            <button
                              title="Agregar ingreso"
                              aria-label="Agregar ingreso"
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                              onClick={() => {
                                setMovModalState({ tipoMovimiento: 'I', idTipoCaja: Number(r.idTipoCaja) });
                                setShowMovModal(true);
                              }}
                            >
                              <PlusCircle className="w-5 h-5" />
                            </button>

                            {/* Egreso - Abre modal de Registro de Compras */}
                            <button
                              title="Agregar egreso (Registro de Compras)"
                              aria-label="Agregar egreso"
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                              onClick={() => {
                                setRegistroComprasIdTipoCaja(Number(r.idTipoCaja));
                                setShowRegistroComprasModal(true);
                              }}
                            >
                              <MinusCircle className="w-5 h-5" />
                            </button>

                            {/* Ver detalle */}
                            <button
                              title="Ver detalle"
                              aria-label="Ver detalle"
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={() => openMovimientosModal(r)}
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Ver movimientos por tipo de caja */}
      <AnimatePresence>
        {showMovimientosModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-[95vw] max-w-[95vw] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-primary text-white rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">
                    Movimientos – {movimientosTipoInfo?.nombreTipo || ''}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    onClick={handleExportMovimientosPDF}
                    disabled={!movimientosTipoInfo || !movimientosAll || movimientosAll.length === 0}
                    title="Exportar PDF"
                  >
                    <Download className="w-4 h-4" />
                    Exportar PDF
                  </button>
                  <button
                    className="p-2 rounded-md hover:bg-primary-dark"
                    onClick={closeMovimientosModal}
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4 space-y-4">
                {/* Card resumen */}
                {movimientosTipoInfo && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Tipo de caja</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{movimientosTipoInfo.nombreTipo}</div>
                    </div>
                    <div className="p-4 rounded-md border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Ingresos</span>
                        <ArrowUpCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-sm font-medium text-green-700 dark:text-green-400">{movimientosTipoInfo.ingresos.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</div>
                    </div>
                    <div className="p-4 rounded-md border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Egresos</span>
                        <ArrowDownCircle className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="text-sm font-medium text-red-700 dark:text-red-400">{movimientosTipoInfo.egresos.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</div>
                    </div>
                    <div className="p-4 rounded-md border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Balance</span>
                        <Calculator className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{movimientosTipoInfo.balance.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</div>
                    </div>
                  </div>
                )}

                {/* Filtros */}
                <div className="flex items-center gap-6">
                  <div className="text-sm text-gray-700 dark:text-gray-300">Mostrar:</div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="movTipo"
                      checked={movimientosFiltroTipo === 'T'}
                      onChange={() => { setMovimientosFiltroTipo('T'); setMovimientosPage(1); fetchMovimientos(1, 'T'); }}
                    />
                    Todos
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="movTipo"
                      checked={movimientosFiltroTipo === 'I'}
                      onChange={() => { setMovimientosFiltroTipo('I'); setMovimientosPage(1); fetchMovimientos(1, 'I'); }}
                    />
                    Ingresos
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="movTipo"
                      checked={movimientosFiltroTipo === 'E'}
                      onChange={() => { setMovimientosFiltroTipo('E'); setMovimientosPage(1); fetchMovimientos(1, 'E'); }}
                    />
                    Egresos
                  </label>
                  {/* Búsqueda local por número de comprobante */}
                  <div className="flex items-center gap-2 ml-6">
                    <label className="text-sm text-gray-700 dark:text-gray-300">N° Comprobante:</label>
                    <input
                      type="text"
                      value={movSearchNumero}
                      onChange={(e) => setMovSearchNumero(e.target.value)}
                      placeholder="Ej. F003-00001096"
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
                    />
                  </div>
                  {/* Búsqueda local por fecha */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300">Fecha:</label>
                    <input
                      type="date"
                      value={movSearchFecha}
                      min={detalleCabecera ? (() => { const anioNum = Number((detalleCabecera as any).anio ?? (detalleCabecera as any).Anio); const mesNum = Number((detalleCabecera as any).mes ?? (detalleCabecera as any).Mes); return calcRange(anioNum, mesNum).inicio; })() : undefined}
                      max={detalleCabecera ? (() => { const anioNum = Number((detalleCabecera as any).anio ?? (detalleCabecera as any).Anio); const mesNum = Number((detalleCabecera as any).mes ?? (detalleCabecera as any).Mes); return calcRange(anioNum, mesNum).fin; })() : undefined}
                      onChange={(e) => setMovSearchFecha(e.target.value)}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
                    />
                  </div>
                </div>

                {/* Grid de movimientos */}
                {(() => {
                  const page = movimientosPage;
                  const totalPages = Math.max(1, Math.ceil(movimientosFiltered.length / MOV_PAGE_SIZE));
                  const startIdx = (page - 1) * MOV_PAGE_SIZE;
                  const endIdx = startIdx + MOV_PAGE_SIZE;
                  const items = movimientosFiltered.slice(startIdx, endIdx);

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Concepto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Documento</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Origen</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {movimientosLoading ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center">
                                <div className="flex justify-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                              </td>
                            </tr>
                          ) : items.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Sin movimientos</td>
                            </tr>
                          ) : (
                            items.map((m: any, idx: number) => {
                              const fechaIso = m.fechaRegistro ?? m.FechaRegistro ?? m.fechaMovimiento ?? m.t_FechaMovimiento;
                              const tipo = m.tipoMovimiento ?? m.TipoMovimiento;
                const conceptoSrc = m.conceptoMovimiento ?? m.ConceptoMovimiento ?? m.v_ConceptoMovimiento ?? '';
                const concepto = (conceptoSrc || '').toString().trim().substring(0, 100);
        const docNumero = m.numeroDocumento ?? m.NumeroDocumento;
        const docCodigo = m.codigoDocumento ?? m.CodigoDocumento;
        // Mostrar solo el número de documento; ya incluye la serie si corresponde
        const documento = docNumero ?? docCodigo ?? '';
                              const origen = m.origen ?? m.Origen ?? '';
                              const total = Number(m.total ?? m.Total ?? m.d_Total ?? 0);
                              const tipoClass = tipo === 'I' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400';
                              return (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDate(fechaIso)}</td>
                                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${tipoClass}`}>{tipo === 'I' ? 'Ingreso' : 'Egreso'}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{concepto}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{documento}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{origen}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{total.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>

                      {/* Paginador */}
                      <div className="px-2 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Página {page} de {Math.max(totalPages, 1)}</div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                            onClick={() => { const newPage = Math.max(1, page - 1); setMovimientosPage(newPage); }}
                            disabled={page <= 1}
                          >
                            <ChevronLeft className="w-4 h-4 inline mr-1" /> Anterior
                          </button>
                          <button
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                            onClick={() => { const newPage = Math.min(totalPages, page + 1); setMovimientosPage(newPage); }}
                            disabled={page >= totalPages}
                          >
                            Siguiente <ChevronRight className="w-4 h-4 inline ml-1" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Gráfico por tipo de caja */}
      <AnimatePresence>
        {showGraficoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-[95vw] max-w-[95vw] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-primary text-white rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">
                    Comparativo por tipo de caja
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-80">
                    {detalleCabecera ? `${months.find(m => m.value === Number((detalleCabecera as any).mes))?.label || (detalleCabecera as any).mes} / ${(detalleCabecera as any).anio}` : ''}
                  </span>
                  <button
                    className="p-2 rounded-md hover:bg-primary-dark"
                    onClick={closeGraficoModal}
                    title="Cerrar"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                {graficoData && graficoData.length > 0 ? (
                  <div className="h-[75vh]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={graficoData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        {/* Filtros y gradientes para efecto 3D */}
                        <defs>
                          <linearGradient id="ingresosGradient" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#16a34a" />
                            <stop offset="100%" stopColor="#22c55e" />
                          </linearGradient>
                          <linearGradient id="egresosGradient" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#dc2626" />
                            <stop offset="100%" stopColor="#ef4444" />
                          </linearGradient>
                          <linearGradient id="balanceGradient" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#1d4ed8" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                          <filter id="barShadow" x="-20%" y="-20%" width="140%" height="200%">
                            <feOffset dx="0" dy="2" />
                            <feGaussianBlur stdDeviation="2" result="offset-blur" />
                            <feFlood floodColor="#000" floodOpacity="0.15" />
                            <feComposite operator="in" in2="offset-blur" />
                            <feMerge>
                              <feMergeNode />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="nombre" 
                          interval={0}
                          height={70}
                          tickMargin={12}
                          tick={{ fill: '#374151', fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          tickFormatter={(v: any) => Number(v).toLocaleString('es-PE')}
                        />
                        <Tooltip 
                          content={<CustomCashTypeTooltip />}
                          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        />
                        <Legend wrapperStyle={{ color: '#374151' }} />
                        {/* Doble grosor y efecto 3D con forma personalizada */}
                        <Bar 
                          dataKey="ingresos" 
                          name="Ingresos" 
                          fill="url(#ingresosGradient)" 
                          barSize={56}
                          isAnimationActive 
                          animationDuration={450}
                          shape={(p: any) => <ThreeDBar {...p} />}
                        />
                        <Bar 
                          dataKey="egresos" 
                          name="Egresos" 
                          fill="url(#egresosGradient)" 
                          barSize={56}
                          isAnimationActive 
                          animationDuration={450}
                          shape={(p: any) => <ThreeDBar {...p} />}
                        />
                        <Bar 
                          dataKey="balance" 
                          name="Balance" 
                          fill="url(#balanceGradient)" 
                          barSize={56}
                          isAnimationActive 
                          animationDuration={450}
                          shape={(p: any) => <ThreeDBar {...p} />}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-600 dark:text-gray-300">
                    No hay datos para graficar.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Nuevo cierre de caja (maquetación) */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-primary text-white rounded-t-lg flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Nuevo cierre de caja</h3>
                <button
                  className="p-2 rounded-md hover:bg-primary-dark"
                  onClick={closeCreateModal}
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-4 space-y-4">
                {/* Año y Mes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                      value={createForm.anio}
                      min={2000}
                      max={2099}
                      onChange={e => handleCreateInput('anio', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mes</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                      value={createForm.mes}
                      onChange={e => handleCreateInput('mes', Number(e.target.value))}
                    >
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Badge de periodo removido para reducir redundancia visual */}
                </div>

                {/* Campos ocultos: manejar fechas internamente */}
                <input type="hidden" value={createForm.fechaInicio} readOnly />
                <input type="hidden" value={createForm.fechaFin} readOnly />

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                    placeholder="Notas del cierre (obligatorio)"
                    value={createForm.observaciones}
                    required
                    onChange={e => handleCreateInput('observaciones', e.target.value)}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <motion.button
                  onClick={closeCreateModal}
                  className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={createLoading}
                >
                  <X className="w-4 h-4 mr-2 inline" />
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={handleSubmitCreate}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={createLoading}
                >
                  {createLoading ? (
                    <span className="inline-flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creando...
                    </span>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2 inline" />
                      Crear cierre
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Movimiento manual (Solo para Ingresos ahora) */}
      {detalleVisible && detalleCabecera && movModalState && (
        <MovimientoManualModal
          isOpen={showMovModal}
          tipoMovimiento={movModalState.tipoMovimiento}
          idCajaMayorCierre={Number(detalleCabecera.idCajaMayorCierre)}
          idTipoCaja={movModalState.idTipoCaja}
          fechaMin={(() => { const anioNum = Number((detalleCabecera as any).anio ?? (detalleCabecera as any).Anio); const mesNum = Number((detalleCabecera as any).mes ?? (detalleCabecera as any).Mes); const { inicio } = calcRange(anioNum, mesNum); return inicio; })()}
          fechaMax={(() => { const anioNum = Number((detalleCabecera as any).anio ?? (detalleCabecera as any).Anio); const mesNum = Number((detalleCabecera as any).mes ?? (detalleCabecera as any).Mes); const { fin } = calcRange(anioNum, mesNum); return fin; })()}
          origenDefault={'manual'}
          onClose={() => setShowMovModal(false)}
          onSaved={async () => {
            try {
              setShowMovModal(false);
              const userId = getInsertaIdUsuario();
              await cajaService.recalcularTotales(Number(detalleCabecera.idCajaMayorCierre), {
                idCajaMayorCierre: Number(detalleCabecera.idCajaMayorCierre),
                actualizaIdUsuario: userId,
              });
              await loadCabeceras();
              await openDetalleGrid(detalleCabecera);
            } catch (e) {
              await openDetalleGrid(detalleCabecera);
            }
          }}
        />
      )}

      {/* Modal: Registro de Compras (para Egresos) */}
      {detalleVisible && detalleCabecera && (
        <RegistroComprasModal
          isOpen={showRegistroComprasModal}
          idCajaMayorCierre={Number(detalleCabecera.idCajaMayorCierre)}
          idTipoCaja={registroComprasIdTipoCaja}
          fechaMin={(() => { const anioNum = Number((detalleCabecera as any).anio ?? (detalleCabecera as any).Anio); const mesNum = Number((detalleCabecera as any).mes ?? (detalleCabecera as any).Mes); const { inicio } = calcRange(anioNum, mesNum); return inicio; })()}
          fechaMax={(() => { const anioNum = Number((detalleCabecera as any).anio ?? (detalleCabecera as any).Anio); const mesNum = Number((detalleCabecera as any).mes ?? (detalleCabecera as any).Mes); const { fin } = calcRange(anioNum, mesNum); return fin; })()}
          onClose={() => setShowRegistroComprasModal(false)}
          onSaved={async () => {
            try {
              setShowRegistroComprasModal(false);
              const userId = getInsertaIdUsuario();
              await cajaService.recalcularTotales(Number(detalleCabecera.idCajaMayorCierre), {
                idCajaMayorCierre: Number(detalleCabecera.idCajaMayorCierre),
                actualizaIdUsuario: userId,
              });
              await loadCabeceras();
              await openDetalleGrid(detalleCabecera);
            } catch (e) {
              await openDetalleGrid(detalleCabecera);
            }
          }}
        />
      )}

      {/* Modal: Resumen por tipo de caja tras orquestación */}
      <AnimatePresence>
        {showResumenModal && cabeceraCreada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="px-6 py-4 bg-green-600 text-white rounded-t-lg flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Resumen por tipo de caja</h3>
                <button className="p-2 rounded-md hover:bg-green-700" onClick={() => setShowResumenModal(false)}>
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Período: {months.find(m => m.value === Number(cabeceraCreada.mes))?.label || cabeceraCreada.mes} / {cabeceraCreada.anio}
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left">Tipo Caja</th>
                      <th className="px-4 py-2 text-right">Saldo Inicial</th>
                      <th className="px-4 py-2 text-right text-green-700">Ingresos</th>
                      <th className="px-4 py-2 text-right text-red-700">Egresos</th>
                      <th className="px-4 py-2 text-right">Saldo Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenTipos.length === 0 ? (
                      <tr><td className="px-4 py-3" colSpan={5}>Sin datos</td></tr>
                    ) : (
                      resumenTipos.map((r, idx) => (
                        <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-4 py-2">{tiposCaja.find(t => Number(t.idTipoCaja) === Number(r.idTipoCaja))?.nombreTipoCaja || `#${r.idTipoCaja}`}</td>
                          <td className="px-4 py-2 text-right">{(r.saldoInicial ?? 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</td>
                          <td className="px-4 py-2 text-right text-green-700">{(r.totalIngresos ?? 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</td>
                          <td className="px-4 py-2 text-right text-red-700">{(r.totalEgresos ?? 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</td>
                          <td className="px-4 py-2 text-right">{(r.saldoFinal ?? 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <motion.button
                  onClick={() => setShowResumenModal(false)}
                  className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cerrar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CajaMayorNew;
export { CajaMayorNew };
