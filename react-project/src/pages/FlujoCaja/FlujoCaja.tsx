import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, TrendingUp, TrendingDown, DollarSign, Calendar, Layers, LineChart as LineChartIcon, X } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import CajaService from '../../services/CajaService';
import type { FlujoCajaConsolidadoRequest, FlujoCajaConsolidadoResponse, FlujoCajaDetalladoResponse } from '../../@types/caja';

interface FlujoCajaFilters {
  anio: number;
  tiposCaja: number[];
  tipoMovimiento: 'I' | 'E' | 'T' | null; // 'T' = Todos
}

interface TipoCaja {
  idTipoCaja: number;
  nombreTipoCaja: string;
}

const FlujoCaja: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  // Estados
  const [filters, setFilters] = useState<FlujoCajaFilters>({
    anio: currentYear,
    tiposCaja: [],
    tipoMovimiento: 'T'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiposCaja, setTiposCaja] = useState<TipoCaja[]>([]);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [gridLoading, setGridLoading] = useState(false);
  const [consolidado, setConsolidado] = useState<FlujoCajaConsolidadoResponse[]>([]);
  const [detallado, setDetallado] = useState<FlujoCajaDetalladoResponse[]>([]);
  const [showDetailChartModal, setShowDetailChartModal] = useState(false);
  const [detailChartMode, setDetailChartMode] = useState<'global' | 'tipo' | 'multi'>('multi');
  const [selectedTypesForDetailChart, setSelectedTypesForDetailChart] = useState<number[]>([]);
  const [selectedTypeForDetailChart, setSelectedTypeForDetailChart] = useState<number | null>(null);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [chartMode, setChartMode] = useState<'global' | 'tipo' | 'multi'>('multi');
  const [selectedTypesForChart, setSelectedTypesForChart] = useState<number[]>([]);
  const [selectedTypeForChart, setSelectedTypeForChart] = useState<number | null>(null);

  // Generar años (currentYear - 5 hasta currentYear)
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);

  // Cargar tipos de caja desde backend (igual enfoque que Dashboard General)
  useEffect(() => {
    const cajaService = CajaService.getInstance();
    const fetchTipos = async () => {
      try {
        const resp = await cajaService.getTiposCaja({ includeInactive: false });
        const list = Array.isArray(resp?.objModel) ? resp.objModel : [];
        const mapped: TipoCaja[] = list.map((t: any) => ({
          idTipoCaja: t.idTipoCaja ?? t.IdTipoCaja ?? 0,
          nombreTipoCaja: t.nombreTipoCaja ?? t.NombreTipoCaja ?? ''
        }));
        setTiposCaja(mapped);
        setFilters(prev => ({
          ...prev,
          tiposCaja: mapped.map(t => t.idTipoCaja)
        }));
        setSelectedTypesForChart(mapped.map(t => t.idTipoCaja));
        setSelectedTypeForChart(mapped.length > 0 ? mapped[0].idTipoCaja : null);
        setSelectedTypesForDetailChart(mapped.map(t => t.idTipoCaja));
        setSelectedTypeForDetailChart(mapped.length > 0 ? mapped[0].idTipoCaja : null);
      } catch (err: any) {
        setError(err?.message || 'No se pudo cargar tipos de caja');
      }
    };
    fetchTipos();
  }, []);

  useEffect(() => {
    if (!autoLoaded && tiposCaja.length > 0 && filters.tiposCaja.length > 0) {
      handleApplyFilters();
      setAutoLoaded(true);
    }
  }, [tiposCaja, filters.tiposCaja, filters.anio, filters.tipoMovimiento, autoLoaded]);

  useEffect(() => {
    setSelectedTypesForChart(filters.tiposCaja);
    if (filters.tiposCaja.length > 0) {
      setSelectedTypeForChart(filters.tiposCaja[0]);
    }
  }, [filters.tiposCaja]);

  useEffect(() => {
    setSelectedTypesForDetailChart(filters.tiposCaja);
    if (filters.tiposCaja.length > 0) {
      setSelectedTypeForDetailChart(filters.tiposCaja[0]);
    }
  }, [filters.tiposCaja]);

  const monthLabels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];
  const monthKeys: Array<keyof FlujoCajaConsolidadoResponse> = ['ene','feb','mar','abr','may','jun','jul','ago','set','oct','nov','dic'];

  const greens = ['#16a34a','#22c55e','#10b981','#059669','#65a30d','#3f9f37'];
  const reds   = ['#dc2626','#ef4444','#f97316','#b91c1c','#7f1d1d','#b45309'];

  const chartDataGlobal = React.useMemo(() => {
    if (!consolidado || consolidado.length === 0) return [] as any[];
    return monthKeys.map((k, idx) => {
      const inc = consolidado
        .filter(r => r.tipoMovimiento === 'I' && selectedTypesForChart.includes(r.idTipoCaja))
        .reduce((s, r) => s + (r[k] as number || 0), 0);
      const egr = consolidado
        .filter(r => r.tipoMovimiento === 'E' && selectedTypesForChart.includes(r.idTipoCaja))
        .reduce((s, r) => s + (r[k] as number || 0), 0);
      return { mes: `${monthLabels[idx]}-${String(filters.anio).slice(-2)}`, ingresos: inc, egresos: egr };
    });
  }, [consolidado, selectedTypesForChart, filters.anio]);

  const chartDataTipo = React.useMemo(() => {
    if (!consolidado || consolidado.length === 0 || !selectedTypeForChart) return [] as any[];
    return monthKeys.map((k, idx) => {
      const inc = consolidado
        .filter(r => r.tipoMovimiento === 'I' && r.idTipoCaja === selectedTypeForChart)
        .reduce((s, r) => s + (r[k] as number || 0), 0);
      const egr = consolidado
        .filter(r => r.tipoMovimiento === 'E' && r.idTipoCaja === selectedTypeForChart)
        .reduce((s, r) => s + (r[k] as number || 0), 0);
      return { mes: `${monthLabels[idx]}-${String(filters.anio).slice(-2)}`, ingresos: inc, egresos: egr };
    });
  }, [consolidado, selectedTypeForChart, filters.anio]);

  const chartDataMulti = React.useMemo(() => {
    if (!consolidado || consolidado.length === 0 || selectedTypesForChart.length === 0) return [] as any[];
    return monthKeys.map((k, idx) => {
      const row: any = { mes: `${monthLabels[idx]}-${String(filters.anio).slice(-2)}` };
      selectedTypesForChart.forEach((id) => {
        const inc = consolidado.filter(r => r.tipoMovimiento === 'I' && r.idTipoCaja === id)
          .reduce((s, r) => s + (r[k] as number || 0), 0);
        const egr = consolidado.filter(r => r.tipoMovimiento === 'E' && r.idTipoCaja === id)
          .reduce((s, r) => s + (r[k] as number || 0), 0);
        row[`ing_${id}`] = inc;
        row[`egr_${id}`] = egr;
      });
      return row;
    });
  }, [consolidado, selectedTypesForChart, filters.anio]);

  // ========= Charts for Detallado =========
  const detailChartDataGlobal = React.useMemo(() => {
    if (!detallado || detallado.length === 0) return [] as any[];
    return monthKeys.map((k, idx) => {
      const inc = detallado
        .filter(r => r.tipoMovimiento === 'I' && selectedTypesForDetailChart.includes(r.idTipoCaja))
        .reduce((s, r) => s + (r[k] as number || 0), 0);
      const egr = detallado
        .filter(r => r.tipoMovimiento === 'E' && selectedTypesForDetailChart.includes(r.idTipoCaja))
        .reduce((s, r) => s + (r[k] as number || 0), 0);
      return { mes: `${monthLabels[idx]}-${String(filters.anio).slice(-2)}`, ingresos: inc, egresos: egr };
    });
  }, [detallado, selectedTypesForDetailChart, filters.anio]);

  const detailChartDataTipo = React.useMemo(() => {
    if (!detallado || detallado.length === 0 || !selectedTypeForDetailChart) return [] as any[];
    return monthKeys.map((k, idx) => {
      const inc = detallado
        .filter(r => r.tipoMovimiento === 'I' && r.idTipoCaja === selectedTypeForDetailChart)
        .reduce((s, r) => s + (r[k] as number || 0), 0);
      const egr = detallado
        .filter(r => r.tipoMovimiento === 'E' && r.idTipoCaja === selectedTypeForDetailChart)
        .reduce((s, r) => s + (r[k] as number || 0), 0);
      return { mes: `${monthLabels[idx]}-${String(filters.anio).slice(-2)}`, ingresos: inc, egresos: egr };
    });
  }, [detallado, selectedTypeForDetailChart, filters.anio]);

  const detailChartDataMulti = React.useMemo(() => {
    if (!detallado || detallado.length === 0 || selectedTypesForDetailChart.length === 0) return [] as any[];
    const slug = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const ingresosCats = Array.from(new Set(
      detallado.filter(r => r.tipoMovimiento === 'I' && selectedTypesForDetailChart.includes(r.idTipoCaja)).map(r => r.nombreDetalle)
    ));
    const egresosCats = Array.from(new Set(
      detallado.filter(r => r.tipoMovimiento === 'E' && selectedTypesForDetailChart.includes(r.idTipoCaja)).map(r => r.nombreDetalle)
    ));
    const totalByCat = (tipo: 'I'|'E', cat: string) => monthKeys.reduce((acc,k)=> acc + detallado.filter(r => r.tipoMovimiento===tipo && r.nombreDetalle===cat && selectedTypesForDetailChart.includes(r.idTipoCaja)).reduce((s,r)=> s + (r[k] as number || 0), 0), 0);
    const topIngresoCats = ingresosCats.sort((a,b)=> totalByCat('I', b) - totalByCat('I', a)).slice(0, 6);
    const topEgresoCats = egresosCats.sort((a,b)=> totalByCat('E', b) - totalByCat('E', a)).slice(0, 6);
    return monthKeys.map((k, idx) => {
      const row: any = { mes: `${monthLabels[idx]}-${String(filters.anio).slice(-2)}` };
      topIngresoCats.forEach(cat => {
        const val = detallado.filter(r => r.tipoMovimiento === 'I' && r.nombreDetalle === cat && selectedTypesForDetailChart.includes(r.idTipoCaja))
          .reduce((s, r) => s + (r[k] as number || 0), 0);
        row[`ingd_${slug(cat)}`] = val;
      });
      topEgresoCats.forEach(cat => {
        const val = detallado.filter(r => r.tipoMovimiento === 'E' && r.nombreDetalle === cat && selectedTypesForDetailChart.includes(r.idTipoCaja))
          .reduce((s, r) => s + (r[k] as number || 0), 0);
        row[`egrd_${slug(cat)}`] = val;
      });
      return row;
    });
  }, [detallado, selectedTypesForDetailChart, filters.anio]);

  const MultiTooltipDet: React.FC<any> = ({ label, payload }) => {
    if (!payload || payload.length === 0) return null;
    type Item = { nombre: string; color: string; isIng: boolean; value: number };
    const items: Item[] = [];
    payload.forEach((p: any) => {
      const dk: string = p?.dataKey || '';
      const isIng = dk.startsWith('ingd_');
      const nameSlug = dk.replace(/^ingd_|^egrd_/, '');
      const nombre = nameSlug.replace(/_/g, ' ').toUpperCase();
      items.push({ nombre, color: p?.color || (isIng ? '#16a34a' : '#dc2626'), isIng, value: Number(p?.value || 0) });
    });
    items.sort((a, b) => b.value - a.value);
    const formatMoney = (n: number) => `S/. ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg px-4 py-3 text-xs md:text-sm">
        <div className="font-semibold text-gray-900 dark:text-white mb-2">{label}</div>
        <div className="space-y-1">
          {items.map((t, idx) => (
            <div key={`det-${idx}`} className="space-y-1" style={{ color: t.color }}>
              {t.nombre} – {t.isIng ? 'Ingresos' : 'Egresos'} : {formatMoney(t.value)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCustomLegendDet = (props: any) => {
    const { payload } = props || {};
    if (!payload || payload.length === 0) return null;
    type Item = { name: string; color: string };
    const ingresos: Item[] = [];
    const egresos: Item[] = [];
    payload.forEach((p: any) => {
      const dk: string = p?.dataKey || '';
      const isIng = dk.startsWith('ingd_');
      const nameSlug = dk.replace(/^ingd_|^egrd_/, '');
      const nombre = nameSlug.replace(/_/g, ' ').toUpperCase();
      const entry = { name: nombre, color: p?.color || (isIng ? '#16a34a' : '#dc2626') };
      if (isIng) ingresos.push(entry); else egresos.push(entry);
    });
    ingresos.sort((a, b) => a.name.localeCompare(b.name));
    egresos.sort((a, b) => a.name.localeCompare(b.name));
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-2 py-1 text-xs md:text-sm">
        <div>
          <div className="font-semibold" style={{ color: '#16a34a' }}>Ingresos</div>
          <ul className="mt-1 space-y-0.5">
            {ingresos.map((it, idx) => (
              <li key={`ing-det-legend-${idx}`} className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: it.color }} />
                <span style={{ color: it.color }}>{it.name}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-semibold" style={{ color: '#dc2626' }}>Egresos</div>
          <ul className="mt-1 space-y-0.5">
            {egresos.map((it, idx) => (
              <li key={`egr-det-legend-${idx}`} className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: it.color }} />
                <span style={{ color: it.color }}>{it.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const MultiTooltip: React.FC<any> = ({ label, payload }) => {
    if (!payload || payload.length === 0) return null;
    // Map ingresos/egresos por tipo usando dataKey: ing_<id>, egr_<id>
    const byType: Array<{ id: number; nombre: string; ing: number; egr: number; ingColor: string; egrColor: string }> = [];
    const ids = selectedTypesForChart;
    ids.forEach((id, i) => {
      const ingItem = payload.find((p: any) => p.dataKey === `ing_${id}`);
      const egrItem = payload.find((p: any) => p.dataKey === `egr_${id}`);
      const nombre = tiposCaja.find(t => t.idTipoCaja === id)?.nombreTipoCaja || String(id);
      byType.push({
        id,
        nombre,
        ing: Number(ingItem?.value || 0),
        egr: Number(egrItem?.value || 0),
        ingColor: greens[(i % greens.length)],
        egrColor: reds[(i % reds.length)],
      });
    });
    // Ordenar por ingresos descendente
    byType.sort((a, b) => b.ing - a.ing);
    const formatMoney = (n: number) => `S/. ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg px-4 py-3 text-xs md:text-sm">
        <div className="font-semibold text-gray-900 dark:text-white mb-2">{label}</div>
        <div className="space-y-1">
          {byType.map((t) => (
            <div key={`ing-${t.id}`} className="space-y-1">
              <div style={{ color: t.ingColor }}>
                {t.nombre} – Ingresos : {formatMoney(t.ing)}
              </div>
              <div style={{ color: t.egrColor }}>
                {t.nombre} – Egresos : {formatMoney(t.egr)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCustomLegend = (props: any) => {
    const { payload } = props || {};
    if (!payload || payload.length === 0) return null;
    type Item = { name: string; color: string };
    const ingresos: Item[] = [];
    const egresos: Item[] = [];
    // Agrupar por dataKey ing_<id>/egr_<id> y ordenar alfabéticamente por nombre
    payload.forEach((p: any) => {
      const dk: string = p?.dataKey || '';
      const isIng = dk.startsWith('ing_');
      const idStr = dk.replace(/^ing_|^egr_/, '');
      const id = Number(idStr);
      const nombre = tiposCaja.find(t => t.idTipoCaja === id)?.nombreTipoCaja || p?.value || dk;
      const entry = { name: nombre, color: p?.color || (isIng ? '#16a34a' : '#dc2626') };
      if (isIng) ingresos.push(entry); else egresos.push(entry);
    });
    ingresos.sort((a, b) => a.name.localeCompare(b.name));
    egresos.sort((a, b) => a.name.localeCompare(b.name));
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-2 py-1 text-xs md:text-sm">
        <div>
          <div className="font-semibold" style={{ color: '#16a34a' }}>Ingresos</div>
          <ul className="mt-1 space-y-0.5">
            {ingresos.map((it, idx) => (
              <li key={`ing-legend-${idx}`} className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: it.color }} />
                <span style={{ color: it.color }}>{it.name}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-semibold" style={{ color: '#dc2626' }}>Egresos</div>
          <ul className="mt-1 space-y-0.5">
            {egresos.map((it, idx) => (
              <li key={`egr-legend-${idx}`} className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: it.color }} />
                <span style={{ color: it.color }}>{it.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // Handlers
  const handleYearChange = (anio: number) => {
    setFilters(prev => ({ ...prev, anio }));
  };

  const handleTipoCajaChange = (idTipoCaja: number, checked: boolean) => {
    setFilters(prev => {
      const newTiposCaja = checked
        ? [...prev.tiposCaja, idTipoCaja]
        : prev.tiposCaja.filter(id => id !== idTipoCaja);
      if (newTiposCaja.length === 0) {
        setValidationErrors({ ...validationErrors, tiposCaja: 'Debe seleccionar al menos un tipo de caja' });
      } else if (validationErrors.tiposCaja) {
        const { tiposCaja, ...rest } = validationErrors;
        setValidationErrors(rest);
      }
      return { ...prev, tiposCaja: newTiposCaja };
    });
  };

  const handleTipoMovimientoChange = (tipoMovimiento: 'I' | 'E' | 'T' | null) => {
    setFilters(prev => ({ ...prev, tipoMovimiento }));
  };

  const validateFilters = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (filters.tiposCaja.length === 0) {
      errors.tiposCaja = 'Debe seleccionar al menos un tipo de caja';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleApplyFilters = () => {
    if (!validateFilters()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setGridLoading(true);
    const cajaService = CajaService.getInstance();
    const req: FlujoCajaConsolidadoRequest = {
      anio: filters.anio,
      idsTipoCaja: filters.tiposCaja,
      tipoMovimiento: filters.tipoMovimiento,
    };
    const mapCon = (rows: any[]) => rows.map((r: any) => ({
          idTipoCaja: r.idTipoCaja ?? r.IdTipoCaja ?? 0,
          nombreTipoCaja: r.nombreTipoCaja ?? r.NombreTipoCaja ?? '',
          tipoMovimiento: r.tipoMovimiento ?? r.TipoMovimiento ?? 'I',
          ene: Number(r.ene ?? r.Ene ?? 0),
          feb: Number(r.feb ?? r.Feb ?? 0),
          mar: Number(r.mar ?? r.Mar ?? 0),
          abr: Number(r.abr ?? r.Abr ?? 0),
          may: Number(r.may ?? r.May ?? 0),
          jun: Number(r.jun ?? r.Jun ?? 0),
          jul: Number(r.jul ?? r.Jul ?? 0),
          ago: Number(r.ago ?? r.Ago ?? 0),
          set: Number(r.set ?? r.Set ?? 0),
          oct: Number(r.oct ?? r.Oct ?? 0),
          nov: Number(r.nov ?? r.Nov ?? 0),
          dic: Number(r.dic ?? r.Dic ?? 0),
        })) as FlujoCajaConsolidadoResponse[];

    const mapDet = (rows: any[]) => rows.map((r: any) => ({
      idTipoCaja: r.idTipoCaja ?? r.IdTipoCaja ?? 0,
      nombreTipoCaja: r.nombreTipoCaja ?? r.NombreTipoCaja ?? '',
      tipoMovimiento: r.tipoMovimiento ?? r.TipoMovimiento ?? 'I',
      detalleTipo: r.detalleTipo ?? r.DetalleTipo ?? '',
      idDetalle: r.idDetalle ?? r.IdDetalle ?? 0,
      nombreDetalle: r.nombreDetalle ?? r.NombreDetalle ?? '',
      ene: Number(r.ene ?? r.Ene ?? 0),
      feb: Number(r.feb ?? r.Feb ?? 0),
      mar: Number(r.mar ?? r.Mar ?? 0),
      abr: Number(r.abr ?? r.Abr ?? 0),
      may: Number(r.may ?? r.May ?? 0),
      jun: Number(r.jun ?? r.Jun ?? 0),
      jul: Number(r.jul ?? r.Jul ?? 0),
      ago: Number(r.ago ?? r.Ago ?? 0),
      set: Number(r.set ?? r.Set ?? 0),
      oct: Number(r.oct ?? r.Oct ?? 0),
      nov: Number(r.nov ?? r.Nov ?? 0),
      dic: Number(r.dic ?? r.Dic ?? 0),
      total: Number(r.total ?? r.Total ?? 0),
    })) as FlujoCajaDetalladoResponse[];

    Promise.all([
      cajaService.flujoCajaConsolidado(req),
      cajaService.flujoCajaDetallado(req)
    ])
      .then(([respCon, respDet]) => {
        const rowsCon = Array.isArray(respCon?.objModel) ? respCon.objModel : [];
        const rowsDet = Array.isArray(respDet?.objModel) ? respDet.objModel : [];
        setConsolidado(mapCon(rowsCon));
        setDetallado(mapDet(rowsDet));
      })
      .catch(e => {
        setError(typeof e?.message === 'string' ? e.message : 'No se pudo cargar los flujos');
      })
      .finally(() => {
        setLoading(false);
        setGridLoading(false);
      });
  };

  const handleSelectAllTiposCaja = (selectAll: boolean) => {
    if (selectAll) {
      setFilters(prev => ({
        ...prev,
        tiposCaja: tiposCaja.map(t => t.idTipoCaja)
      }));
      if (validationErrors.tiposCaja) {
        const { tiposCaja, ...rest } = validationErrors;
        setValidationErrors(rest);
      }
    } else {
      setValidationErrors({ ...validationErrors, tiposCaja: 'Debe seleccionar al menos un tipo de caja' });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flujo de Caja</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Visualización del flujo de ingresos y egresos por tipo de caja y período
          </p>
        </div>
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

      {/* Filters Panel */}
      <motion.div
        initial={false}
        animate={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Año Filter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4" />
                Año
              </label>
              <select
                value={filters.anio}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Tipo Movimiento Filter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <TrendingUp className="w-4 h-4" />
                Tipo de Movimiento
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoMovimiento"
                    checked={filters.tipoMovimiento === 'T'}
                    onChange={() => handleTipoMovimientoChange('T')}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Todos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoMovimiento"
                    checked={filters.tipoMovimiento === 'I'}
                    onChange={() => handleTipoMovimientoChange('I')}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Ingresos
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoMovimiento"
                    checked={filters.tipoMovimiento === 'E'}
                    onChange={() => handleTipoMovimientoChange('E')}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Egresos
                  </span>
                </label>
              </div>
            </div>

            {/* Tipo Caja Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Layers className="w-4 h-4" />
                  Tipos de Caja
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectAllTiposCaja(true)}
                    className="text-xs text-primary hover:text-primary-dark underline"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => handleSelectAllTiposCaja(false)}
                    className="text-xs text-gray-400 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <div className={`border rounded-lg p-3 max-h-32 overflow-y-auto transition-colors ${
                validationErrors.tiposCaja ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {tiposCaja.map(tipo => (
                  <label key={tipo.idTipoCaja} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2">
                    <input
                      type="checkbox"
                      checked={filters.tiposCaja.includes(tipo.idTipoCaja)}
                      onChange={(e) => handleTipoCajaChange(tipo.idTipoCaja, e.target.checked)}
                      className="w-4 h-4 text-primary focus:ring-primary rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{tipo.nombreTipoCaja}</span>
                  </label>
                ))}
              </div>
              {validationErrors.tiposCaja && (
                <p className="text-xs text-red-600 dark:text-red-400">{validationErrors.tiposCaja}</p>
              )}
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <motion.button
              onClick={handleApplyFilters}
              disabled={loading || !!validationErrors.tiposCaja || filters.tiposCaja.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-60 text-white rounded-lg transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <DollarSign className="w-4 h-4" />
              {loading ? 'Aplicando...' : 'Aplicar Filtros'}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Results Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700 bg-primary text-white rounded-t-lg px-4 py-4 md:px-6 md:py-6 flex items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold">Flujo de Caja Consolidado</h2>
            <p className="text-xs md:text-sm opacity-90 mt-1">
            {filters.anio} • {tiposCaja.filter(t => filters.tiposCaja.includes(t.idTipoCaja)).map(t => t.nombreTipoCaja).join(', ')} • 
            {filters.tipoMovimiento === 'T' ? 'Todos' : filters.tipoMovimiento === 'I' ? 'Ingresos' : 'Egresos'}
            </p>
          </div>
          <motion.button
            onClick={() => setShowChartModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs md:text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LineChartIcon className="w-4 h-4" />
            Ver Gráfico
          </motion.button>
        </div>
        
        <div className="pb-6">
          {gridLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            </div>
          ) : (
            (() => {
              const monthKeys: Array<keyof FlujoCajaConsolidadoResponse> = ['ene','feb','mar','abr','may','jun','jul','ago','set','oct','nov','dic'];
              const format = (n: number) => Number(n || 0).toLocaleString('es-PE');
              const ingresos = consolidado.filter(r => r.tipoMovimiento === 'I');
              const egresos = consolidado.filter(r => r.tipoMovimiento === 'E');
              const sumRow = (rows: FlujoCajaConsolidadoResponse[]) => {
                const acc: Record<string, number> = {};
                monthKeys.forEach(k => { acc[k as string] = rows.reduce((s, r) => s + (r[k] as number || 0), 0); });
                return acc;
              };
              const totIng = sumRow(ingresos);
              const totEgr = sumRow(egresos);
              const saldoMes: Record<string, number> = {};
              monthKeys.forEach(k => { saldoMes[k as string] = (totIng[k as string] || 0) - (totEgr[k as string] || 0); });
              const saldoFinalAcum: Record<string, number> = {};
              let acum = 0;
              monthKeys.forEach(k => { acum += saldoMes[k as string] || 0; saldoFinalAcum[k as string] = acum; });
              const finalTotal = (() => {
                for (let i = monthKeys.length - 1; i >= 0; i--) {
                  const v = saldoFinalAcum[monthKeys[i] as string] || 0;
                  if (Math.abs(v) > 0) return v;
                }
                return saldoFinalAcum[monthKeys[monthKeys.length - 1] as string] || 0;
              })();

              const headerCells = (
                <tr>
                  <th className="px-1 sm:px-2 md:px-3 py-2 text-left text-[10px] sm:text-xs md:text-sm">&nbsp;</th>
                  {monthKeys.map((k, idx) => (
                    <th key={String(k)} className="px-1 sm:px-2 md:px-3 py-2 text-right text-[10px] sm:text-[11px] md:text-sm text-white">{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'][idx]}-{String(filters.anio).slice(-2)}</th>
                  ))}
                  <th className="px-1 sm:px-2 md:px-3 py-2 text-right text-[10px] sm:text-[11px] md:text-sm text-white">TOTAL</th>
                </tr>
              );

              const renderSection = (title: string, rows: FlujoCajaConsolidadoResponse[], tipo: 'I' | 'E') => (
                <>
                  <tr className={`${tipo === 'I' ? 'bg-green-700' : 'bg-red-700'} text-white`}>
                    <th className="px-2 md:px-3 py-2 text-left text-xs md:text-sm" colSpan={monthKeys.length + 2}>{title}</th>
                  </tr>
                  {rows.map((r, i) => (
                    <tr key={`${r.idTipoCaja}-${r.tipoMovimiento}-${i}`} className="border-t">
                      <td className="px-1 sm:px-2 md:px-3 py-2 text-left text-gray-800 dark:text-gray-200 text-[10px] sm:text-xs md:text-sm">{r.nombreTipoCaja}</td>
                      {monthKeys.map(k => (
                        <td
                          key={String(k)}
                          className={`px-1 sm:px-2 md:px-3 py-2 text-right text-[10px] sm:text-xs md:text-sm ${
                            tipo === 'I' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          {format(r[k] as number)}
                        </td>
                      ))}
                      <td
                        className={`px-1 sm:px-2 md:px-3 py-2 text-right font-semibold text-[10px] sm:text-xs md:text-sm ${
                          tipo === 'I' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {format(monthKeys.reduce((s, k) => s + (r[k] as number || 0), 0))}
                      </td>
                    </tr>
                  ))}
                </>
              );

              return (
                <div className="overflow-x-auto overflow-y-auto max-h-[60vh] md:max-h-[68vh] xl:max-h-[70vh]">
                  <table className="w-full">
                    <thead className="bg-primary">{headerCells}</thead>
                    <tbody>
                      {renderSection('INGRESOS UN. NEGOCIO', ingresos, 'I')}
                      <tr className="bg-green-700 text-white">
                        <td className="px-2 md:px-3 py-2 text-left font-semibold text-xs md:text-sm">TOTAL INGRESOS UN. NEGOCIO</td>
                        {monthKeys.map(k => (<td key={`totI-${String(k)}`} className="px-2 md:px-3 py-2 text-right font-semibold text-xs md:text-sm">{format(totIng[k as string] || 0)}</td>))}
                        <td className="px-2 md:px-3 py-2 text-right font-bold text-xs md:text-sm">{format(monthKeys.reduce((s,k)=> s + (totIng[k as string] || 0), 0))}</td>
                      </tr>

                      {renderSection('EGRESOS UN. NEGOCIO', egresos, 'E')}
                      <tr className="bg-red-700 text-white">
                        <td className="px-2 md:px-3 py-2 text-left font-semibold text-xs md:text-sm">TOTAL EGRESOS UN. NEGOCIO</td>
                        {monthKeys.map(k => (<td key={`totE-${String(k)}`} className="px-2 md:px-3 py-2 text-right font-semibold text-xs md:text-sm">{format(totEgr[k as string] || 0)}</td>))}
                        <td className="px-2 md:px-3 py-2 text-right font-bold text-xs md:text-sm">{format(monthKeys.reduce((s,k)=> s + (totEgr[k as string] || 0), 0))}</td>
                      </tr>

                      <tr className="bg-primary text-white">
                        <td className="px-2 md:px-3 py-2 text-left font-semibold text-xs md:text-sm">SALDO DE CAJA</td>
                        {monthKeys.map(k => (<td key={`saldo-${String(k)}`} className="px-2 md:px-3 py-2 text-right font-semibold text-xs md:text-sm">{format(saldoMes[k as string] || 0)}</td>))}
                        <td className="px-2 md:px-3 py-2 text-right font-bold text-xs md:text-sm">{format(monthKeys.reduce((s,k)=> s + (saldoMes[k as string] || 0), 0))}</td>
                      </tr>
                      <tr className="bg-white text-blue-700 dark:text-blue-400">
                        <td className="px-2 md:px-3 py-2 text-left font-semibold text-xs md:text-sm">SALDO DE CAJA INICIAL</td>
                        {monthKeys.map(k => (<td key={`saldoIni-${String(k)}`} className="px-2 md:px-3 py-2 text-right font-semibold text-xs md:text-sm">{format(0)}</td>))}
                        <td className="px-2 md:px-3 py-2 text-right font-bold text-xs md:text-sm">{format(0)}</td>
                      </tr>
                      <tr className="bg-primary text-white">
                        <td className="px-2 md:px-3 py-2 text-left font-semibold text-xs md:text-sm">SALDO DE CAJA FINAL</td>
                        {monthKeys.map(k => (<td key={`saldoFin-${String(k)}`} className="px-2 md:px-3 py-2 text-right font-semibold text-xs md:text-sm">{format(saldoFinalAcum[k as string] || 0)}</td>))}
                        <td className="px-2 md:px-3 py-2 text-right font-bold text-xs md:text-sm">{format(finalTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Chart Modal */}
      <AnimatePresence>
        {showChartModal && (
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
              className="w-[95vw] max-w-[95vw] h-[85vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col"
            >
              <div className="px-4 md:px-6 py-4 bg-primary text-white rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5" />
                  <h3 className="text-base md:text-lg font-semibold">Análisis gráfico del flujo</h3>
                </div>
                <button className="p-2 rounded-md hover:bg-primary-dark" onClick={() => setShowChartModal(false)}>
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="px-4 md:px-6 py-4 space-y-4 overflow-y-auto flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="chartMode" checked={chartMode === 'multi'} onChange={() => setChartMode('multi')} />
                    Comparativo por tipo (Ingresos/Egresos por caja)
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="chartMode" checked={chartMode === 'global'} onChange={() => setChartMode('global')} />
                    Global (agregado)
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="chartMode" checked={chartMode === 'tipo'} onChange={() => setChartMode('tipo')} />
                    Por tipo de caja
                  </label>
                  {chartMode === 'tipo' && (
                    <select
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                      value={selectedTypeForChart ?? ''}
                      onChange={(e) => setSelectedTypeForChart(Number(e.target.value))}
                    >
                      {tiposCaja.filter(t => filters.tiposCaja.includes(t.idTipoCaja)).map(t => (
                        <option key={t.idTipoCaja} value={t.idTipoCaja}>{t.nombreTipoCaja}</option>
                      ))}
                    </select>
                  )}
                  {(chartMode === 'global' || chartMode === 'multi') && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Tipos incluidos:</span>
                      {tiposCaja.filter(t => filters.tiposCaja.includes(t.idTipoCaja)).map(t => (
                        <label key={t.idTipoCaja} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600">
                          <input
                            type="checkbox"
                            checked={selectedTypesForChart.includes(t.idTipoCaja)}
                            onChange={(e) => {
                              setSelectedTypesForChart(prev => {
                                const next = e.target.checked ? [...prev, t.idTipoCaja] : prev.filter(id => id !== t.idTipoCaja);
                                return next.length === 0 ? prev : next; // evitar vacío
                              });
                            }}
                          />
                          <span>{t.nombreTipoCaja}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="h-[40vh]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartMode === 'multi' ? chartDataMulti : chartMode === 'global' ? chartDataGlobal : chartDataTipo} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tick={{ fill: '#374151', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(v) => Number(v).toLocaleString('es-PE')} />
                      {chartMode === 'multi' ? (
                        <Tooltip content={<MultiTooltip />} />
                      ) : (
                        <Tooltip formatter={(value: any) => `S/. ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} />
                      )}
                      <Legend />
                      {chartMode === 'multi' && selectedTypesForChart.map((id, i) => (
                        <>
                          <Line key={`ing_${id}`} type="monotone" dataKey={`ing_${id}`} name={`${tiposCaja.find(t => t.idTipoCaja === id)?.nombreTipoCaja || id} – Ingresos`} stroke={greens[i % greens.length]} strokeWidth={2.2} dot={{ r: 1.8 }} activeDot={{ r: 3.2 }} />
                          <Line key={`egr_${id}`} type="monotone" dataKey={`egr_${id}`} name={`${tiposCaja.find(t => t.idTipoCaja === id)?.nombreTipoCaja || id} – Egresos`} stroke={reds[i % reds.length]} strokeWidth={2.2} strokeDasharray="5 3" dot={{ r: 1.8 }} activeDot={{ r: 3.2 }} />
                        </>
                      ))}
                      {chartMode !== 'multi' && (
                        <>
                          <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="egresos" name="Egresos" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        </>
                      )}
                      <Legend content={chartMode === 'multi' ? renderCustomLegend : undefined} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {(() => {
                  const sumByType = (tipo: 'I' | 'E') => {
                    return tiposCaja
                      .filter(t => selectedTypesForChart.includes(t.idTipoCaja))
                      .map((t, i) => {
                        const sum = monthKeys.reduce((acc, k) => {
                          const rows = consolidado.filter(r => r.idTipoCaja === t.idTipoCaja && r.tipoMovimiento === tipo);
                          const val = rows.reduce((s, r) => s + (r[k] as number || 0), 0);
                          return acc + val;
                        }, 0);
                        return { name: t.nombreTipoCaja, value: sum, color: tipo === 'I' ? greens[i % greens.length] : reds[i % reds.length] };
                      });
                  };
                  const pieIngresosData = sumByType('I');
                  const pieEgresosData = sumByType('E');
                  const radarData = monthKeys.map((k, idx) => {
                    const inc = consolidado.filter(r => selectedTypesForChart.includes(r.idTipoCaja) && r.tipoMovimiento === 'I')
                      .reduce((s, r) => s + (r[k] as number || 0), 0);
                    const egr = consolidado.filter(r => selectedTypesForChart.includes(r.idTipoCaja) && r.tipoMovimiento === 'E')
                      .reduce((s, r) => s + (r[k] as number || 0), 0);
                    return { mes: `${monthLabels[idx]}-${String(filters.anio).slice(-2)}`, ingresos: inc, egresos: egr };
                  });
                  return (
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                        <div className="text-sm font-semibold mb-2" style={{ color: '#16a34a' }}>Distribución de Ingresos por caja</div>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={pieIngresosData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={2}>
                              {pieIngresosData.map((entry, index) => (
                                <Cell key={`cell-ing-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: any) => `S/. ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          {pieIngresosData
                            .slice()
                            .sort((a, b) => b.value - a.value)
                            .map((d, i) => (
                              <div key={`ing-legend2-${i}`} className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="truncate">{d.name}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                        <div className="text-sm font-semibold mb-2" style={{ color: '#dc2626' }}>Distribución de Egresos por caja</div>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={pieEgresosData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={2}>
                              {pieEgresosData.map((entry, index) => (
                                <Cell key={`cell-egr-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: any) => `S/. ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          {pieEgresosData
                            .slice()
                            .sort((a, b) => b.value - a.value)
                            .map((d, i) => (
                              <div key={`egr-legend2-${i}`} className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="truncate">{d.name}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                        <div className="text-sm font-semibold mb-2 text-primary">Radar mensual Ingresos vs Egresos</div>
                        <ResponsiveContainer width="100%" height={280}>
                          <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="mes" tick={{ fontSize: 10 }} />
                            <PolarRadiusAxis tick={{ fontSize: 10 }} />
                            <Radar name="Ingresos" dataKey="ingresos" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
                            <Radar name="Egresos" dataKey="egresos" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
                            <Legend />
                            <Tooltip formatter={(v: any) => `S/. ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flujo de Caja Detallado */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
        <div className="border-b border-gray-200 dark:border-gray-700 bg-primary text-white rounded-t-lg px-4 py-4 md:px-6 md:py-6 flex items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold">Flujo de Caja Detallado</h2>
            <p className="text-xs md:text-sm opacity-90 mt-1">
              Clasificador: Ingresos por forma de pago y Egresos por origen
            </p>
          </div>
          <motion.button
            onClick={() => setShowDetailChartModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs md:text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LineChartIcon className="w-4 h-4" />
            Ver Gráfico
          </motion.button>
        </div>
        <div className="pb-6">
          {(() => {
            const monthLabels2 = monthLabels;
            const keys = monthKeys;
            const format = (n: number) => Number(n || 0).toLocaleString('es-PE');
            const ingresos = detallado.filter(r => r.tipoMovimiento === 'I');
            const egresos = detallado.filter(r => r.tipoMovimiento === 'E');

            const groupByTipoCaja = (rows: FlujoCajaDetalladoResponse[]) => {
              const map: Record<number, { nombre: string; items: FlujoCajaDetalladoResponse[] }> = {};
              rows.forEach(r => {
                if (!map[r.idTipoCaja]) map[r.idTipoCaja] = { nombre: r.nombreTipoCaja, items: [] };
                map[r.idTipoCaja].items.push(r);
              });
              return Object.entries(map).map(([id, v]) => ({ id: Number(id), nombre: v.nombre, items: v.items.sort((a,b)=> a.nombreDetalle.localeCompare(b.nombreDetalle)) }));
            };

            const totMes = (rows: FlujoCajaDetalladoResponse[]) => {
              const acc: Record<string, number> = {};
              keys.forEach(k => { acc[k as string] = rows.reduce((s,r)=> s + (r[k] as number || 0), 0); });
              return acc;
            };

            const ingresosByCaja = groupByTipoCaja(ingresos);
            const egresosByCaja = groupByTipoCaja(egresos);
            const totIng = totMes(ingresos);
            const totEgr = totMes(egresos);
            const saldoMes: Record<string, number> = {};
            keys.forEach(k => { saldoMes[k as string] = (totIng[k as string] || 0) - (totEgr[k as string] || 0); });
            const saldoFinalAcum: Record<string, number> = {};
            let acum = 0; keys.forEach(k => { acum += saldoMes[k as string] || 0; saldoFinalAcum[k as string] = acum; });
            const finalTotal = (() => { for (let i = keys.length-1; i>=0; i--) { const v = saldoFinalAcum[keys[i] as string] || 0; if (Math.abs(v) > 0) return v; } return 0; })();

            const header = (
              <tr>
                <th className="px-2 md:px-3 py-2 text-left text-xs md:text-sm">&nbsp;</th>
                {keys.map((k,i)=>(<th key={String(k)} className="px-2 md:px-3 py-2 text-right text-[11px] md:text-sm text-white">{monthLabels2[i]}-{String(filters.anio).slice(-2)}</th>))}
                <th className="px-2 md:px-3 py-2 text-right text-[11px] md:text-sm text-white">TOTAL</th>
              </tr>
            );

            const renderCaja = (title: string, data: { id:number; nombre:string; items: FlujoCajaDetalladoResponse[] }[], tipo: 'I'|'E') => (
              <>
                <tr className={`${tipo==='I'?'bg-green-700':'bg-red-700'} text-white`}>
                  <th className="px-2 md:px-3 py-2 text-left text-xs md:text-sm" colSpan={keys.length+2}>{title}</th>
                </tr>
                {data.map(box => (
                  <>
                    <tr className="bg-primary text-white">
                      <td className="px-2 md:px-3 py-2 text-left font-semibold" colSpan={keys.length+2}>{box.nombre}</td>
                    </tr>
                    {box.items.map((r, idx) => (
                      <tr key={`${box.id}-${r.idDetalle}-${idx}`} className="border-t">
                        <td className="px-2 md:px-3 py-2 text-left text-gray-800 dark:text-gray-200 text-xs md:text-sm">{r.nombreDetalle}</td>
                        {keys.map(k => (<td key={String(k)} className={`px-2 md:px-3 py-2 text-right text-xs md:text-sm ${tipo==='I'?'text-green-700 dark:text-green-400':'text-red-700 dark:text-red-400'}`}>{format(r[k] as number)}</td>))}
                        <td className="px-2 md:px-3 py-2 text-right font-semibold text-xs md:text-sm">{format(r.total)}</td>
                      </tr>
                    ))}
                  </>
                ))}
              </>
            );

            return (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary">{header}</thead>
                  <tbody>
                    {renderCaja('INGRESOS UN. NEGOCIO (Detalle)', ingresosByCaja, 'I')}
                    <tr className="bg-green-700 text-white">
                      <td className="px-2 md:px-3 py-2 text-left font-semibold text-xs md:text-sm">TOTAL INGRESOS UN. NEGOCIO (Detalle)</td>
                      {keys.map(k => (<td key={`i-${String(k)}`} className="px-2 md:px-3 py-2 text-right font-semibold text-xs md:text-sm">{format(totIng[k as string] || 0)}</td>))}
                      <td className="px-2 md:px-3 py-2 text-right font-bold text-xs md:text-sm">{format(Object.values(totIng).reduce((s,v)=> s + (v || 0), 0))}</td>
                    </tr>

                    {renderCaja('EGRESOS UN. NEGOCIO (Detalle)', egresosByCaja, 'E')}
                    <tr className="bg-red-700 text-white">
                      <td className="px-2 md:px-3 py-2 text-left font-semibold text-xs md:text-sm">TOTAL EGRESOS UN. NEGOCIO (Detalle)</td>
                      {keys.map(k => (<td key={`e-${String(k)}`} className="px-2 md:px-3 py-2 text-right font-semibold text-xs md:text-sm">{format(totEgr[k as string] || 0)}</td>))}
                      <td className="px-2 md:px-3 py-2 text-right font-bold text-xs md:text-sm">{format(Object.values(totEgr).reduce((s,v)=> s + (v || 0), 0))}</td>
                    </tr>

                    <tr className="bg-primary text-white">
                      <td className="px-2 md:px-3 py-2 text-left font-semibold text-xs md:text-sm">SALDO DE CAJA</td>
                      {keys.map(k => (<td key={`s-${String(k)}`} className="px-2 md:px-3 py-2 text-right font-semibold text-xs md:text-sm">{format(saldoMes[k as string] || 0)}</td>))}
                      <td className="px-2 md:px-3 py-2 text-right font-bold text-xs md:text-sm">{format(Object.values(saldoMes).reduce((s,v)=> s + (v || 0), 0))}</td>
                    </tr>
                    <tr className="bg-white text-blue-700 dark:text-blue-400">
                      <td className="px-2 md:px-3 py-2 text-left font-semibold text-xs md:text-sm">SALDO DE CAJA INICIAL</td>
                      {keys.map(k => (<td key={`si-${String(k)}`} className="px-2 md:px-3 py-2 text-right font-semibold text-xs md:text-sm">{format(0)}</td>))}
                      <td className="px-2 md:px-3 py-2 text-right font-bold text-xs md:text-sm">{format(0)}</td>
                    </tr>
                    <tr className="bg-primary text-white">
                      <td className="px-2 md:px-3 py-2 text-left font-semibold text-xs md:text-sm">SALDO DE CAJA FINAL</td>
                      {keys.map(k => (<td key={`sf-${String(k)}`} className="px-2 md:px-3 py-2 text-right font-semibold text-xs md:text-sm">{format(saldoFinalAcum[k as string] || 0)}</td>))}
                      <td className="px-2 md:px-3 py-2 text-right font-bold text-xs md:text-sm">{format(finalTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Detail Chart Modal */}
      <AnimatePresence>
        {showDetailChartModal && (
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
              className="w-[95vw] max-w-[95vw] h-[75vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col"
            >
              <div className="px-4 md:px-6 py-4 bg-primary text-white rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5" />
                  <h3 className="text-base md:text-lg font-semibold">Análisis gráfico del flujo detallado</h3>
                </div>
                <button className="p-2 rounded-md hover:bg-primary-dark" onClick={() => setShowDetailChartModal(false)}>
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="px-4 md:px-6 py-4 space-y-4 overflow-y-auto flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="detailChartMode" checked={detailChartMode === 'multi'} onChange={() => setDetailChartMode('multi')} />
                    Comparativo por tipo (Ingresos/Egresos por caja)
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="detailChartMode" checked={detailChartMode === 'global'} onChange={() => setDetailChartMode('global')} />
                    Global (agregado)
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="detailChartMode" checked={detailChartMode === 'tipo'} onChange={() => setDetailChartMode('tipo')} />
                    Por tipo de caja
                  </label>
                  {detailChartMode === 'tipo' && (
                    <select
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                      value={selectedTypeForDetailChart ?? ''}
                      onChange={(e) => setSelectedTypeForDetailChart(Number(e.target.value))}
                    >
                      {tiposCaja.filter(t => filters.tiposCaja.includes(t.idTipoCaja)).map(t => (
                        <option key={t.idTipoCaja} value={t.idTipoCaja}>{t.nombreTipoCaja}</option>
                      ))}
                    </select>
                  )}
                  {(detailChartMode === 'global' || detailChartMode === 'multi') && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Tipos incluidos:</span>
                      {tiposCaja.filter(t => filters.tiposCaja.includes(t.idTipoCaja)).map(t => (
                        <label key={t.idTipoCaja} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600">
                          <input
                            type="checkbox"
                            checked={selectedTypesForDetailChart.includes(t.idTipoCaja)}
                            onChange={(e) => {
                              setSelectedTypesForDetailChart(prev => {
                                const next = e.target.checked ? [...prev, t.idTipoCaja] : prev.filter(id => id !== t.idTipoCaja);
                                return next.length === 0 ? prev : next;
                              });
                            }}
                          />
                          <span>{t.nombreTipoCaja}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="h-[40vh]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={detailChartMode === 'multi' ? detailChartDataMulti : detailChartMode === 'global' ? detailChartDataGlobal : detailChartDataTipo} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tick={{ fill: '#374151', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(v) => Number(v).toLocaleString('es-PE')} />
                      {detailChartMode === 'multi' ? (
                        <Tooltip content={<MultiTooltipDet />} />
                      ) : (
                        <Tooltip formatter={(value: any) => `S/. ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} />
                      )}
                      {detailChartMode === 'multi' && (() => {
                        const slug = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                        const ingresoCats = Array.from(new Set(
                          detallado.filter(r => r.tipoMovimiento === 'I' && selectedTypesForDetailChart.includes(r.idTipoCaja)).map(r => r.nombreDetalle)
                        )).sort();
                        const egresoCats = Array.from(new Set(
                          detallado.filter(r => r.tipoMovimiento === 'E' && selectedTypesForDetailChart.includes(r.idTipoCaja)).map(r => r.nombreDetalle)
                        )).sort();
                        const topIng = ingresoCats.slice(0, 6);
                        const topEgr = egresoCats.slice(0, 6);
                        return (
                          <>
                            {topIng.map((name, i) => (
                              <Line key={`ingd_${slug(name)}`} type="monotone" dataKey={`ingd_${slug(name)}`} name={`${name} – Ingresos`} stroke={greens[i % greens.length]} strokeWidth={2.2} dot={{ r: 1.8 }} activeDot={{ r: 3.2 }} />
                            ))}
                            {topEgr.map((name, i) => (
                              <Line key={`egrd_${slug(name)}`} type="monotone" dataKey={`egrd_${slug(name)}`} name={`${name} – Egresos`} stroke={reds[i % reds.length]} strokeWidth={2.2} strokeDasharray="5 3" dot={{ r: 1.8 }} activeDot={{ r: 3.2 }} />
                            ))}
                          </>
                        );
                      })()}
                      {detailChartMode !== 'multi' && (
                        <>
                          <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="egresos" name="Egresos" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        </>
                      )}
                      <Legend content={detailChartMode === 'multi' ? renderCustomLegendDet : undefined} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {(() => {
                  const slug = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                  // Distribución por categoría (nombreDetalle) agregada en el año
                  const sumByCategory = (tipo: 'I' | 'E') => {
                    const cats = Array.from(new Set(
                      detallado
                        .filter(r => r.tipoMovimiento === tipo && selectedTypesForDetailChart.includes(r.idTipoCaja))
                        .map(r => r.nombreDetalle)
                    ));
                    const result = cats.map((cat, i) => {
                      const total = monthKeys.reduce((acc, k) => acc + detallado
                        .filter(r => r.tipoMovimiento === tipo && r.nombreDetalle === cat && selectedTypesForDetailChart.includes(r.idTipoCaja))
                        .reduce((s, r) => s + (r[k] as number || 0), 0), 0);
                      return { name: cat, value: total, color: tipo === 'I' ? greens[i % greens.length] : reds[i % reds.length], key: slug(cat) };
                    });
                    // Ordenar desc y limitar top 10 para visualización
                    return result.sort((a, b) => b.value - a.value).slice(0, 10);
                  };
                  const pieIngresosData = sumByCategory('I');
                  const pieEgresosData = sumByCategory('E');
                  // Radar por categoría (ángulo = categoría, series = ingresos/egresos)
                  const allCats = Array.from(new Set([...pieIngresosData.map(d => d.name), ...pieEgresosData.map(d => d.name)]));
                  const radarData = allCats.map(cat => {
                    const inc = pieIngresosData.find(d => d.name === cat)?.value || 0;
                    const egr = pieEgresosData.find(d => d.name === cat)?.value || 0;
                    return { categoria: cat.toUpperCase(), ingresos: inc, egresos: egr };
                  });
                  return (
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                        <div className="text-sm font-semibold mb-2" style={{ color: '#16a34a' }}>Distribución de Ingresos por categoría (detallado)</div>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={pieIngresosData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={2}>
                              {pieIngresosData.map((entry, index) => (
                                <Cell key={`cell-ing-det-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: any) => `S/. ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          {pieIngresosData
                            .slice()
                            .sort((a, b) => b.value - a.value)
                            .map((d, i) => (
                              <div key={`ing-det-legend2-${i}`} className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="truncate">{d.name}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                        <div className="text-sm font-semibold mb-2" style={{ color: '#dc2626' }}>Distribución de Egresos por categoría (detallado)</div>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={pieEgresosData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={2}>
                              {pieEgresosData.map((entry, index) => (
                                <Cell key={`cell-egr-det-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: any) => `S/. ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          {pieEgresosData
                            .slice()
                            .sort((a, b) => b.value - a.value)
                            .map((d, i) => (
                              <div key={`egr-det-legend2-${i}`} className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="truncate">{d.name}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                        <div className="text-sm font-semibold mb-2 text-primary">Radar por categorías (Ingresos vs Egresos)</div>
                        <ResponsiveContainer width="100%" height={280}>
                          <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="categoria" tick={{ fontSize: 10 }} />
                            <PolarRadiusAxis tick={{ fontSize: 10 }} />
                            <Radar name="Ingresos" dataKey="ingresos" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
                            <Radar name="Egresos" dataKey="egresos" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
                            <Legend />
                            <Tooltip formatter={(v: any) => `S/. ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
};

export default FlujoCaja;
