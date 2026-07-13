import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
  Plus, Search, CreditCard, Ban, Pencil, Upload, Download, X, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import { useContaAuth } from '../../context/ContaAuthContext';
import SearchableSelect from './components/SearchableSelect';
import type {
  Egreso, CentroCosto, TipoGasto, Entidad, CuentaBancaria, ProveedorRow, ProveedorCreate,
  EgresoCreate, EgresoCargaFila, EgresoCargaResultado, EstadoEgreso,
} from '../../services/contabilidad/contaTypes';

const PAGE_SIZE = 15;
const FORMAS_PAGO = [
  { id: 1, label: 'Efectivo' },
  { id: 9, label: 'Deposito' },
  { id: 6, label: 'Cheque' },
];
const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const pad2 = (n: number) => String(n).padStart(2, '0');

// ---- Periodo (D2): el selector año/mes es AYUDA DE CAPTURA. No se envia al backend (el periodo
// contable sigue derivado de las fechas). Solo gobierna el rango/valor default de FechaDocumento.
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const firstDayOfMonth = (anio: number, mes: number) => `${anio}-${pad2(mes)}-01`;
const lastDayOfMonth = (anio: number, mes: number) => `${anio}-${pad2(mes)}-${pad2(new Date(anio, mes, 0).getDate())}`;
// Fecha default dentro de un periodo: hoy si es el mes en curso; dia 1 en caso contrario.
const defaultFechaEnPeriodo = (anio: number, mes: number) => {
  const d = new Date();
  return anio === d.getFullYear() && mes === d.getMonth() + 1 ? today() : firstDayOfMonth(anio, mes);
};

const estadoBadge: Record<EstadoEgreso, string> = {
  POR_PAGAR: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  PAGADO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  ANULADO: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

// Badge del tipo de receptor en la grilla (D7): PROV (sky) / ENT (violet).
const receptorBadge: Record<'PROVEEDOR' | 'ENTIDAD', string> = {
  PROVEEDOR: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  ENTIDAD: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
};

const emptyForm = (): EgresoCreate => ({
  IdEntidad: null, IdProveedor: null, FechaDocumento: today(), TipoDocumento: 'FACTURA',
  SerieNumero: '', IdCentroCosto: 0, IdTipoGasto: 0, Condicion: 'CONTADO',
  Moneda: 'PEN', TipoCambio: 1, MontoBruto: 0, IGV: 0, Glosa: '',
});

const Egresos: React.FC = () => {
  const { canWrite } = useContaAuth();
  const [items, setItems] = useState<Egreso[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // catalogos
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [tipos, setTipos] = useState<TipoGasto[]>([]);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorRow[]>([]);

  // filtros
  const [fEstado, setFEstado] = useState('');
  const [fCentro, setFCentro] = useState('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');

  // modales
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EgresoCreate>(emptyForm());
  const [editId, setEditId] = useState<number | null>(null);
  // --- estado local del modal de alta/edicion (no se envia crudo al backend) ---
  const [tipoReceptor, setTipoReceptor] = useState<'PROVEEDOR' | 'ENTIDAD'>('PROVEEDOR'); // D1
  const [periodo, setPeriodo] = useState<{ anio: number; mes: number }>(() => {
    const d = new Date();
    return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
  }); // D2 (ayuda de captura)
  const [estadoInicial, setEstadoInicial] = useState<'POR_PAGAR' | 'PAGADO'>('POR_PAGAR'); // D4, solo en crear
  const [pagoInicial, setPagoInicial] = useState({ FechaPago: today(), IdFormaPago: 1, IdCuentaBancaria: 0 });
  const [pagarFor, setPagarFor] = useState<Egreso | null>(null);
  const [pago, setPago] = useState({ FechaPago: today(), IdFormaPago: 1, IdCuentaBancaria: 0 });
  const [cargaResult, setCargaResult] = useState<EgresoCargaResultado | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- alta IN-LIVE de proveedor desde el modal de egreso (modal anidado sobre el de egreso) ---
  const [nuevoProvOpen, setNuevoProvOpen] = useState(false);
  const [nuevoProv, setNuevoProv] = useState<ProveedorCreate>({ Ruc: '', RazonSocial: '', Direccion: '', Email: '' });
  const [savingProv, setSavingProv] = useState(false);
  // RUC de 11 digitos + razon social no vacia (valida en front antes del POST; el backend re-valida).
  const provValido = /^\d{11}$/.test(nuevoProv.Ruc.trim()) && nuevoProv.RazonSocial.trim().length > 0;

  // Rango del periodo elegido: gobierna min/max del date-input de FechaDocumento (D2).
  const periodoMin = firstDayOfMonth(periodo.anio, periodo.mes);
  const periodoMax = lastDayOfMonth(periodo.anio, periodo.mes);
  // Opciones de año: actual y anterior; se agrega el año del periodo si un egreso editado cae fuera.
  const aniosOpts = useMemo(() => {
    const y = new Date().getFullYear();
    const base = [y, y - 1];
    return base.includes(periodo.anio) ? base : [...base, periodo.anio].sort((a, b) => b - a);
  }, [periodo.anio]);
  const pagoFueraDePeriodo = estadoInicial === 'PAGADO' && !!pagoInicial.FechaPago
    && (pagoInicial.FechaPago < periodoMin || pagoInicial.FechaPago > periodoMax);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contabilidadService.egresosList({
        estado: fEstado || undefined,
        idCentroCosto: fCentro ? Number(fCentro) : undefined,
        fdocDesde: fDesde || undefined,
        fdocHasta: fHasta || undefined,
        page, pageSize: PAGE_SIZE,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al listar egresos');
    } finally {
      setLoading(false);
    }
  }, [fEstado, fCentro, fDesde, fHasta, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [c, t, e, b, p] = await Promise.all([
          contabilidadService.centrosCosto(true),
          contabilidadService.tiposGasto(true),
          contabilidadService.entidades(true),
          contabilidadService.cuentasBancarias(true),
          contabilidadService.proveedores(true),
        ]);
        setCentros(c); setTipos(t); setEntidades(e); setCuentas(b); setProveedores(p);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error cargando catalogos');
      }
    })();
  }, []);

  const totalNeto = useMemo(() => items.reduce((s, x) => s + (x.v_Estado !== 'ANULADO' ? x.d_MontoNeto : 0), 0), [items]);

  // Campos obligatorios del egreso (segun conta.egreso NOT NULL + CK_egreso_receptor + negocio).
  // Con esto se habilita/deshabilita el boton Guardar del modal.
  const formValido = useMemo(() => (
    (form.IdEntidad != null || form.IdProveedor != null) &&   // CK_egreso_receptor (exactamente uno)
    !!form.FechaDocumento &&                                   // t_FechaDocumento NOT NULL
    form.FechaDocumento >= periodoMin && form.FechaDocumento <= periodoMax && // dentro del periodo (D2)
    !!form.TipoDocumento &&                                    // v_TipoDocumento NOT NULL
    form.IdCentroCosto > 0 &&                                  // i_IdCentroCosto NOT NULL (FK)
    form.IdTipoGasto > 0 &&                                    // i_IdTipoGasto NOT NULL (FK)
    Number.isFinite(form.MontoBruto) && form.MontoBruto > 0 && // d_MontoBruto NOT NULL, negocio > 0
    Number.isFinite(form.IGV) && form.IGV >= 0 && form.IGV <= form.MontoBruto && // neto >= 0 (CK_egreso_montos)
    // Estado inicial PAGADO (solo crear) EXIGE fecha de pago (D4; el SP hace RAISERROR si falta).
    (editId != null || estadoInicial !== 'PAGADO' || !!pagoInicial.FechaPago)
  ), [form, periodoMin, periodoMax, editId, estadoInicial, pagoInicial.FechaPago]);

  // ---- alta / edicion ----
  // Cambia el periodo (D2): ajusta min/max del date-input y reposiciona FechaDocumento (hoy si el
  // mes esta en curso; dia 1 en caso contrario) para que siga siendo valida dentro del rango.
  const cambiarPeriodo = (anio: number, mes: number) => {
    setPeriodo({ anio, mes });
    setForm((f) => ({ ...f, FechaDocumento: defaultFechaEnPeriodo(anio, mes) }));
  };

  // Cambia el tipo de receptor (D1): limpia AMBOS ids (elegir uno luego limpia el otro).
  const cambiarTipoReceptor = (t: 'PROVEEDOR' | 'ENTIDAD') => {
    setTipoReceptor(t);
    setForm((f) => ({ ...f, IdProveedor: null, IdEntidad: null }));
  };

  const openNuevo = () => {
    const d = new Date();
    const per = { anio: d.getFullYear(), mes: d.getMonth() + 1 };
    setPeriodo(per);
    setTipoReceptor('PROVEEDOR');
    setEstadoInicial('POR_PAGAR');
    setPagoInicial({ FechaPago: today(), IdFormaPago: 1, IdCuentaBancaria: 0 });
    setForm(emptyForm()); // FechaDocumento = hoy (dentro del periodo del mes en curso)
    setEditId(null);
    setFormOpen(true);
  };

  const openEditar = async (id: number) => {
    try {
      const e = await contabilidadService.egresoGet(id); // sp_Egreso_Get: SELECT e.* (ids incluidos)
      if (e.v_Estado !== 'POR_PAGAR') { toast.error('Solo se editan egresos POR PAGAR'); return; }
      const fdoc = e.t_FechaDocumento.slice(0, 10);
      // Periodo derivado de la fecha de documento del egreso editado.
      setPeriodo({ anio: Number(fdoc.slice(0, 4)), mes: Number(fdoc.slice(5, 7)) });
      // D8: prefillar los ids REALES que devuelve el GET (antes se descartaban y obligaban a
      // re-seleccionar) y derivar el tipo de receptor. La transicion de estado va por Pagar,
      // por eso el selector de Estado no se muestra en editar.
      setTipoReceptor(e.i_IdProveedor != null ? 'PROVEEDOR' : 'ENTIDAD');
      setForm({
        IdEntidad: e.i_IdEntidad ?? null, IdProveedor: e.i_IdProveedor ?? null,
        FechaDocumento: fdoc, TipoDocumento: e.v_TipoDocumento, SerieNumero: e.v_SerieNumero || '',
        IdCentroCosto: e.i_IdCentroCosto ?? 0, IdTipoGasto: e.i_IdTipoGasto ?? 0,
        Condicion: e.v_Condicion, Moneda: e.v_Moneda,
        TipoCambio: e.d_TipoCambio, MontoBruto: e.d_MontoBruto, IGV: e.d_IGV, Glosa: e.v_Glosa || '',
      });
      setEditId(id); setFormOpen(true);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
  };

  const saveForm = async () => {
    if (!form.IdEntidad && !form.IdProveedor) { toast.error('Seleccione un receptor (proveedor o entidad)'); return; }
    if (!form.IdCentroCosto) { toast.error('Seleccione centro de costo'); return; }
    if (!form.IdTipoGasto) { toast.error('Seleccione tipo de gasto'); return; }
    if (form.MontoBruto <= 0) { toast.error('Monto bruto invalido'); return; }
    if (form.IGV < 0 || form.IGV > form.MontoBruto) { toast.error('El IGV no puede ser mayor al monto bruto'); return; }
    try {
      if (editId) {
        await contabilidadService.egresoActualizar({ ...form, IdEgreso: editId });
        toast.success('Egreso actualizado');
      } else {
        // Estado inicial (D4). El service omite los campos default; solo se envian si PAGADO.
        const payload: EgresoCreate = { ...form, Estado: estadoInicial };
        if (estadoInicial === 'PAGADO') {
          payload.FechaPago = pagoInicial.FechaPago;
          payload.IdFormaPago = pagoInicial.IdFormaPago;
          payload.IdCuentaBancaria = pagoInicial.IdCuentaBancaria || null;
        }
        await contabilidadService.egresoCrear(payload);
        toast.success(estadoInicial === 'PAGADO' ? 'Egreso registrado (PAGADO)' : 'Egreso registrado (POR PAGAR)');
      }
      setFormOpen(false); setPage(1); load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error al guardar'); }
  };

  // ---- alta IN-LIVE de proveedor ----
  // Crea el proveedor sin salir del modal de egreso: actualiza el catalogo local con el row que
  // devuelve el backend (sin re-fetch), lo auto-selecciona en el egreso y cierra SOLO el anidado.
  // Ante un 400 de negocio (RUC duplicado/invalido) muestra el mensaje y NO cierra para que corrija.
  const saveProveedor = async () => {
    setSavingProv(true);
    try {
      const nuevo = await contabilidadService.proveedorCrear({
        Ruc: nuevoProv.Ruc.trim(),
        RazonSocial: nuevoProv.RazonSocial.trim(),
        Direccion: nuevoProv.Direccion?.trim() || null,
        Email: nuevoProv.Email?.trim() || null,
      });
      setProveedores((prev) => [...prev, nuevo].sort((a, b) => a.RazonSocial.localeCompare(b.RazonSocial)));
      setTipoReceptor('PROVEEDOR');
      setForm((f) => ({ ...f, IdProveedor: nuevo.i_IdProveedor, IdEntidad: null }));
      toast.success('Proveedor creado');
      setNuevoProvOpen(false);
      setNuevoProv({ Ruc: '', RazonSocial: '', Direccion: '', Email: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear proveedor');
    } finally {
      setSavingProv(false);
    }
  };

  // ---- pagar / anular ----
  const doPagar = async () => {
    if (!pagarFor) return;
    try {
      await contabilidadService.egresoPagar({
        IdEgreso: pagarFor.i_IdEgreso, FechaPago: pago.FechaPago,
        IdFormaPago: pago.IdFormaPago, IdCuentaBancaria: pago.IdCuentaBancaria || null,
      });
      toast.success('Egreso pagado');
      setPagarFor(null); load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error al pagar'); }
  };

  const doAnular = async (e: Egreso) => {
    const motivo = window.prompt(`Anular egreso #${e.i_IdEgreso}. Motivo:`, 'error de tipeo');
    if (motivo === null) return;
    try {
      await contabilidadService.egresoAnular(e.i_IdEgreso, motivo);
      toast.success('Egreso anulado');
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error al anular'); }
  };

  // ---- carga masiva ----
  const descargarPlantilla = () => {
    const wb = XLSX.utils.book_new();

    // --- Hoja 1: datos a llenar ---
    const ejProv = proveedores[0]?.Ruc || '20512345678';
    const ejEnt = entidades[0]?.v_Nombre || 'BIOMEDICINE';
    const cc = centros[0]?.v_Codigo || 'ADM';
    const tg = tipos.find((t) => t.i_IdPadre != null)?.v_Codigo || 'ADM-FLE';
    const datos: (string | number)[][] = [
      ['RucOEntidad', 'FechaDocumento', 'TipoDocumento', 'SerieNumero', 'CodCentroCosto', 'CodTipoGasto', 'Condicion', 'Moneda', 'TipoCambio', 'MontoBruto', 'IGV', 'Glosa'],
      [ejProv, '2026-06-15', 'FACTURA', 'F001-123', cc, tg, 'CONTADO', 'PEN', 1, 118, 18, 'ejemplo proveedor (RUC -> compra)'],
      [ejEnt, '2026-06-16', 'RECIBO', 'R001-045', cc, tg, 'CONTADO', 'PEN', 1, 100, 0, 'ejemplo entidad (nombre -> egreso)'],
    ];
    const wsDatos = XLSX.utils.aoa_to_sheet(datos);
    wsDatos['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, wsDatos, 'Egresos');

    // --- Hoja 2: referencia de codigos ---
    const ref: (string | number)[][] = [];
    ref.push(['GUIA DE CODIGOS - copie los valores EXACTOS en la hoja "Egresos"']);
    ref.push([]);
    ref.push(['COLUMNA RucOEntidad']);
    ref.push(['- PROVEEDOR: escriba el RUC de 11 digitos  ->  se registra como COMPRA']);
    ref.push(['- ENTIDAD: escriba el NOMBRE exacto  ->  se registra como EGRESO a entidad']);
    ref.push([]);
    ref.push(['Entidades (nombre exacto)', 'Tipo']);
    entidades.forEach((e) => ref.push([e.v_Nombre, e.v_Tipo || '']));
    ref.push([]);
    ref.push(['Proveedores (RUC)', 'Razon social']);
    proveedores.forEach((p) => ref.push([p.Ruc || '', p.RazonSocial]));
    ref.push([]);
    ref.push(['TipoDocumento (valores validos)']);
    ['FACTURA', 'RECIBO', 'PLANILLA', 'VOUCHER', 'OTRO'].forEach((x) => ref.push([x]));
    ref.push([]);
    ref.push(['Condicion', 'CONTADO | CREDITO']);
    ref.push(['Moneda', 'PEN | USD']);
    ref.push([]);
    ref.push(['CodCentroCosto', 'Nombre']);
    centros.forEach((c) => ref.push([c.v_Codigo, c.v_Nombre]));
    ref.push([]);
    ref.push(['CodTipoGasto', 'Nombre']);
    tipos.filter((t) => t.i_IdPadre != null).forEach((t) => ref.push([t.v_Codigo, t.v_Nombre]));

    const wsRef = XLSX.utils.aoa_to_sheet(ref);
    wsRef['!cols'] = [{ wch: 40 }, { wch: 44 }];
    XLSX.utils.book_append_sheet(wb, wsRef, 'Referencias');

    XLSX.writeFile(wb, 'plantilla_egresos.xlsx');
  };

  const onFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets['Egresos'] ?? wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      const filas: EgresoCargaFila[] = json.map((r) => ({
        RucOEntidad: String(r.RucOEntidad ?? '').trim(),
        FechaDocumento: normalizeDate(r.FechaDocumento),
        TipoDocumento: r.TipoDocumento ? String(r.TipoDocumento) : 'FACTURA',
        SerieNumero: r.SerieNumero ? String(r.SerieNumero) : null,
        CodCentroCosto: String(r.CodCentroCosto ?? '').trim(),
        CodTipoGasto: String(r.CodTipoGasto ?? '').trim(),
        Condicion: r.Condicion ? String(r.Condicion) : 'CONTADO',
        Moneda: r.Moneda ? String(r.Moneda) : 'PEN',
        TipoCambio: r.TipoCambio != null ? Number(r.TipoCambio) : 1,
        MontoBruto: r.MontoBruto != null ? Number(r.MontoBruto) : null,
        IGV: r.IGV != null ? Number(r.IGV) : 0,
        Glosa: r.Glosa ? String(r.Glosa) : null,
      }));
      if (!filas.length) { toast.error('El archivo no tiene filas'); return; }
      const res = await contabilidadService.egresoCargaMasiva(filas);
      setCargaResult(res);
      toast.success(`${res.Insertadas} insertadas, ${res.ConError} con error`);
      setPage(1); load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error procesando archivo');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Egresos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gastos y compras. El pago dispara el movimiento de caja.</p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <button onClick={descargarPlantilla} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Download className="h-4 w-4" /> Plantilla
            </button>
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Upload className="h-4 w-4" /> Carga masiva
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files && onFile(e.target.files[0])} />
            <button onClick={openNuevo} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
              <Plus className="h-4 w-4" /> Nuevo egreso
            </button>
          </div>
        )}
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <Field label="Estado">
          <select value={fEstado} onChange={(e) => { setFEstado(e.target.value); setPage(1); }} className={selCls}>
            <option value="">Todos</option>
            <option value="POR_PAGAR">Por pagar</option>
            <option value="PAGADO">Pagado</option>
            <option value="ANULADO">Anulado</option>
          </select>
        </Field>
        <Field label="Centro de costo">
          <select value={fCentro} onChange={(e) => { setFCentro(e.target.value); setPage(1); }} className={selCls}>
            <option value="">Todos</option>
            {centros.map((c) => <option key={c.i_IdCentroCosto} value={c.i_IdCentroCosto}>{c.v_Nombre}</option>)}
          </select>
        </Field>
        <Field label="Doc. desde"><input type="date" value={fDesde} onChange={(e) => { setFDesde(e.target.value); setPage(1); }} className={selCls} /></Field>
        <Field label="Doc. hasta"><input type="date" value={fHasta} onChange={(e) => { setFHasta(e.target.value); setPage(1); }} className={selCls} /></Field>
        <button onClick={() => load()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
        <div className="ml-auto text-sm text-slate-500 dark:text-slate-400">
          Neto pagina (sin anulados): <span className="font-semibold text-slate-800 dark:text-slate-100">S/ {money(totalNeto)}</span>
        </div>
      </div>

      {/* tabla */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Fecha doc.</th>
              <th className="px-3 py-2">Documento</th>
              <th className="px-3 py-2">Receptor</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Centro / Gasto</th>
              <th className="px-3 py-2 text-right">Neto</th>
              <th className="px-3 py-2 text-right">Bruto</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Pago</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-400">Cargando...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-400">Sin egresos</td></tr>}
            {!loading && items.map((e) => (
              <tr key={e.i_IdEgreso} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-3 py-2 text-slate-400">{e.i_IdEgreso}</td>
                <td className="px-3 py-2">{e.t_FechaDocumento.slice(0, 10)}</td>
                <td className="px-3 py-2">{e.v_TipoDocumento}<div className="text-xs text-slate-400">{e.v_SerieNumero}</div></td>
                <td className="px-3 py-2">{e.Receptor}</td>
                <td className="px-3 py-2">
                  {e.TipoReceptor && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${receptorBadge[e.TipoReceptor]}`}>
                      {e.TipoReceptor === 'PROVEEDOR' ? 'PROV' : 'ENT'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{e.CentroCosto}<div className="text-xs text-slate-400">{e.TipoGasto}</div></td>
                <td className="px-3 py-2 text-right font-medium">{money(e.d_MontoNeto)}</td>
                <td className="px-3 py-2 text-right text-slate-500">{money(e.d_MontoBruto)}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadge[e.v_Estado]}`}>{e.v_Estado}</span></td>
                <td className="px-3 py-2 text-xs text-slate-500">{e.t_FechaPago ? e.t_FechaPago.slice(0, 10) : '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {canWrite && e.v_Estado === 'POR_PAGAR' && (
                      <>
                        <button title="Editar" onClick={() => openEditar(e.i_IdEgreso)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><Pencil className="h-4 w-4 text-slate-500" /></button>
                        <button title="Pagar" onClick={() => { setPagarFor(e); setPago({ FechaPago: today(), IdFormaPago: 1, IdCuentaBancaria: 0 }); }} className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40"><CreditCard className="h-4 w-4 text-emerald-600" /></button>
                        <button title="Anular" onClick={() => doAnular(e)} className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40"><Ban className="h-4 w-4 text-rose-500" /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* paginacion */}
      <div className="flex items-center justify-between mt-3 text-sm text-slate-500 dark:text-slate-400">
        <span>{total} egresos</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span>Pagina {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* modal alta/edicion */}
      {formOpen && (
        <Modal title={editId ? `Editar egreso #${editId}` : 'Nuevo egreso'} onClose={() => setFormOpen(false)} onSave={saveForm} saveDisabled={!formValido}>
          <div className="grid grid-cols-2 gap-3">
            {/* Periodo (D2): ayuda de captura, no se envia al backend. Gobierna el rango de FechaDocumento. */}
            <Field label="Periodo (ayuda de captura)" full>
              <div className="flex gap-2">
                <select value={periodo.anio} onChange={(e) => cambiarPeriodo(Number(e.target.value), periodo.mes)} className={selCls}>
                  {aniosOpts.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={periodo.mes} onChange={(e) => cambiarPeriodo(periodo.anio, Number(e.target.value))} className={selCls}>
                  {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
            </Field>

            {/* Receptor (D1): toggle PROVEEDOR/ENTIDAD; elegir uno limpia el otro (CK_egreso_receptor). */}
            <Field label="Receptor" full required>
              <Segmented
                value={tipoReceptor}
                onChange={(v) => cambiarTipoReceptor(v as 'PROVEEDOR' | 'ENTIDAD')}
                options={[{ value: 'PROVEEDOR', label: 'Proveedor' }, { value: 'ENTIDAD', label: 'Entidad' }]}
              />
            </Field>
            <Field label={tipoReceptor === 'PROVEEDOR' ? 'Proveedor' : 'Entidad'} full required>
              {tipoReceptor === 'PROVEEDOR' ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <SearchableSelect
                      value={form.IdProveedor ?? null}
                      options={proveedores.map((p) => ({ value: p.i_IdProveedor, label: p.Ruc ? `${p.RazonSocial} · ${p.Ruc}` : p.RazonSocial }))}
                      onChange={(v) => setForm({ ...form, IdProveedor: v, IdEntidad: null })}
                      placeholder="Seleccione proveedor..."
                      className={selCls}
                    />
                  </div>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => { setNuevoProv({ Ruc: '', RazonSocial: '', Direccion: '', Email: '' }); setNuevoProvOpen(true); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                    >
                      <Plus className="h-4 w-4" /> Nuevo
                    </button>
                  )}
                </div>
              ) : (
                <SearchableSelect
                  value={form.IdEntidad ?? null}
                  options={entidades.map((x) => ({ value: x.i_IdEntidad, label: `${x.v_Nombre} (${x.v_Tipo})` }))}
                  onChange={(v) => setForm({ ...form, IdEntidad: v, IdProveedor: null })}
                  placeholder="Seleccione entidad..."
                  className={selCls}
                />
              )}
            </Field>

            <Field label="Fecha documento" required>
              <input type="date" min={periodoMin} max={periodoMax} value={form.FechaDocumento} onChange={(e) => setForm({ ...form, FechaDocumento: e.target.value })} className={selCls} />
            </Field>
            <Field label="Tipo documento" required>
              <select value={form.TipoDocumento} onChange={(e) => setForm({ ...form, TipoDocumento: e.target.value })} className={selCls}>
                {['FACTURA', 'RECIBO', 'PLANILLA', 'VOUCHER', 'OTRO'].map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Serie-Numero"><input value={form.SerieNumero ?? ''} onChange={(e) => setForm({ ...form, SerieNumero: e.target.value })} className={selCls} /></Field>
            <Field label="Condicion">
              <select value={form.Condicion} onChange={(e) => setForm({ ...form, Condicion: e.target.value })} className={selCls}>
                <option value="CONTADO">CONTADO</option>
                <option value="CREDITO">CREDITO</option>
              </select>
            </Field>
            <Field label="Centro de costo" required>
              <SearchableSelect
                value={form.IdCentroCosto || null}
                options={centros.map((c) => ({ value: c.i_IdCentroCosto, label: c.v_Nombre }))}
                onChange={(v) => setForm({ ...form, IdCentroCosto: v ?? 0 })}
                placeholder="Seleccione..."
                className={selCls}
              />
            </Field>
            <Field label="Tipo de gasto" required>
              <SearchableSelect
                value={form.IdTipoGasto || null}
                options={tipos.filter((t) => t.i_IdPadre != null).map((t) => ({ value: t.i_IdTipoGasto, label: t.v_Nombre }))}
                onChange={(v) => setForm({ ...form, IdTipoGasto: v ?? 0 })}
                placeholder="Seleccione..."
                className={selCls}
              />
            </Field>
            <Field label="Monto bruto" required><input type="number" step="0.01" value={form.MontoBruto} onChange={(e) => setForm({ ...form, MontoBruto: Number(e.target.value) })} className={selCls} /></Field>
            <Field label="IGV"><input type="number" step="0.01" value={form.IGV} onChange={(e) => setForm({ ...form, IGV: Number(e.target.value) })} className={selCls} /></Field>

            {/* Estado inicial (D4): SOLO al crear; en editar la transicion va por Pagar. */}
            {!editId && (
              <Field label="Estado inicial" full>
                <Segmented
                  value={estadoInicial}
                  onChange={(v) => setEstadoInicial(v as 'POR_PAGAR' | 'PAGADO')}
                  options={[{ value: 'POR_PAGAR', label: 'Por pagar' }, { value: 'PAGADO', label: 'Pagado' }]}
                />
              </Field>
            )}
            {!editId && estadoInicial === 'PAGADO' && (
              <>
                <Field label="Fecha de pago" required>
                  <input type="date" value={pagoInicial.FechaPago} onChange={(e) => setPagoInicial({ ...pagoInicial, FechaPago: e.target.value })} className={selCls} />
                </Field>
                <Field label="Forma de pago">
                  <select value={pagoInicial.IdFormaPago} onChange={(e) => setPagoInicial({ ...pagoInicial, IdFormaPago: Number(e.target.value) })} className={selCls}>
                    {FORMAS_PAGO.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </Field>
                <Field label="Cuenta bancaria (opcional)" full>
                  <select value={pagoInicial.IdCuentaBancaria} onChange={(e) => setPagoInicial({ ...pagoInicial, IdCuentaBancaria: Number(e.target.value) })} className={selCls}>
                    <option value={0}>—</option>
                    {cuentas.map((c) => <option key={c.i_IdCuentaBancaria} value={c.i_IdCuentaBancaria}>{c.v_Banco} · {c.v_NroCuenta}</option>)}
                  </select>
                </Field>
                {pagoFueraDePeriodo && (
                  <p className="col-span-2 text-xs text-amber-600 dark:text-amber-400">
                    La fecha de pago está fuera del periodo seleccionado (normal en crédito que se paga otro mes). Impactará la caja en su propio mes.
                  </p>
                )}
              </>
            )}

            <Field label="Glosa" full><input value={form.Glosa ?? ''} onChange={(e) => setForm({ ...form, Glosa: e.target.value })} className={selCls} /></Field>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-slate-400">
              Neto = Bruto − IGV = <b>S/ {money((form.MontoBruto || 0) - (form.IGV || 0))}</b>.
              {form.IGV > form.MontoBruto && <span className="text-rose-500"> · El IGV no puede superar el monto bruto.</span>}
            </p>
            <p className="text-xs text-slate-400">
              Impacta <b>Rentabilidad</b> por la fecha de documento apenas se registra, aunque quede POR PAGAR; en <b>Caja</b> recién impacta al pagarse.
            </p>
            {!editId && estadoInicial === 'PAGADO' && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Se crea PAGADO: impacta caja en la fecha de pago.</p>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1"><span className="text-rose-500">*</span> Campos obligatorios.{!formValido && ' Complete los obligatorios para habilitar Guardar.'}</p>
        </Modal>
      )}

      {/* modal anidado: nuevo proveedor (se pinta DESPUES del de egreso -> queda encima; su click-fuera
          solo cierra el anidado, el modal de egreso sigue abierto con su estado intacto). */}
      {nuevoProvOpen && (
        <Modal
          title="Nuevo proveedor"
          onClose={() => setNuevoProvOpen(false)}
          onSave={saveProveedor}
          saveDisabled={!provValido || savingProv}
          zClass="z-[60]"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="RUC" required>
              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={nuevoProv.Ruc}
                onChange={(e) => setNuevoProv({ ...nuevoProv, Ruc: e.target.value.replace(/\D/g, '') })}
                placeholder="11 digitos"
                className={selCls}
              />
            </Field>
            <Field label="Razon social" required>
              <input type="text" value={nuevoProv.RazonSocial} onChange={(e) => setNuevoProv({ ...nuevoProv, RazonSocial: e.target.value })} className={selCls} />
            </Field>
            <Field label="Direccion" full>
              <input type="text" value={nuevoProv.Direccion ?? ''} onChange={(e) => setNuevoProv({ ...nuevoProv, Direccion: e.target.value })} className={selCls} />
            </Field>
            <Field label="Email" full>
              <input type="email" value={nuevoProv.Email ?? ''} onChange={(e) => setNuevoProv({ ...nuevoProv, Email: e.target.value })} className={selCls} />
            </Field>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            <span className="text-rose-500">*</span> RUC (11 digitos) y razon social son obligatorios.
            {!provValido && ' Complete los obligatorios para habilitar Guardar.'}
          </p>
        </Modal>
      )}

      {/* modal pagar */}
      {pagarFor && (
        <Modal title={`Pagar egreso #${pagarFor.i_IdEgreso}`} onClose={() => setPagarFor(null)} onSave={doPagar} saveLabel="Confirmar pago">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de pago"><input type="date" value={pago.FechaPago} onChange={(e) => setPago({ ...pago, FechaPago: e.target.value })} className={selCls} /></Field>
            <Field label="Forma de pago">
              <select value={pago.IdFormaPago} onChange={(e) => setPago({ ...pago, IdFormaPago: Number(e.target.value) })} className={selCls}>
                {FORMAS_PAGO.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </Field>
            <Field label="Cuenta bancaria (opcional)" full>
              <select value={pago.IdCuentaBancaria} onChange={(e) => setPago({ ...pago, IdCuentaBancaria: Number(e.target.value) })} className={selCls}>
                <option value={0}>—</option>
                {cuentas.map((c) => <option key={c.i_IdCuentaBancaria} value={c.i_IdCuentaBancaria}>{c.v_Banco} · {c.v_NroCuenta}</option>)}
              </select>
            </Field>
          </div>
          <p className="text-xs text-slate-400 mt-2">Al confirmar, el egreso pasa a PAGADO y su monto bruto impacta la caja en la fecha de pago.</p>
        </Modal>
      )}

      {/* resultado carga masiva */}
      {cargaResult && (
        <Modal title="Resultado de carga masiva" onClose={() => setCargaResult(null)} hideSave>
          <div className="flex gap-4 mb-3">
            <div className="flex-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">{cargaResult.Insertadas}</div>
              <div className="text-xs text-slate-500">insertadas</div>
            </div>
            <div className="flex-1 rounded-lg bg-rose-50 dark:bg-rose-900/30 p-3 text-center">
              <div className="text-2xl font-bold text-rose-500">{cargaResult.ConError}</div>
              <div className="text-xs text-slate-500">con error</div>
            </div>
          </div>
          {cargaResult.Errores.length > 0 && (
            <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700"><th className="px-2 py-1">Fila</th><th className="px-2 py-1">Receptor</th><th className="px-2 py-1">Error</th></tr></thead>
                <tbody>
                  {cargaResult.Errores.map((er) => (
                    <tr key={er.fila} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="px-2 py-1">{er.fila}</td>
                      <td className="px-2 py-1">{er.v_RucOEntidad}</td>
                      <td className="px-2 py-1 text-rose-600">{er.v_Error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

// ---- helpers UI ----
const selCls = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

const Field: React.FC<{ label: string; full?: boolean; required?: boolean; children: React.ReactNode }> = ({ label, full, required, children }) => (
  <div className={full ? 'col-span-2' : ''}>
    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
      {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

// Control segmentado (toggle de 2+ opciones) para receptor y estado inicial del egreso.
const Segmented: React.FC<{ value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }> = ({ value, onChange, options }) => (
  <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
    {options.map((o, i) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={`px-4 py-1.5 text-sm font-medium transition ${i > 0 ? 'border-l border-slate-300 dark:border-slate-600' : ''} ${
          value === o.value
            ? 'bg-emerald-600 text-white'
            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
        }`}
      >{o.label}</button>
    ))}
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; onSave?: () => void; saveLabel?: string; hideSave?: boolean; saveDisabled?: boolean; zClass?: string; children: React.ReactNode }> = ({ title, onClose, onSave, saveLabel = 'Guardar', hideSave, saveDisabled, zClass = 'z-50', children }) => (
  <div className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/40 p-4`} onClick={onClose}>
    <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5 text-slate-400" /></button>
      </div>
      <div className="p-5">{children}</div>
      <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Cerrar</button>
        {!hideSave && (
          <button
            onClick={onSave}
            disabled={saveDisabled}
            title={saveDisabled ? 'Complete los campos obligatorios' : undefined}
            className={`px-4 py-2 rounded-lg text-white text-sm font-semibold ${saveDisabled ? 'bg-emerald-600/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >{saveLabel}</button>
        )}
      </div>
    </div>
  </div>
);

function normalizeDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') { // serial de Excel
    const d = XLSX.SSF ? new Date(Math.round((v - 25569) * 86400 * 1000)) : new Date(v);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}

export default Egresos;
