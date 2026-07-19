import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
  X, Search, Calculator, Upload, RotateCcw, Check, XCircle, Activity, DollarSign, Clock,
  Users, Printer, CheckCircle, AlertCircle, FileText,
} from 'lucide-react';
import contabilidadService from '../../../../services/contabilidad/ContabilidadService';
import SearchableSelect from '../SearchableSelect';
import type {
  AnalisisHonorarioRow, HonorarioConsultorio, FormaPagoRow, HonorarioServicioInput,
  ProveedorRow, ComprobanteHonorarioInput,
} from '../../../../services/contabilidad/contaTypes';
import { descargarPlantillaAtenciones, formatDateToDDMMYYYY, getFirstComprobante } from './excelHonorarios';
import { abrirReciboHonorarioPDF, type ReciboHonorarioData } from './ReciboPDF';

// ---- helpers ----
const money = (n: number) => (n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const pad2 = (n: number) => String(n).padStart(2, '0');
const today = () => new Date().toISOString().slice(0, 10);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
const fmtFecha = (iso: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
// ⚠️ El campo `fechaPago` del análisis NO es ISO: el SP lo emite como 'dd/MM/yyyy HH:mm:ss'
// (CONVERT(...,103) + ' ' + CONVERT(...,8), ej. '25/06/2026 18:20:54'). Helpers dedicados:
//  - soloFechaPago: parte fecha 'dd/MM/yyyy' para MOSTRAR (sin hora), '' si no es válida.
//  - fechaPagoToISO: 'yyyy-MM-dd' ordenable para comparar min/max lexicográficamente (nunca new Date).
const soloFechaPago = (s?: string) => {
  const raw = (s || '').slice(0, 10);
  return /^\d{2}\/\d{2}\/\d{4}$/.test(raw) ? raw : '';
};
const fechaPagoToISO = (s?: string) => {
  const raw = soloFechaPago(s);
  return raw ? `${raw.slice(6, 10)}-${raw.slice(3, 5)}-${raw.slice(0, 2)}` : '';
};
// Rango del mes anterior (primer y último día) en YYYY-MM-DD.
const prevMonthRange = (): { desde: string; hasta: string } => {
  const now = new Date();
  const prevIdx = now.getMonth() - 1;
  const prevYear = prevIdx >= 0 ? now.getFullYear() : now.getFullYear() - 1;
  const idx = (prevIdx + 12) % 12;
  const lastDay = new Date(prevYear, idx + 1, 0).getDate();
  return { desde: `${prevYear}-${pad2(idx + 1)}-01`, hasta: `${prevYear}-${pad2(idx + 1)}-${pad2(lastDay)}` };
};
const CONSULTORIO_TODOS = -1;

// Pseudo-médico institucional (cuenta del sa/clínica): agrupa los servicios SIN médico tratante.
// Criterio ROBUSTO: es "sin médico tratante" ⟺ medicoId === 11. NO se usa la especialidad ('- - -')
// como marcador — un médico real JAMÁS tiene id 11, pero podría tener especialidad vacía, y
// bloquear a un médico real sería un fallo peor. Estos servicios se muestran pero NO son liquidables.
const ID_SIN_MEDICO = 11;
const esSinMedico = (medicoId: number) => medicoId === ID_SIN_MEDICO;

// Fila del análisis con clave estable para la selección (v_ServiceId + consultorioId + índice).
interface AnalisisRow extends AnalisisHonorarioRow { _key: string; }

const selCls = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRegistrado: () => void; // refresca el grid de pagos
}

const GenerarPagoHonorarioModal: React.FC<Props> = ({ isOpen, onClose, onRegistrado }) => {
  // Parámetros
  const [consultorioId, setConsultorioId] = useState<number>(CONSULTORIO_TODOS);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  // Catálogos conta
  const [consultorios, setConsultorios] = useState<HonorarioConsultorio[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPagoRow[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorRow[]>([]);

  // Análisis
  const [rows, setRows] = useState<AnalisisRow[]>([]);
  const [analizado, setAnalizado] = useState(false);
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);
  // Tipo de producción a liquidar (mono-tipo): agrupa client-side; el radio filtra upstream (rowsTipo)
  const [tipoProduccion, setTipoProduccion] = useState<'CLINICA' | 'SISOL'>('CLINICA');

  // Selección
  const [selectedMedicos, setSelectedMedicos] = useState<Set<number>>(new Set());
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Filtros locales del grid
  const [filtros, setFiltros] = useState({ paciente: '', comprobante: '', precio: '', formaPago: 'Todos', estado: 'Todos' });

  // Validación Excel (opcional)
  const [validacionActiva, setValidacionActiva] = useState(false);
  const [validKeys, setValidKeys] = useState<Set<string>>(new Set());
  const [erroresExcel, setErroresExcel] = useState<{ comprobante: string; motivo: string }[]>([]);
  const [showErroresExcel, setShowErroresExcel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Cálculo (port exacto legacy)
  const [visaDiscountPercent, setVisaDiscountPercent] = useState(4);
  const [includeIgv, setIncludeIgv] = useState(true);
  const [manualPercents, setManualPercents] = useState<number[]>([]);
  const [manualInput, setManualInput] = useState('');

  // Datos del pago
  const [fechaPago, setFechaPago] = useState(today());
  const [idFormaPago, setIdFormaPago] = useState(0);
  const [porcRef, setPorcRef] = useState(65);
  const [glosa, setGlosa] = useState('');

  // Comprobante (Factura / Recibo por Honorarios) — OBLIGATORIO para registrar
  const [compTipo, setCompTipo] = useState<'' | '01' | '02'>('');
  const [compIdProveedor, setCompIdProveedor] = useState<number | null>(null);
  const [compRuc, setCompRuc] = useState('');
  const [compRazon, setCompRazon] = useState('');
  const [compSerie, setCompSerie] = useState('');
  const [compNumero, setCompNumero] = useState('');
  const [compFechaEmision, setCompFechaEmision] = useState(today());
  const [compFechaVenc, setCompFechaVenc] = useState('');
  const [compMoneda, setCompMoneda] = useState('PEN');
  const [compTipoCambio, setCompTipoCambio] = useState(1);
  const [compAplicaRetencion, setCompAplicaRetencion] = useState(false);
  const [compAplicaDetraccion, setCompAplicaDetraccion] = useState(false);
  const [compPorcDetraccion, setCompPorcDetraccion] = useState('');
  const [compMontoDetraccion, setCompMontoDetraccion] = useState('');
  const [compConstancia, setCompConstancia] = useState('');
  const [compObs, setCompObs] = useState('');

  // Registro
  const [registrando, setRegistrando] = useState(false);
  const [antiDoblePago, setAntiDoblePago] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ReciboHonorarioData | null>(null);

  // Reset al abrir
  useEffect(() => {
    if (!isOpen) return;
    const r = prevMonthRange();
    setConsultorioId(CONSULTORIO_TODOS);
    setDesde(r.desde); setHasta(r.hasta);
    setRows([]); setAnalizado(false); setTipoProduccion('CLINICA');
    setSelectedMedicos(new Set()); setSelectedKeys(new Set());
    setFiltros({ paciente: '', comprobante: '', precio: '', formaPago: 'Todos', estado: 'Todos' });
    setValidacionActiva(false); setValidKeys(new Set()); setErroresExcel([]); setShowErroresExcel(false);
    setVisaDiscountPercent(4); setIncludeIgv(true); setManualPercents([]); setManualInput('');
    setFechaPago(today()); setIdFormaPago(0); setPorcRef(65); setGlosa('');
    setCompTipo(''); setCompIdProveedor(null); setCompRuc(''); setCompRazon('');
    setCompSerie(''); setCompNumero(''); setCompFechaEmision(today()); setCompFechaVenc('');
    setCompMoneda('PEN'); setCompTipoCambio(1); setCompAplicaRetencion(false); setCompAplicaDetraccion(false);
    setCompPorcDetraccion(''); setCompMontoDetraccion(''); setCompConstancia(''); setCompObs('');
    setRegistrando(false); setAntiDoblePago(null); setResultado(null);
    (async () => {
      try {
        const [cons, fp, prov] = await Promise.all([
          contabilidadService.honorariosConsultorios(),
          contabilidadService.cajaFormasPago(),
          contabilidadService.proveedores(true),
        ]);
        setConsultorios(cons); setFormasPago(fp); setProveedores(prov);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error cargando catálogos');
      }
    })();
  }, [isOpen]);

  // ---- Análisis ----
  const analizar = async () => {
    if (!desde || !hasta) { toast.error('Seleccione el rango de fechas'); return; }
    setLoadingAnalisis(true);
    setTipoProduccion('CLINICA');
    setValidacionActiva(false); setValidKeys(new Set()); setErroresExcel([]);
    setSelectedMedicos(new Set()); setSelectedKeys(new Set());
    setFiltros({ paciente: '', comprobante: '', precio: '', formaPago: 'Todos', estado: 'Todos' });
    try {
      const data = await contabilidadService.honorariosAnalisis(consultorioId, desde, hasta);
      const withKeys: AnalisisRow[] = data.map((r, i) => ({ ...r, _key: `${r.v_ServiceId}|${r.consultorioId}|${r.idVenta}|${i}` }));
      setRows(withKeys);
      setAnalizado(true);
      if (withKeys.length === 0) toast('Sin atenciones en el periodo/consultorio', { icon: 'ℹ️' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error en el análisis');
    } finally {
      setLoadingAnalisis(false);
    }
  };

  // ---- Filtro upstream por tipo de producción (CLAVE) ----
  // rows NUNCA se re-mapea (las _key deben quedar estables). Toda la cadena (medicos, kpi,
  // rowsDeMedicos, selectedDetalles y el cruce Excel) cuelga de rowsTipo, no de rows.
  // Las filas con TipoProduccion === null (sin service, no pagables) quedan fuera de ambos grupos.
  const rowsTipo = useMemo(() => rows.filter((r) => r.TipoProduccion === tipoProduccion), [rows, tipoProduccion]);

  // ---- Agrupación por médico (KPIs + lista) ----
  const medicos = useMemo(() => {
    const map = new Map<number, {
      medicoId: number; nombre: string; especialidad: string; total: number; sumPrecios: number;
      pendientes: number; primer: string; ultimo: string; porcRef: number | null;
    }>();
    rowsTipo.forEach((r) => {
      // Extremos del periodo como STRING YYYY-MM-DD (sin new Date → sin shift UTC ni locale del navegador).
      // fechaPago llega como 'dd/MM/yyyy HH:mm:ss' → se normaliza a ISO ordenable. Orden lexicográfico
      // de YYYY-MM-DD == orden cronológico. '' si el dato viene nulo/vacío/malformado.
      const dia = fechaPagoToISO(r.fechaPago);
      const diaOk = dia !== '';
      const prev = map.get(r.medicoId);
      if (!prev) {
        map.set(r.medicoId, {
          medicoId: r.medicoId, nombre: r.nombreMedico || 'N/A', especialidad: r.especialidadMedico || '—',
          total: 1, sumPrecios: r.precioServicio || 0, pendientes: r.esPagado === 1 ? 0 : 1,
          primer: diaOk ? dia : '', ultimo: diaOk ? dia : '', porcRef: r.PorcRef,
        });
      } else {
        prev.total += 1;
        prev.sumPrecios += r.precioServicio || 0;
        if (r.esPagado !== 1) prev.pendientes += 1;
        if (diaOk) {
          prev.primer = !prev.primer || dia < prev.primer ? dia : prev.primer;
          prev.ultimo = !prev.ultimo || dia > prev.ultimo ? dia : prev.ultimo;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rowsTipo]);

  // KPIs a nivel de análisis
  const kpi = useMemo(() => ({
    totalServicios: rowsTipo.length,
    sumPrecios: rowsTipo.reduce((s, r) => s + (r.precioServicio || 0), 0),
    pendientes: rowsTipo.filter((r) => r.esPagado !== 1).length,
  }), [rowsTipo]);

  // Filas de los médicos seleccionados (base del grid)
  const rowsDeMedicos = useMemo(() => rowsTipo.filter((r) => selectedMedicos.has(r.medicoId) && !esSinMedico(r.medicoId)), [rowsTipo, selectedMedicos]);

  const formasPagoOpts = useMemo(() => {
    const set = new Set<string>();
    rowsDeMedicos.forEach((r) => { if (r.formaPagoName && r.formaPagoName.trim() && r.formaPagoName !== '-') set.add(r.formaPagoName); });
    return ['Todos', ...Array.from(set).sort()];
  }, [rowsDeMedicos]);

  // Grid visible con filtros locales
  const rowsVisibles = useMemo(() => rowsDeMedicos.filter((r) => {
    if (filtros.paciente.trim()) {
      const pac = `${r.apPaternoPaciente || ''} ${r.apMaternoPaciente || ''} ${r.nombresPaciente || ''}`.toLowerCase();
      if (!pac.includes(filtros.paciente.toLowerCase())) return false;
    }
    if (filtros.comprobante.trim() && !(r.v_ComprobantePago || '').toLowerCase().includes(filtros.comprobante.toLowerCase())) return false;
    if (filtros.precio.trim() && !String(r.precioServicio || 0).includes(filtros.precio)) return false;
    if (filtros.formaPago !== 'Todos' && (r.formaPagoName || '-') !== filtros.formaPago) return false;
    if (filtros.estado !== 'Todos') {
      const est = r.esPagado === 1 ? 'Pagado' : 'Pendiente';
      if (est !== filtros.estado) return false;
    }
    return true;
  }), [rowsDeMedicos, filtros]);

  // Detalles seleccionados (guardan su médico; sólo del médico seleccionado cuentan)
  // Cuelga de rowsTipo (no de rows): un servicio del tipo oculto JAMÁS entra al resumen de registro.
  const selectedDetalles = useMemo(
    () => rowsTipo.filter((r) => selectedKeys.has(r._key) && selectedMedicos.has(r.medicoId) && !esSinMedico(r.medicoId)),
    [rowsTipo, selectedKeys, selectedMedicos],
  );

  // ---- Cálculo (PORT EXACTO de la lógica legacy) ----
  const totalVisa = useMemo(() => selectedDetalles.reduce((s, d) => (
    (d.formaPagoName || '').toUpperCase().includes('VISA') ? s + (d.precioServicio || 0) : s), 0), [selectedDetalles]);
  const totalEfectivo = useMemo(() => selectedDetalles.reduce((s, d) => (
    (d.formaPagoName || '').toUpperCase().includes('EFECTIVO') ? s + (d.precioServicio || 0) : s), 0), [selectedDetalles]);
  const descuentoVisa = useMemo(() => totalVisa * (1 - clamp(visaDiscountPercent, 0, 100) / 100), [totalVisa, visaDiscountPercent]);
  const totalGeneral = useMemo(() => totalEfectivo + descuentoVisa, [totalEfectivo, descuentoVisa]);
  const totalSinIgv = useMemo(() => (includeIgv ? totalGeneral * 0.82 : totalGeneral), [totalGeneral, includeIgv]);
  const manualFactor = useMemo(() => manualPercents.reduce((acc, p) => acc * (p / 100), 1), [manualPercents]);
  const appliedTotalMedico = useMemo(() => totalSinIgv * (manualPercents.length ? manualFactor : 1), [totalSinIgv, manualPercents, manualFactor]);
  const totalServiciosSel = useMemo(() => selectedDetalles.reduce((s, d) => s + (d.precioServicio || 0), 0), [selectedDetalles]);

  // ---- Comprobante: preview EN VIVO (el valor autoritativo lo devuelve el GET tras registrar) ----
  // ImporteTotal NO editable = TotalPago del honorario ya calculado.
  const compTotal = useMemo(() => round2(appliedTotalMedico), [appliedTotalMedico]);
  const compBase = useMemo(() => (compTipo === '01' ? round2(compTotal / 1.18) : compTotal), [compTipo, compTotal]);
  const compIgv = useMemo(() => (compTipo === '01' ? round2(compTotal - compBase) : 0), [compTipo, compTotal, compBase]);
  const compRetencion = useMemo(
    () => (compTipo === '02' && compAplicaRetencion ? round2(compTotal * 0.08) : 0),
    [compTipo, compAplicaRetencion, compTotal],
  );
  const compDetraccion = useMemo(() => {
    if (!compAplicaDetraccion) return 0;
    if (compMontoDetraccion !== '') return round2(Number(compMontoDetraccion) || 0);
    if (compPorcDetraccion !== '') return round2(compTotal * (Number(compPorcDetraccion) || 0) / 100);
    return 0;
  }, [compAplicaDetraccion, compMontoDetraccion, compPorcDetraccion, compTotal]);
  const compNeto = useMemo(() => round2(compTotal - compRetencion - compDetraccion), [compTotal, compRetencion, compDetraccion]);
  const comprobanteValido = (compTipo === '01' || compTipo === '02') && !!compFechaEmision;
  const proveedorOpts = useMemo(
    () => proveedores.map((p) => ({ value: p.i_IdProveedor, label: `${p.Ruc} · ${p.RazonSocial}` })),
    [proveedores],
  );
  // Al elegir proveedor del catálogo: fija IdProveedor y autollena RUC/Razón (congelables al emitir).
  const onSelectProveedor = (id: number | null) => {
    setCompIdProveedor(id);
    if (id != null) {
      const p = proveedores.find((x) => x.i_IdProveedor === id);
      if (p) { setCompRuc(p.Ruc || ''); setCompRazon(p.RazonSocial || ''); }
    }
  };

  // ---- Handlers de selección ----
  const toggleMedico = (medicoId: number, checked: boolean) => {
    if (esSinMedico(medicoId)) return; // "Sin médico tratante": no seleccionable — no-op en todo path
    setSelectedMedicos((prev) => {
      const next = new Set(prev);
      if (checked) next.add(medicoId); else next.delete(medicoId);
      return next;
    });
    if (!checked) {
      // al desmarcar un médico, quitar sus servicios de la selección
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        rows.forEach((r) => { if (r.medicoId === medicoId) next.delete(r._key); });
        return next;
      });
    }
  };
  const toggleServicio = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key); else next.delete(key);
      return next;
    });
  };
  const seleccionablesVisibles = useMemo(() => rowsVisibles.filter((r) => r.esPagado !== 1), [rowsVisibles]);
  const allVisiblesSelected = seleccionablesVisibles.length > 0 && seleccionablesVisibles.every((r) => selectedKeys.has(r._key));
  const toggleAllVisibles = (checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      seleccionablesVisibles.forEach((r) => { if (checked) next.add(r._key); else next.delete(r._key); });
      return next;
    });
  };

  // % manual
  const addManualPercent = () => {
    const v = Number(manualInput);
    if (isNaN(v) || v <= 0 || v > 100) return;
    setManualPercents((prev) => [...prev, Math.round(v * 100) / 100]);
    setManualInput('');
  };
  const removeManualPercent = (idx: number) => setManualPercents((prev) => prev.filter((_, i) => i !== idx));
  const resetManualPercents = () => { setManualPercents([]); setManualInput(''); };

  // Default del % referencial cuando cambia el médico seleccionado (si es exactamente uno)
  const medicoUnico = selectedMedicos.size === 1 ? medicos.find((m) => selectedMedicos.has(m.medicoId)) : null;
  useEffect(() => {
    if (medicoUnico && medicoUnico.porcRef != null) setPorcRef(medicoUnico.porcRef);
    // Prefill de la razón social del emisor con el nombre del médico (solo si no hay proveedor elegido).
    if (medicoUnico && compIdProveedor == null) setCompRazon(medicoUnico.nombre);
  }, [medicoUnico?.medicoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Validación Excel (opcional) ----
  const onExcelFile = async (file: File) => {
    if (!analizado || rows.length === 0) { toast.error('Realice primero el análisis'); return; }
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets['Plantilla Atenciones'];
      if (!ws) { toast.error('No se encontró la hoja "Plantilla Atenciones"'); return; }
      const json = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(ws, { header: 1 });
      const items: { fecha: string; comprobante: string; matched: boolean; motivo: string }[] = [];
      for (let i = 1; i < json.length; i++) {
        const r = json[i];
        if (r && r.length >= 3 && r[0] && r[2]) {
          items.push({ fecha: String(r[0]), comprobante: String(r[2]).trim(), matched: false, motivo: '' });
        }
      }
      if (items.length === 0) { toast.error('El Excel no tiene filas válidas (Fecha y Comprobante obligatorios)'); return; }

      // Cruce: comprobante (primer token '|') + fecha ddMMyyyy — SOLO contra las filas del tipo activo.
      const nuevosValidos = new Set<string>();
      const medicosDeValidos = new Set<number>();
      rowsTipo.forEach((row) => {
        if (esSinMedico(row.medicoId)) return; // no autoseleccionar servicios sin médico tratante
        const compRow = getFirstComprobante(row.v_ComprobantePago);
        const it = items.find((x) => x.comprobante === compRow);
        if (it) {
          if (formatDateToDDMMYYYY(it.fecha) === formatDateToDDMMYYYY(soloFechaPago(row.fechaPago))) {
            it.matched = true; it.motivo = '';
            nuevosValidos.add(row._key);
            if (row.esPagado !== 1) medicosDeValidos.add(row.medicoId);
          } else {
            it.matched = false; it.motivo = 'No coincide la fecha';
          }
        }
      });
      items.forEach((it) => { if (!it.matched && !it.motivo) it.motivo = 'No se encuentra en el sistema'; });
      const errores = items.filter((it) => !it.matched).map((it) => ({ comprobante: it.comprobante, motivo: it.motivo }));

      setValidacionActiva(true);
      setValidKeys(nuevosValidos);
      setErroresExcel(errores);

      // Autoselección: médicos con válidos + sus servicios válidos pendientes
      setSelectedMedicos((prev) => { const n = new Set(prev); medicosDeValidos.forEach((m) => n.add(m)); return n; });
      setSelectedKeys(() => {
        const n = new Set<string>();
        rowsTipo.forEach((row) => { if (nuevosValidos.has(row._key) && row.esPagado !== 1 && !esSinMedico(row.medicoId)) n.add(row._key); });
        return n;
      });

      if (errores.length > 0) {
        setShowErroresExcel(true);
        toast(`Validación con ${errores.length} error(es). Se autoseleccionaron ${nuevosValidos.size} válidos.`, { icon: '⚠️' });
      } else {
        toast.success(`Validación OK. Se autoseleccionaron ${nuevosValidos.size} servicios.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error procesando el Excel');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const limpiarValidacion = () => { setValidacionActiva(false); setValidKeys(new Set()); setErroresExcel([]); setShowErroresExcel(false); };

  // Cambio de tipo de producción: resetea selección/filtros/validación Excel.
  // NO toca manualPercents/visaDiscountPercent/includeIgv ni datos de pago/comprobante.
  const cambiarTipoProduccion = (t: 'CLINICA' | 'SISOL') => {
    if (t === tipoProduccion) return;
    setTipoProduccion(t);
    setSelectedMedicos(new Set());
    setSelectedKeys(new Set());
    setFiltros({ paciente: '', comprobante: '', precio: '', formaPago: 'Todos', estado: 'Todos' });
    limpiarValidacion();
  };

  // ---- Registrar ----
  const puedeRegistrar = selectedMedicos.size === 1 && selectedDetalles.length > 0 && !!fechaPago && appliedTotalMedico > 0 && comprobanteValido;
  const registrar = async () => {
    setAntiDoblePago(null);
    if (selectedMedicos.size !== 1) { toast.error('Seleccione exactamente UN médico para registrar el pago'); return; }
    if (selectedDetalles.length === 0) { toast.error('Seleccione al menos un servicio'); return; }
    if (!fechaPago) { toast.error('Indique la fecha de pago'); return; }
    if (compTipo !== '01' && compTipo !== '02') { toast.error('Seleccione el tipo de comprobante'); return; }
    if (!compFechaEmision) { toast.error('Indique la fecha de emisión del comprobante'); return; }
    const medicoId = Array.from(selectedMedicos)[0];
    const medico = medicos.find((m) => m.medicoId === medicoId);
    if (!medico) { toast.error('Médico no encontrado'); return; }

    const servicios: HonorarioServicioInput[] = selectedDetalles.map((d) => ({
      ServiceId: d.v_ServiceId,
      IdConsultorio: d.consultorioId,
      Precio: round2(d.precioServicio || 0),
      Porc: porcRef,
    }));

    // Comprobante anidado (OBLIGATORIO). El ImporteTotal autoritativo lo deriva el SP = TotalPago.
    const comprobante: ComprobanteHonorarioInput = {
      TipoComprobante: compTipo,
      IdProveedor: compIdProveedor,
      RucEmisor: compRuc.trim() || null,
      RazonSocialEmisor: compRazon.trim() || null,
      Serie: compSerie.trim() || null,
      Numero: compNumero.trim() || null,
      FechaEmision: compFechaEmision,
      FechaVencimiento: compFechaVenc || null,
      Moneda: compMoneda || 'PEN',
      TipoCambio: compTipoCambio || 1,
      AplicaRetencion: compTipo === '02' ? compAplicaRetencion : false,
      AplicaDetraccion: compAplicaDetraccion,
      PorcDetraccion: compAplicaDetraccion && compPorcDetraccion !== '' ? Number(compPorcDetraccion) : null,
      MontoDetraccion: compAplicaDetraccion && compMontoDetraccion !== '' ? Number(compMontoDetraccion) : null,
      ConstanciaDetraccion: compAplicaDetraccion ? (compConstancia.trim() || null) : null,
      Observaciones: compObs.trim() || null,
    };

    setRegistrando(true);
    try {
      const res = await contabilidadService.honorariosPagoCrear({
        MedicoId: medicoId,
        MedicoNombre: medico.nombre,
        Desde: desde,
        Hasta: hasta,
        PorcMedico: porcRef,
        FechaPago: fechaPago,
        IdFormaPago: idFormaPago || null,
        IdCuentaBancaria: null,
        Glosa: glosa.trim() || null,
        TotalServicios: round2(totalServiciosSel),
        TotalPago: round2(appliedTotalMedico),
        Servicios: servicios,
        Comprobante: comprobante,
        TipoProduccion: tipoProduccion,
      });
      toast.success(`Pago registrado (#${res.i_IdPago}) por S/ ${money(round2(appliedTotalMedico))}`);
      onRegistrado();
      // Ofrecer imprimir el recibo (on-demand)
      setResultado({
        IdPago: res.i_IdPago,
        MedicoNombre: medico.nombre,
        PeriodoDesde: desde,
        PeriodoHasta: hasta,
        FechaPago: fechaPago,
        TotalServicios: round2(totalServiciosSel),
        TotalPago: round2(appliedTotalMedico),
        Glosa: glosa.trim() || null,
        Estado: 'PAGADO',
        TipoProduccion: tipoProduccion,
        TipoComprobante: compTipo || null,
        Serie: compSerie.trim() || null,
        Numero: compNumero.trim() || null,
        Consultorios: (res.Consultorios || []).map((c) => ({
          Nombre: c.v_ConsultorioNombre, MontoServicios: c.d_MontoServicios, MontoPago: c.d_MontoPago,
        })),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al registrar el pago';
      // Anti-doble-pago: resaltar los serviceIds ofensores si el backend los devuelve
      if (/ya pagad/i.test(msg)) setAntiDoblePago(msg);
      toast.error(msg);
    } finally {
      setRegistrando(false);
    }
  };

  if (!isOpen) return null;

  // Serviceids ofensores (para resaltar), extraídos tras el último ':'
  const serviceIdsOfensores = antiDoblePago && antiDoblePago.includes(':')
    ? antiDoblePago.split(':').pop()!.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    : [];

  const consultorioOpts = [{ value: CONSULTORIO_TODOS, label: 'Todos los consultorios' },
    ...consultorios.map((c) => ({ value: c.Id, label: c.PorcMedico != null ? `${c.Nombre} · ${c.PorcMedico}%` : c.Nombre }))];

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-6xl my-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Generar pago de honorarios</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-5">
          {resultado ? (
            /* ---- Vista de éxito: ofrecer imprimir recibo ---- */
            <div className="text-center py-8">
              <CheckCircle className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">Pago registrado #{resultado.IdPago}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {resultado.MedicoNombre} · {fmtFecha(resultado.PeriodoDesde)} - {fmtFecha(resultado.PeriodoHasta)}
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">S/ {money(resultado.TotalPago)}</p>
              <div className="mt-3 max-w-md mx-auto text-left border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700/50">
                {resultado.Consultorios.map((c, i) => (
                  <div key={i} className="flex justify-between px-3 py-1.5 text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{c.Nombre}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">S/ {money(c.MontoPago)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-center gap-2">
                <button onClick={() => abrirReciboHonorarioPDF(resultado)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                  <Printer className="h-4 w-4" /> Imprimir recibo
                </button>
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Cerrar</button>
              </div>
            </div>
          ) : (
            <>
              {/* ---- Parámetros ---- */}
              <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3"><Search className="h-4 w-4 text-emerald-600" /><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Parámetros de análisis</span></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Consultorio">
                    <SearchableSelect value={consultorioId} options={consultorioOpts} onChange={(v) => setConsultorioId(v ?? CONSULTORIO_TODOS)} placeholder="Seleccione..." className={selCls} />
                  </Field>
                  <Field label="Desde"><input type="date" max={today()} value={desde} onChange={(e) => setDesde(e.target.value)} className={selCls} /></Field>
                  <Field label="Hasta"><input type="date" max={today()} value={hasta} onChange={(e) => setHasta(e.target.value)} className={selCls} /></Field>
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button onClick={descargarPlantillaAtenciones} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <Upload className="h-4 w-4 rotate-180" /> Descargar plantilla
                  </button>
                  <button onClick={() => fileRef.current?.click()} disabled={!analizado} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40">
                    <Upload className="h-4 w-4" /> Cargar Excel
                  </button>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files && onExcelFile(e.target.files[0])} />
                  {validacionActiva && (
                    <button onClick={limpiarValidacion} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30">
                      <RotateCcw className="h-4 w-4" /> Limpiar validación
                    </button>
                  )}
                  <button onClick={analizar} disabled={loadingAnalisis} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
                    <Calculator className="h-4 w-4" /> {loadingAnalisis ? 'Analizando...' : 'Realizar análisis'}
                  </button>
                </div>
              </div>

              {analizado && (
                <>
                  {/* ---- Tipo de producción a liquidar (mono-tipo; filtra toda la cadena) ---- */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Producción a liquidar:</span>
                    <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
                      {(['CLINICA', 'SISOL'] as const).map((t) => (
                        <label
                          key={t}
                          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium cursor-pointer select-none transition-colors ${
                            tipoProduccion === t
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="tipoProduccion"
                            className="sr-only"
                            checked={tipoProduccion === t}
                            onChange={() => cambiarTipoProduccion(t)}
                          />
                          {t === 'CLINICA' ? 'Clínica' : 'SISOL'}
                        </label>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">Al cambiar se reinicia la selección, los filtros y la validación.</span>
                  </div>

                  {/* ---- KPIs ---- */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Kpi title="Total servicios" value={String(kpi.totalServicios)} icon={<Activity className="h-5 w-5" />} tone="sky" />
                    <Kpi title="Σ Precios servicios" value={`S/ ${money(kpi.sumPrecios)}`} icon={<DollarSign className="h-5 w-5" />} tone="emerald" />
                    <Kpi title="Pendientes de pago" value={String(kpi.pendientes)} icon={<Clock className="h-5 w-5" />} tone="rose" />
                  </div>

                  {/* ---- Lista de médicos ---- */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Médicos ({medicos.length})</span>
                      <span className="ml-auto text-xs text-slate-400">Para registrar, marque EXACTAMENTE un médico.</span>
                    </div>
                    <div className="overflow-x-auto max-h-56 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/60">
                          <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <th className="px-3 py-2 w-8"></th>
                            <th className="px-3 py-2">Médico</th>
                            <th className="px-3 py-2">Especialidad</th>
                            <th className="px-3 py-2 text-right">Servicios</th>
                            <th className="px-3 py-2 text-right">Pendientes</th>
                            <th className="px-3 py-2 text-right">Σ Precios</th>
                            <th className="px-3 py-2">Periodo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {medicos.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">Sin médicos</td></tr>}
                          {medicos.map((m) => {
                            const sinMedico = esSinMedico(m.medicoId);
                            return (
                            <tr key={m.medicoId} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedMedicos.has(m.medicoId)}
                                  disabled={sinMedico}
                                  onChange={(e) => toggleMedico(m.medicoId, e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={sinMedico ? 'Sin médico tratante — no se puede liquidar honorario' : undefined}
                                />
                              </td>
                              <td className={`px-3 py-2 font-medium ${sinMedico ? 'italic text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{sinMedico ? 'SIN MÉDICO TRATANTE' : m.nombre}</td>
                              <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{sinMedico ? '—' : m.especialidad}</td>
                              <td className="px-3 py-2 text-right">{m.total}</td>
                              <td className="px-3 py-2 text-right">{m.pendientes}</td>
                              <td className="px-3 py-2 text-right">{money(m.sumPrecios)}</td>
                              <td className="px-3 py-2 text-xs text-slate-500">
                                {fmtFecha(m.primer)} - {fmtFecha(m.ultimo)}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ---- Grid de detalles ---- */}
                  {selectedMedicos.size > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Detalle de servicios ({rowsVisibles.length})
                      </div>
                      {/* TODO (follow-up, FUERA DE ALCANCE): columna "Editar médico tratante" — es escritura al
                          legacy 8183 (PagoMedicosService.updateMedicoTratante). Se omite en esta migración conta. */}
                      {/* filtros locales */}
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700 grid grid-cols-2 md:grid-cols-5 gap-2">
                        <input placeholder="Paciente..." value={filtros.paciente} onChange={(e) => setFiltros((f) => ({ ...f, paciente: e.target.value }))} className={selCls} />
                        <input placeholder="Comprobante..." value={filtros.comprobante} onChange={(e) => setFiltros((f) => ({ ...f, comprobante: e.target.value }))} className={selCls} />
                        <input placeholder="Precio (ej: 30)" value={filtros.precio} onChange={(e) => setFiltros((f) => ({ ...f, precio: e.target.value }))} className={selCls} />
                        <select value={filtros.formaPago} onChange={(e) => setFiltros((f) => ({ ...f, formaPago: e.target.value }))} className={selCls}>
                          {formasPagoOpts.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <select value={filtros.estado} onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))} className={selCls}>
                          {['Todos', 'Pendiente', 'Pagado'].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/60">
                            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                              <th className="px-3 py-2 w-8"><input type="checkbox" checked={allVisiblesSelected} onChange={(e) => toggleAllVisibles(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></th>
                              <th className="px-3 py-2">Fecha</th>
                              {validacionActiva && <th className="px-3 py-2 text-center">Válido</th>}
                              <th className="px-3 py-2">Paciente</th>
                              <th className="px-3 py-2">Comprobante</th>
                              <th className="px-3 py-2">Cajero</th>
                              <th className="px-3 py-2">Forma pago</th>
                              <th className="px-3 py-2 text-right">Precio</th>
                              <th className="px-3 py-2">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rowsVisibles.length === 0 && (
                              <tr><td colSpan={validacionActiva ? 9 : 8} className="px-3 py-8 text-center text-slate-400"><AlertCircle className="h-8 w-8 mx-auto mb-2" />Sin servicios</td></tr>
                            )}
                            {rowsVisibles.map((r) => {
                              const pac = `${r.apPaternoPaciente || ''} ${r.apMaternoPaciente || ''} ${r.nombresPaciente || ''}`.trim() || 'N/A';
                              return (
                                <tr key={r._key} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                  <td className="px-3 py-2">
                                    <input type="checkbox" disabled={r.esPagado === 1} checked={selectedKeys.has(r._key)} onChange={(e) => toggleServicio(r._key, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40" />
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">{soloFechaPago(r.fechaPago) || '—'}</td>
                                  {validacionActiva && (
                                    <td className="px-3 py-2 text-center">
                                      {validKeys.has(r._key) ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <XCircle className="h-4 w-4 text-rose-400 mx-auto" />}
                                    </td>
                                  )}
                                  <td className="px-3 py-2 max-w-[180px] truncate" title={pac}>{pac}</td>
                                  <td className="px-3 py-2 text-slate-500" title={r.v_ComprobantePago}>{getFirstComprobante(r.v_ComprobantePago) || '—'}</td>
                                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap max-w-[140px] truncate" title={r.UsuarioCajero}>{r.UsuarioCajero || '—'}</td>
                                  <td className="px-3 py-2">{r.formaPagoName || '-'}</td>
                                  <td className="px-3 py-2 text-right font-medium">S/ {money(r.precioServicio || 0)}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.esPagado === 1 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                                      {r.esPagado === 1 ? 'Pagado' : 'Pendiente'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ---- Cálculo + datos del pago ---- */}
                  {selectedDetalles.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Cálculo del pago</div>
                      {/* desglose */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <Stat label="Total VISA" value={`S/ ${money(totalVisa)}`} />
                        <Stat label="Descuento VISA" value={`S/ ${money(descuentoVisa)}`} />
                        <Stat label="Total Efectivo" value={`S/ ${money(totalEfectivo)}`} />
                        <Stat label={includeIgv ? 'Total (× 0.82 IGV)' : 'Total'} value={`S/ ${money(totalSinIgv)}`} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                              <input type="checkbox" checked={includeIgv} onChange={(e) => setIncludeIgv(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                              Restar IGV (18%)
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-500 dark:text-slate-400">Descuento VISA %</span>
                              <input type="number" min={0} max={100} step={0.01} value={visaDiscountPercent}
                                onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v)) setVisaDiscountPercent(clamp(v, 0, 100)); }}
                                className="w-20 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100" />
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Cadena de % (se multiplican)</span>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {[100, 90, 80, 70].map((p) => (
                                <button key={p} onClick={() => setManualPercents((prev) => [...prev, p])} className="px-2.5 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{p}%</button>
                              ))}
                              <input type="number" min={1} max={100} step={0.01} value={manualInput} onChange={(e) => setManualInput(e.target.value)} placeholder="Ej: 85" className="w-24 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100" />
                              <button onClick={addManualPercent} className="px-3 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">Aplicar</button>
                              <button onClick={resetManualPercents} className="px-3 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Reset</button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {manualPercents.length === 0 ? <span className="text-xs text-slate-400">Sin % aplicados (factor 1.0000)</span> : manualPercents.map((p, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  ×{p}% <button onClick={() => removeManualPercent(i)} className="text-emerald-700 dark:text-emerald-300">✕</button>
                                </span>
                              ))}
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400">Factor = {(manualPercents.length ? manualFactor : 1).toFixed(4)} · se aplican en cadena (ej: 80% luego 50% = 0.40)</p>
                          </div>
                        </div>
                        {/* datos del pago */}
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Fecha de pago"><input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className={selCls} /></Field>
                          <Field label="% referencial"><input type="number" min={0} max={100} step={0.01} value={porcRef} onChange={(e) => setPorcRef(clamp(Number(e.target.value) || 0, 0, 100))} className={selCls} /></Field>
                          <Field label="Forma de pago">
                            <select value={idFormaPago} onChange={(e) => setIdFormaPago(Number(e.target.value))} className={selCls}>
                              <option value={0}>—</option>
                              {formasPago.map((f) => <option key={f.i_IdFormaPago} value={f.i_IdFormaPago}>{f.FormaPago}</option>)}
                            </select>
                          </Field>
                          <Field label="Glosa" full><input value={glosa} onChange={(e) => setGlosa(e.target.value)} placeholder="Opcional" className={selCls} /></Field>
                        </div>
                      </div>

                      {/* ---- Comprobante (Factura / Recibo por Honorarios) — OBLIGATORIO ---- */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Comprobante</span>
                          <span className="text-xs text-rose-500">* obligatorio</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Field label="Tipo comprobante *">
                            <select value={compTipo} onChange={(e) => setCompTipo(e.target.value as '' | '01' | '02')} className={selCls}>
                              <option value="">Seleccione...</option>
                              <option value="01">Factura</option>
                              <option value="02">Recibo por Honorarios</option>
                            </select>
                          </Field>
                          <Field label="Emisor (proveedor)">
                            <SearchableSelect value={compIdProveedor} options={proveedorOpts} onChange={onSelectProveedor} placeholder="Buscar proveedor..." className={selCls} />
                          </Field>
                          <Field label="Importe total (= total del honorario)">
                            <input value={`S/ ${money(compTotal)}`} readOnly tabIndex={-1} className={`${selCls} bg-slate-100 dark:bg-slate-900/40 cursor-not-allowed`} />
                          </Field>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Field label="RUC emisor">
                            <input value={compRuc} onChange={(e) => { setCompRuc(e.target.value); setCompIdProveedor(null); }} placeholder="RUC (texto libre si no hay proveedor)" className={selCls} />
                          </Field>
                          <Field label="Razón social emisor">
                            <input value={compRazon} onChange={(e) => { setCompRazon(e.target.value); setCompIdProveedor(null); }} placeholder="Razón social" className={selCls} />
                          </Field>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <Field label="Serie"><input value={compSerie} onChange={(e) => setCompSerie(e.target.value.toUpperCase())} placeholder="Ej: F001" className={selCls} /></Field>
                          <Field label="Número"><input value={compNumero} onChange={(e) => setCompNumero(e.target.value)} placeholder="Ej: 1234" className={selCls} /></Field>
                          <Field label="Fecha emisión *"><input type="date" max={today()} value={compFechaEmision} onChange={(e) => setCompFechaEmision(e.target.value)} className={selCls} /></Field>
                          <Field label="Fecha vencimiento"><input type="date" value={compFechaVenc} onChange={(e) => setCompFechaVenc(e.target.value)} className={selCls} /></Field>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                          <Field label="Moneda">
                            <select value={compMoneda} onChange={(e) => setCompMoneda(e.target.value)} className={selCls}>
                              <option value="PEN">PEN (S/)</option>
                              <option value="USD">USD ($)</option>
                            </select>
                          </Field>
                          <Field label="Tipo de cambio">
                            <input type="number" min={0} step={0.001} value={compTipoCambio} onChange={(e) => setCompTipoCambio(Number(e.target.value) || 1)} className={selCls} />
                          </Field>
                          {compTipo === '02' && (
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 h-[38px]">
                              <input type="checkbox" checked={compAplicaRetencion} onChange={(e) => setCompAplicaRetencion(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                              Aplica retención (8%)
                            </label>
                          )}
                          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 h-[38px]">
                            <input type="checkbox" checked={compAplicaDetraccion} onChange={(e) => setCompAplicaDetraccion(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                            Aplica detracción
                          </label>
                        </div>

                        {compAplicaDetraccion && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Field label="% detracción">
                              <input type="number" min={0} max={100} step={0.01} value={compPorcDetraccion} onChange={(e) => setCompPorcDetraccion(e.target.value)} placeholder="Ej: 12" className={selCls} />
                            </Field>
                            <Field label="Monto detracción (prioritario)">
                              <input type="number" min={0} step={0.01} value={compMontoDetraccion} onChange={(e) => setCompMontoDetraccion(e.target.value)} placeholder="Ej: 120.00" className={selCls} />
                            </Field>
                            <Field label="N° constancia">
                              <input value={compConstancia} onChange={(e) => setCompConstancia(e.target.value)} placeholder="Constancia de depósito" className={selCls} />
                            </Field>
                          </div>
                        )}

                        <Field label="Observaciones"><input value={compObs} onChange={(e) => setCompObs(e.target.value)} placeholder="Opcional" className={selCls} /></Field>

                        {/* mini-desglose (preview en vivo; el valor autoritativo lo devuelve el GET tras registrar) */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                          <Stat label="Base imponible" value={`S/ ${money(compBase)}`} />
                          <Stat label="IGV" value={`S/ ${money(compIgv)}`} />
                          <Stat label="Retención" value={`S/ ${money(compRetencion)}`} />
                          <Stat label="Detracción" value={`S/ ${money(compDetraccion)}`} />
                          <Stat label="Neto a pagar" value={`S/ ${money(compNeto)}`} />
                        </div>
                        {!comprobanteValido && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">Indique el tipo de comprobante y la fecha de emisión para poder registrar.</p>
                        )}
                      </div>

                      {/* anti-doble-pago */}
                      {antiDoblePago && (
                        <div className="text-xs px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <div className="font-semibold">{antiDoblePago}</div>
                          {serviceIdsOfensores.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {serviceIdsOfensores.map((s) => <span key={s} className="px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-100 font-mono">{s}</span>)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* resumen + registrar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {selectedDetalles.length} servicios · Σ S/ {money(totalServiciosSel)}
                          {selectedMedicos.size !== 1 && <span className="ml-2 text-amber-600 dark:text-amber-400">Seleccione UN médico para registrar</span>}
                        </div>
                        <button onClick={registrar} disabled={!puedeRegistrar || registrando}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold ${puedeRegistrar && !registrando ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600/40 cursor-not-allowed'}`}>
                          <CheckCircle className="h-4 w-4" />
                          {registrando ? 'Registrando...' : `Registrar pago (S/ ${money(round2(appliedTotalMedico))})`}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de errores del Excel */}
      {showErroresExcel && erroresExcel.length > 0 && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowErroresExcel(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Errores de validación ({erroresExcel.length})</h3>
              <button onClick={() => setShowErroresExcel(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700"><th className="px-2 py-1">Comprobante</th><th className="px-2 py-1">Motivo</th></tr></thead>
                <tbody>
                  {erroresExcel.map((er, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="px-2 py-1 font-mono">{er.comprobante}</td>
                      <td className="px-2 py-1 text-rose-600">{er.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---- helpers UI ----
const Field: React.FC<{ label: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div className={full ? 'col-span-2' : ''}>
    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
    {children}
  </div>
);

const kpiToneMap: Record<string, string> = {
  sky: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600',
  rose: 'bg-rose-50 dark:bg-rose-900/30 text-rose-500',
};
const Kpi: React.FC<{ title: string; value: string; icon: React.ReactNode; tone: string }> = ({ title, value, icon, tone }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${kpiToneMap[tone]}`}>{icon}</div>
    <div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
      <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  </div>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 dark:bg-slate-700/40 px-3 py-2">
    <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
    <div className="font-semibold text-slate-800 dark:text-slate-100">{value}</div>
  </div>
);

export default GenerarPagoHonorarioModal;
