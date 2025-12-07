import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Filter, Calendar, User, Layers, X, Search, ChevronLeft, ChevronRight, Eye, CreditCard, FileDown, Trash2, AlertTriangle } from 'lucide-react';
import { ExportService } from '../../services/ExportService';
import CajaService from '../../services/CajaService';
import { Paginator } from '../../@types/pagination';

interface RegistroComprasFilters {
  anio: number | null;
  mes: number | null;
  fechaInicio: string;
  fechaFin: string;
  idProveedor: number | null;
  proveedorNombre: string;
  idTipoCaja: number | null;
  estado: string | null;
}

interface Proveedor {
  idProveedor: number;
  nombreProveedor: string;
  ruc: string;
}

interface TipoCaja {
  idTipoCaja: number;
  nombreTipoCaja: string;
}

interface Compra {
  id: number;
  fecha: string;
  proveedor: string;
  tipoCaja: string;
  monto: number;
  numeroDocumento: string;
  concepto: string;
  estadoName: string;
  fechaVencimiento?: string | null;
  baseImponible?: number;
  igv?: number;
}

const RegistroCompras: React.FC = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const previousMonth = currentDate.getMonth(); // 0-11, mes anterior
  
  // Estados
  const [filters, setFilters] = useState<RegistroComprasFilters>({
    anio: currentYear,
    mes: previousMonth + 1, // Convertir a 1-12
    fechaInicio: '',
    fechaFin: '',
    idProveedor: null,
    proveedorNombre: '',
    idTipoCaja: null,
    estado: null
  });
  const [useDateRange, setUseDateRange] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [tiposCaja, setTiposCaja] = useState<TipoCaja[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payData, setPayData] = useState<Compra | null>(null);
  const [payDate, setPayDate] = useState<string>('');
  const [newEstado, setNewEstado] = useState<'1' | '0'>('1');
  const [serieEdit, setSerieEdit] = useState<string>('');
  const [numeroEdit, setNumeroEdit] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Compra | null>(null);
  const [showProveedorDropdown, setShowProveedorDropdown] = useState(false);
  const [proveedorSearch, setProveedorSearch] = useState('');
  const inputProveedorRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [pagination, setPagination] = useState<Paginator>({
    page: 1,
    pageSize: 5,
    totalPages: 1,
    totalRows: 0,
    hasPreviousPage: false,
    hasNextPage: false
  });

  // Generar años (últimos 5 años)
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
  
  // Meses del año
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  useEffect(() => {
    const svc = CajaService.getInstance();
    const init = async () => {
      const primerDiaMesAnterior = new Date(currentYear, previousMonth, 1);
      const ultimoDiaMesAnterior = new Date(currentYear, previousMonth + 1, 0);
      setFilters(prev => ({
        ...prev,
        fechaInicio: primerDiaMesAnterior.toISOString().split('T')[0],
        fechaFin: ultimoDiaMesAnterior.toISOString().split('T')[0]
      }));
      try {
        const tipos = await svc.getTiposCaja({ includeInactive: false });
        const listTipos = Array.isArray(tipos?.objModel) ? tipos.objModel : [];
        setTiposCaja(listTipos.map((t: any) => ({ idTipoCaja: t.idTipoCaja ?? t.IdTipoCaja, nombreTipoCaja: t.nombreTipoCaja ?? t.NombreTipoCaja })));
      } catch {}
    };
    init();
  }, []);

  // Handlers
  const getPeriodBounds = (anio: number, mes: number) => {
    const first = new Date(anio, mes - 1, 1);
    const last = new Date(anio, mes, 0);
    return {
      firstStr: first.toISOString().split('T')[0],
      lastStr: last.toISOString().split('T')[0]
    };
  };
  const todayStr = new Date().toISOString().split('T')[0];

  const handleYearChange = (anio: number) => {
    const { firstStr, lastStr } = getPeriodBounds(anio, filters.mes);
    setFilters(prev => ({ ...prev, anio, fechaInicio: firstStr, fechaFin: lastStr }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleMonthChange = (mes: number) => {
    const { firstStr, lastStr } = getPeriodBounds(filters.anio, mes);
    setFilters(prev => ({ ...prev, mes, fechaInicio: firstStr, fechaFin: lastStr }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFechaInicioChange = (fechaInicio: string) => {
    let fFin = filters.fechaFin;
    if (useDateRange && fFin && fechaInicio > fFin) {
      fFin = fechaInicio;
    }
    setFilters(prev => ({ ...prev, fechaInicio, fechaFin: fFin }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFechaFinChange = (fechaFin: string) => {
    let fIni = filters.fechaInicio;
    if (useDateRange && fIni && fechaFin < fIni) {
      fIni = fechaFin;
    }
    setFilters(prev => ({ ...prev, fechaFin, fechaInicio: fIni }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleProveedorSelect = (proveedor: Proveedor) => {
    setFilters(prev => ({
      ...prev,
      idProveedor: proveedor.idProveedor,
      proveedorNombre: proveedor.nombreProveedor
    }));
    setShowProveedorDropdown(false);
    setProveedorSearch('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleLimpiarProveedor = () => {
    setFilters(prev => ({
      ...prev,
      idProveedor: null,
      proveedorNombre: ''
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleTipoCajaChange = (idTipoCaja: number | null) => {
    setFilters(prev => ({ ...prev, idTipoCaja }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleEstadoChange = (value: string) => {
    const mapped = value === 'all' ? null : value; // '1' pagado, '0' por pagar
    setFilters(prev => ({ ...prev, estado: mapped }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleLimpiarFechas = () => {
    setFilters(prev => ({
      ...prev,
      fechaInicio: '',
      fechaFin: ''
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleUseDateRange = (checked: boolean) => {
    if (checked) {
      setUseDateRange(true);
      setFilters(prev => ({ ...prev, anio: null, mes: null }));
      setPagination(prev => ({ ...prev, page: 1 }));
    } else {
      setUseDateRange(false);
      setFilters(prev => ({ ...prev, anio: currentYear, mes: previousMonth + 1 }));
      const b = getPeriodBounds(currentYear, previousMonth + 1);
      setFilters(prev => ({ ...prev, fechaInicio: b.firstStr, fechaFin: b.lastStr }));
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize: number) => {
    setPagination(prev => ({ ...prev, pageSize: newSize, page: 1 }));
  };

  // Filtrar proveedores para autocomplete
  const proveedoresFiltrados = proveedores.filter(p => 
    p.nombreProveedor.toLowerCase().includes(proveedorSearch.toLowerCase()) ||
    p.ruc.includes(proveedorSearch)
  );

  // Calcular posición del dropdown para que caiga fuera del card
  useEffect(() => {
    const updatePos = () => {
      const el = inputProveedorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };
    if (showProveedorDropdown) {
      updatePos();
      window.addEventListener('scroll', updatePos, true);
      window.addEventListener('resize', updatePos);
    }
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [showProveedorDropdown]);

  useEffect(() => {
    const loadProv = async () => {
      const term = proveedorSearch.trim();
      if (!term) {
        setProveedores([]);
        return;
      }
      try {
        const svc = CajaService.getInstance();
        const resp = await svc.buscarProveedores(term);
        const list = Array.isArray(resp?.objModel) ? resp.objModel : [];
        setProveedores(list.map((p: any) => ({ idProveedor: p.idProveedor ?? p.IdProveedor ?? 0, nombreProveedor: p.razonSocial ?? p.RazonSocial ?? p.nombreProveedor ?? '', ruc: p.ruc ?? p.RUC ?? '' })));
      } catch {}
    };
    loadProv();
  }, [proveedorSearch]);

  const cargarCompras = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const svc = CajaService.getInstance();
      const periodo = useDateRange || filters.anio == null || filters.mes == null
        ? undefined
        : Number(`${filters.anio}${String(filters.mes).padStart(2,'0')}`);
      const resp = await svc.listRegistroCompras({
        periodo,
        fechaInicial: filters.fechaInicio || undefined,
        fechaFinal: filters.fechaFin || undefined,
        idProveedor: filters.idProveedor ?? undefined,
        idTipoCaja: filters.idTipoCaja ?? undefined,
        estado: filters.estado ?? undefined,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      const rows = Array.isArray(resp?.objModel) ? resp.objModel : [];
      const mapped: Compra[] = rows.map((r: any) => ({
        id: r.idRegistroCompra ?? r.IdRegistroCompra,
        fecha: r.fechaEmision ?? r.FechaEmision,
        proveedor: r.razonSocialProveedor ?? r.RazonSocialProveedor,
        tipoCaja: r.tipoCajaName ?? r.TipoCajaName,
        monto: Number(r.importeTotal ?? r.ImporteTotal ?? 0),
        numeroDocumento: `${r.serie ?? r.Serie}-${r.numero ?? r.Numero}`,
        concepto: r.idFamiliaEgresoName ?? r.IdFamiliaEgresoName,
        estadoName: r.estadoName ?? r.EstadoName ?? '',
        fechaVencimiento: r.fechaVencimiento ?? r.FechaVencimiento ?? null,
        baseImponible: Number(r.baseImponible ?? r.BaseImponible ?? 0),
        igv: Number(r.igv ?? r.IGV ?? 0),
      }));
      setCompras(mapped);
      
      // Actualizar paginación con los datos del backend
      if (resp?.objPaginated) {
        const pag = resp.objPaginated as any;
        setPagination({
          page: pag.page || 1,
          pageSize: pag.pageSize || 5,
          totalPages: pag.totalPages || 1,
          totalRows: pag.totalRows || 0,
          hasPreviousPage: pag.hasPreviousPage || false,
          hasNextPage: pag.hasNextPage || false
        });
      }
    } catch (error) {
      setError('Error al cargar los registros de compras');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);

  // Cargar compras automáticamente cuando cambian los filtros
  useEffect(() => {
    cargarCompras();
  }, [cargarCompras]);

  const formatCurrency = (monto: number) => {
    return `S/. ${monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleExportPDF = async () => {
    const subtitleParts = [
      useDateRange ? 'Rango de fechas' : `${filters.anio ?? ''} • ${months.find(m => m.value === (filters.mes ?? 0))?.label ?? ''}`,
      filters.fechaInicio && filters.fechaFin ? `Del ${filters.fechaInicio} al ${filters.fechaFin}` : 'Todas las fechas',
      filters.proveedorNombre || 'Todos los proveedores',
      tiposCaja.find(t => t.idTipoCaja === filters.idTipoCaja)?.nombreTipoCaja || 'Todos los tipos de caja',
      filters.estado === '1' ? 'Pagados' : filters.estado === '0' ? 'Por Pagar' : 'Todos los estados'
    ];
    const subtitle = subtitleParts.join(' • ');
    const filename = `registro-compras_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}`;
    await ExportService.exportRegistroComprasToPDF(compras, { title: 'Registro de Compras', subtitle, filename });
  };

  const handleVer = async (compra: Compra) => {
    try {
      const svc = CajaService.getInstance();
      const resp = await svc.getRegistroComprasById(compra.id);
      setDetailData(resp?.objModel ?? null);
      setShowDetailModal(true);
    } catch {
      setDetailData(null);
      setShowDetailModal(true);
    }
  };

  const handlePagar = (compra: Compra) => {
    setPayData(compra);
    setPayDate(new Date().toISOString().split('T')[0]);
    const estadoActual = (compra.estadoName || '').toLowerCase() === 'pagado' ? '1' : '0';
    setNewEstado(estadoActual);
    // Prefill serie/numero desde el númeroDocumento si corresponde
    const parts = (compra.numeroDocumento || '').split('-');
    setSerieEdit(parts.length > 1 ? parts[0] : '');
    setNumeroEdit(parts.length > 1 ? parts[1] : (parts[0] || ''));
    setShowPayModal(true);
  };

  const submitPago = async () => {
    if (!payData || !payDate) return;
    try {
      const svc = CajaService.getInstance();
      const payload: { fechaPago?: string; estado?: string; serie?: string; numero?: string } = {};
      if (newEstado === '1') payload.fechaPago = payDate; else payload.fechaPago = undefined;
      payload.estado = newEstado;
      payload.serie = serieEdit?.trim() || undefined;
      payload.numero = numeroEdit?.trim() || undefined;
      const resp = await svc.pagarRegistroCompras(payData.id, payload);
      setShowPayModal(false);
      await cargarCompras();
    } catch (e) {
      console.error('Error al pagar:', e);
    }
  };

  const handleEliminar = (compra: Compra) => {
    setDeleteTarget(compra);
    setShowDeleteModal(true);
  };

  const confirmEliminar = async () => {
    if (!deleteTarget) return;
    try {
      const svc = CajaService.getInstance();
      let anioStr: string;
      let mesStr: string;
      if (!useDateRange && filters.anio && filters.mes) {
        anioStr = String(filters.anio);
        mesStr = String(filters.mes).padStart(2, '0');
      } else {
        const d = new Date(deleteTarget.fecha);
        anioStr = String(d.getFullYear());
        mesStr = String(d.getMonth() + 1).padStart(2, '0');
      }
      const existsResp = await svc.checkCierreExists({ anio: anioStr, mes: mesStr });
      const model: any = existsResp?.objModel ?? {};
      const idCierre = (model.idCajaMayorCierre ?? model.IdCajaMayorCierre) as number;
      if (!idCierre || idCierre <= 0) {
        alert('No se encontró un cierre de caja para el periodo seleccionado.');
        return;
      }
      await svc.deleteRegistroCompras(deleteTarget.id, { idCajaMayorCierre: idCierre });
      setShowDeleteModal(false);
      setDeleteTarget(null);
      await cargarCompras();
    } catch (e) {
      console.error('Error al eliminar registro de compras:', e);
      alert('Ocurrió un error al eliminar el registro.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Registro de Compras</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Consulta y filtrado de registros de compras realizadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileDown className="w-4 h-4" />
            Generar Reporte
          </motion.button>
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </motion.button>
        </div>
      </div>

      {/* Filters Panel */}
      <motion.div
        initial={false}
        animate={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Toggle rango de fechas */}
          <div className="mb-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={useDateRange} onChange={(e) => toggleUseDateRange(e.target.checked)} />
              Usar rango de fechas (descartar periodo)
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Año Filter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4" />
                Año
              </label>
              <select
                value={filters.anio ?? ''}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                disabled={useDateRange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Mes Filter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4" />
                Mes
              </label>
              <select
                value={filters.mes ?? ''}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                disabled={useDateRange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>

            {/* Fecha Inicial */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4" />
                Fecha Inicial
              </label>
              <input
                type="date"
                value={filters.fechaInicio}
                onChange={(e) => handleFechaInicioChange(e.target.value)}
                min={useDateRange ? undefined : getPeriodBounds(filters.anio!, filters.mes!).firstStr}
                max={useDateRange ? todayStr : getPeriodBounds(filters.anio!, filters.mes!).lastStr}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            {/* Fecha Final */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Calendar className="w-4 h-4" />
                  Fecha Final
                </label>
                <button
                  onClick={handleLimpiarFechas}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                  title="Limpiar fechas"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <input
                type="date"
                value={filters.fechaFin}
                onChange={(e) => handleFechaFinChange(e.target.value)}
                min={useDateRange ? undefined : getPeriodBounds(filters.anio!, filters.mes!).firstStr}
                max={useDateRange ? todayStr : getPeriodBounds(filters.anio!, filters.mes!).lastStr}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

          </div>

          {/* Segunda fila: Proveedor, Tipo de Caja, Estado */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            {/* Proveedor Filter */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <User className="w-4 h-4" />
                  Proveedor
                </label>
                {filters.idProveedor && (
                  <button
                    onClick={handleLimpiarProveedor}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                    title="Limpiar proveedor"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div ref={inputProveedorRef} className="relative">
                <input
                  type="text"
                  value={filters.proveedorNombre || proveedorSearch}
                  onChange={(e) => {
                    setProveedorSearch(e.target.value);
                    setShowProveedorDropdown(true);
                    if (filters.idProveedor) {
                      handleLimpiarProveedor();
                    }
                  }}
                  onFocus={() => setShowProveedorDropdown(true)}
                  placeholder="Buscar proveedor..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
              
              {/* Dropdown de proveedores (portal fuera del card) */}
              {showProveedorDropdown && dropdownPos && createPortal(
                <div
                  style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
                  className="mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                >
                  {proveedoresFiltrados.length > 0 ? (
                    proveedoresFiltrados.map(proveedor => (
                      <div
                        key={proveedor.idProveedor}
                        onClick={() => handleProveedorSelect(proveedor)}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {proveedor.nombreProveedor}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          RUC: {proveedor.ruc}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No se encontraron proveedores
                    </div>
                  )}
                </div>,
                document.body
              )}
            </div>

            {/* Tipo Caja Filter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Layers className="w-4 h-4" />
                Tipo de Caja
              </label>
              <select
                value={filters.idTipoCaja || ''}
                onChange={(e) => handleTipoCajaChange(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="">Seleccionar tipo de caja</option>
                {tiposCaja.map(tipo => (
                  <option key={tipo.idTipoCaja} value={tipo.idTipoCaja}>
                    {tipo.nombreTipoCaja}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado Filter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Layers className="w-4 h-4" />
                Estado
              </label>
              <select
                value={(filters as any).estado === null ? 'all' : (filters as any).estado}
                onChange={(e) => handleEstadoChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="all">Todos</option>
                <option value="1">Pagados</option>
                <option value="0">Por Pagar</option>
              </select>
            </div>

            <div></div>
            </div>
          </div>
      </motion.div>

      {/* Results Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Registros de Compras</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {useDateRange ? 'Rango de fechas' : `${filters.anio ?? ''} • ${months.find(m => m.value === (filters.mes ?? 0))?.label ?? ''}`} • 
            {filters.fechaInicio && filters.fechaFin ? 
              `Del ${filters.fechaInicio} al ${filters.fechaFin}` : 'Todas las fechas'} • 
            {filters.proveedorNombre || 'Todos los proveedores'} • 
            {tiposCaja.find(t => t.idTipoCaja === filters.idTipoCaja)?.nombreTipoCaja || 'Todos los tipos de caja'}
          </p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Cargando registros...</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Por favor espere mientras se cargan los datos
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error al cargar</h3>
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
            </div>
          ) : compras.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No se encontraron registros</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Intenta ajustar los filtros para obtener resultados
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tabla de resultados */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Proveedor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo Caja</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Documento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Concepto</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vencimiento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {compras.map((compra, index) => {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const isPastDue = compra.fechaVencimiento ? (new Date(compra.fechaVencimiento) < today) : false;
                      const estado = (compra.estadoName || '').toLowerCase();
                      const isPorPagar = estado === 'por pagar';
                      const warn = isPastDue && isPorPagar;
                      const rowClass = `hover:bg-gray-50 dark:hover:bg-gray-700 ${warn ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`;
                      const estadoBadgeClass = estado === 'pagado'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : estado === 'por pagar'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
                      return (
                      <tr key={compra.id} className={rowClass}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(compra.fecha).toLocaleDateString('es-PE')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {compra.proveedor}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {compra.tipoCaja}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                          {compra.numeroDocumento}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {compra.concepto}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right font-semibold">
                          {formatCurrency(compra.monto)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoBadgeClass}`}>
                            {compra.estadoName}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {compra.fechaVencimiento ? new Date(compra.fechaVencimiento).toLocaleDateString('es-PE') : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleVer(compra)}
                              className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                              title="Ver"
                            >
                              <Eye className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            </button>
                            <button
                              onClick={() => handlePagar(compra)}
                              className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                              title="Pagar"
                            >
                              <CreditCard className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleEliminar(compra)}
                              className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPreviousPage}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {(() => {
                      if (pagination.totalRows === 0) return `Mostrando 0-0 de 0 registros`;
                      const start = (pagination.page - 1) * pagination.pageSize + 1;
                      const end = start + compras.length - 1;
                      return `Mostrando ${start}-${end} de ${pagination.totalRows} registros`;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Por página</span>
                    <select
                      value={pagination.pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Modal Ver Registro */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-3xl">
            <div className="flex items-center justify-between bg-primary text-white rounded-t-lg px-6 py-4">
              <h3 className="text-lg font-semibold">Detalle de Registro de Compras</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-2 rounded-md hover:bg-primary-dark/70">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-6">
              {detailData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium text-gray-700">Proveedor:</span> <span className="text-blue-700">{detailData.razonSocialProveedor ?? detailData.RazonSocialProveedor}</span></div>
                  <div><span className="font-medium text-gray-700">RUC:</span> <span className="text-blue-700">{detailData.rucProveedor ?? detailData.RucProveedor}</span></div>
                  <div><span className="font-medium text-gray-700">Documento:</span> <span className="text-blue-700">{(detailData.serie ?? detailData.Serie) + '-' + (detailData.numero ?? detailData.Numero)}</span></div>
                  <div><span className="font-medium text-gray-700">Comprobante:</span> <span className="text-blue-700">{detailData.tipoComprobante ?? detailData.TipoComprobante}</span></div>
                  <div><span className="font-medium text-gray-700">Emisión:</span> <span className="text-blue-700">{new Date(detailData.fechaEmision ?? detailData.FechaEmision).toLocaleDateString('es-PE')}</span></div>
                  <div><span className="font-medium text-gray-700">Vencimiento:</span> <span className="text-blue-700">{detailData.fechaVencimiento ? new Date(detailData.fechaVencimiento).toLocaleDateString('es-PE') : '-'}</span></div>
                  <div><span className="font-medium text-gray-700">Moneda:</span> <span className="text-blue-700">{detailData.codigoMoneda ?? detailData.CodigoMoneda ?? '-'}</span></div>
                  <div><span className="font-medium text-gray-700">Tipo Cambio:</span> <span className="text-blue-700">{detailData.tipoCambio ?? detailData.TipoCambio ?? '-'}</span></div>
                  <div><span className="font-medium text-gray-700">Base Imponible:</span> <span className="text-blue-700">{formatCurrency(Number(detailData.baseImponible ?? detailData.BaseImponible ?? 0))}</span></div>
                  <div><span className="font-medium text-gray-700">IGV:</span> <span className="text-blue-700">{formatCurrency(Number(detailData.igv ?? detailData.IGV ?? 0))}</span></div>
                  <div><span className="font-medium text-gray-700">ISC:</span> <span className="text-blue-700">{formatCurrency(Number(detailData.isc ?? detailData.ISC ?? 0))}</span></div>
                  <div><span className="font-medium text-gray-700">Otros Tributos:</span> <span className="text-blue-700">{formatCurrency(Number(detailData.otrosTributos ?? detailData.OtrosTributos ?? 0))}</span></div>
                  <div><span className="font-medium text-gray-700">Valor No Gravado:</span> <span className="text-blue-700">{formatCurrency(Number(detailData.valorNoGravado ?? detailData.ValorNoGravado ?? 0))}</span></div>
                  <div><span className="font-medium text-gray-700">Total:</span> <span className="text-blue-700">{formatCurrency(Number(detailData.importeTotal ?? detailData.ImporteTotal ?? 0))}</span></div>
                  <div><span className="font-medium text-gray-700">Estado:</span> <span className="text-blue-700">{(detailData.estadoName ?? detailData.EstadoName) || (detailData.estado ?? detailData.Estado)}</span></div>
                  {((detailData.aplicaDetraccion ?? detailData.AplicaDetraccion) === true) && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><span className="font-medium text-gray-700">Detracción %:</span> <span className="text-blue-700">{detailData.porcentajeDetraccion ?? detailData.PorcentajeDetraccion ?? '-'}</span></div>
                      <div><span className="font-medium text-gray-700">Monto Detracción:</span> <span className="text-blue-700">{formatCurrency(Number(detailData.montoDetraccion ?? detailData.MontoDetraccion ?? 0))}</span></div>
                      <div><span className="font-medium text-gray-700">Constancia:</span> <span className="text-blue-700">{detailData.numeroConstanciaDetraccion ?? detailData.NumeroConstanciaDetraccion ?? '-'}</span></div>
                    </div>
                  )}
                  {((detailData.aplicaRetencion ?? detailData.AplicaRetencion) === true) && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><span className="font-medium text-gray-700">Retención:</span> <span className="text-blue-700">Sí</span></div>
                      <div><span className="font-medium text-gray-700">Monto Retención:</span> <span className="text-blue-700">{formatCurrency(Number(detailData.montoRetencion ?? detailData.MontoRetencion ?? 0))}</span></div>
                    </div>
                  )}
                  <div className="md:col-span-2"><span className="font-medium text-gray-700">Observaciones:</span> <span className="text-blue-700">{detailData.observaciones ?? detailData.Observaciones ?? '-'}</span></div>
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400">No se encontró información.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagar */}
      {showPayModal && payData && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-xl">
            <div className="flex items-center justify-between bg-primary text-white rounded-t-lg px-6 py-4">
              <h3 className="text-lg font-semibold">Cambiar estado de registro</h3>
              <button onClick={() => setShowPayModal(false)} className="p-2 rounded-md hover:bg-primary-dark/70">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-900 dark:text-white"><span className="font-medium">Proveedor:</span> {payData.proveedor}</div>
              <div className="text-sm text-gray-900 dark:text-white"><span className="font-medium">Documento:</span> {payData.numeroDocumento}</div>
              <div className="text-sm text-gray-900 dark:text-white"><span className="font-medium">Total:</span> {formatCurrency(payData.monto)}</div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
              <div className="mt-2 inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
                <button onClick={() => setNewEstado('0')} className={`px-4 py-2 text-sm ${newEstado==='0'?'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200':'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Por Pagar</button>
                <button onClick={() => setNewEstado('1')} className={`px-4 py-2 text-sm border-l border-gray-300 dark:border-gray-600 ${newEstado==='1'?'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200':'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Pagado</button>
              </div>
            </div>
            <div className="space-y-2">
              {newEstado === '1' ? (
                <>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de pago</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Serie (opcional)</label>
                    <input
                      type="text"
                      value={serieEdit}
                      onChange={(e) => setSerieEdit(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase"
                      maxLength={20}
                      placeholder="Ej: F001"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Número (opcional)</label>
                    <input
                      type="text"
                      value={numeroEdit}
                      onChange={(e) => setNumeroEdit(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      maxLength={20}
                      placeholder="Ej: 00001234"
                    />
                  </div>
                </div>
                </>
              ) : (
                <div className="text-xs text-gray-600 dark:text-gray-400">Al marcar "Por Pagar" se limpia la fecha de pago.</div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowPayModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">Cancelar</button>
              <button onClick={submitPago} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">Guardar</button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar Registro */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-xl">
            <div className="flex items-center justify-between bg-red-600 text-white rounded-t-lg px-6 py-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Confirmar eliminación</h3>
              <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} className="p-2 rounded-md hover:bg-red-700">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-4 border border-yellow-200 dark:border-yellow-800">
                <div className="text-sm text-gray-900 dark:text-white"><span className="font-medium">Proveedor:</span> {deleteTarget.proveedor}</div>
                <div className="text-sm text-gray-900 dark:text-white"><span className="font-medium">Documento:</span> {deleteTarget.numeroDocumento}</div>
                <div className="text-sm text-gray-900 dark:text-white"><span className="font-medium">Total:</span> {formatCurrency(deleteTarget.monto)}</div>
                <div className="text-sm text-gray-900 dark:text-white"><span className="font-medium">Fecha emisión:</span> {new Date(deleteTarget.fecha).toLocaleDateString('es-PE')}</div>
                <div className="text-sm text-gray-900 dark:text-white"><span className="font-medium">Vencimiento:</span> {deleteTarget.fechaVencimiento ? new Date(deleteTarget.fechaVencimiento).toLocaleDateString('es-PE') : '-'}</div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">¿Está seguro de eliminar este registro? Esta acción eliminará el egreso vinculado y recalculará el cierre de caja.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">Cancelar</button>
                <button onClick={confirmEliminar} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroCompras;
