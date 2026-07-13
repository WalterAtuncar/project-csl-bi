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
  Egreso, CentroCosto, TipoGasto, Entidad, CuentaBancaria,
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

const estadoBadge: Record<EstadoEgreso, string> = {
  POR_PAGAR: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  PAGADO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  ANULADO: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
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

  // filtros
  const [fEstado, setFEstado] = useState('');
  const [fCentro, setFCentro] = useState('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');

  // modales
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EgresoCreate>(emptyForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [pagarFor, setPagarFor] = useState<Egreso | null>(null);
  const [pago, setPago] = useState({ FechaPago: today(), IdFormaPago: 1, IdCuentaBancaria: 0 });
  const [cargaResult, setCargaResult] = useState<EgresoCargaResultado | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
        const [c, t, e, b] = await Promise.all([
          contabilidadService.centrosCosto(true),
          contabilidadService.tiposGasto(true),
          contabilidadService.entidades(true),
          contabilidadService.cuentasBancarias(true),
        ]);
        setCentros(c); setTipos(t); setEntidades(e); setCuentas(b);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error cargando catalogos');
      }
    })();
  }, []);

  const totalNeto = useMemo(() => items.reduce((s, x) => s + (x.v_Estado !== 'ANULADO' ? x.d_MontoNeto : 0), 0), [items]);

  // Campos obligatorios del egreso (segun conta.egreso NOT NULL + CK_egreso_receptor + negocio).
  // Con esto se habilita/deshabilita el boton Guardar del modal.
  const formValido = useMemo(() => (
    (form.IdEntidad != null || form.IdProveedor != null) &&   // CK_egreso_receptor
    !!form.FechaDocumento &&                                   // t_FechaDocumento NOT NULL
    !!form.TipoDocumento &&                                    // v_TipoDocumento NOT NULL
    form.IdCentroCosto > 0 &&                                  // i_IdCentroCosto NOT NULL (FK)
    form.IdTipoGasto > 0 &&                                    // i_IdTipoGasto NOT NULL (FK)
    Number.isFinite(form.MontoBruto) && form.MontoBruto > 0 && // d_MontoBruto NOT NULL, negocio > 0
    Number.isFinite(form.IGV) && form.IGV >= 0 && form.IGV <= form.MontoBruto  // neto >= 0 (CK_egreso_montos)
  ), [form]);

  // ---- alta / edicion ----
  const openNuevo = () => { setForm(emptyForm()); setEditId(null); setFormOpen(true); };
  const openEditar = async (id: number) => {
    try {
      const e = await contabilidadService.egresoGet(id);
      if (e.v_Estado !== 'POR_PAGAR') { toast.error('Solo se editan egresos POR PAGAR'); return; }
      setForm({
        IdEntidad: null, IdProveedor: null, FechaDocumento: e.t_FechaDocumento.slice(0, 10),
        TipoDocumento: e.v_TipoDocumento, SerieNumero: e.v_SerieNumero || '',
        IdCentroCosto: 0, IdTipoGasto: 0, Condicion: e.v_Condicion, Moneda: e.v_Moneda,
        TipoCambio: e.d_TipoCambio, MontoBruto: e.d_MontoBruto, IGV: e.d_IGV, Glosa: e.v_Glosa || '',
      });
      // el receptor y catalogos por id no vienen resueltos en el GET (muestra nombres); se re-seleccionan
      setEditId(id); setFormOpen(true);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
  };

  const saveForm = async () => {
    if (!form.IdEntidad && !form.IdProveedor) { toast.error('Seleccione un receptor (entidad)'); return; }
    if (!form.IdCentroCosto) { toast.error('Seleccione centro de costo'); return; }
    if (!form.IdTipoGasto) { toast.error('Seleccione tipo de gasto'); return; }
    if (form.MontoBruto <= 0) { toast.error('Monto bruto invalido'); return; }
    if (form.IGV < 0 || form.IGV > form.MontoBruto) { toast.error('El IGV no puede ser mayor al monto bruto'); return; }
    try {
      if (editId) {
        await contabilidadService.egresoActualizar({ ...form, IdEgreso: editId });
        toast.success('Egreso actualizado');
      } else {
        await contabilidadService.egresoCrear(form);
        toast.success('Egreso registrado (POR PAGAR)');
      }
      setFormOpen(false); setPage(1); load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error al guardar'); }
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
    const rows = [
      ['RucOEntidad', 'FechaDocumento', 'TipoDocumento', 'SerieNumero', 'CodCentroCosto', 'CodTipoGasto', 'Condicion', 'Moneda', 'TipoCambio', 'MontoBruto', 'IGV', 'Glosa'],
      ['20512345678', '2026-06-15', 'FACTURA', 'F001-123', centros[0]?.v_Codigo || 'ADM', tipos[0]?.v_Codigo || 'ADM-FLE', 'CONTADO', 'PEN', 1, 118, 18, 'ejemplo'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Egresos');
    XLSX.writeFile(wb, 'plantilla_egresos.xlsx');
  };

  const onFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
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
              <th className="px-3 py-2">Centro / Gasto</th>
              <th className="px-3 py-2 text-right">Neto</th>
              <th className="px-3 py-2 text-right">Bruto</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Pago</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-400">Cargando...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-400">Sin egresos</td></tr>}
            {!loading && items.map((e) => (
              <tr key={e.i_IdEgreso} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-3 py-2 text-slate-400">{e.i_IdEgreso}</td>
                <td className="px-3 py-2">{e.t_FechaDocumento.slice(0, 10)}</td>
                <td className="px-3 py-2">{e.v_TipoDocumento}<div className="text-xs text-slate-400">{e.v_SerieNumero}</div></td>
                <td className="px-3 py-2">{e.Receptor}</td>
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
            <Field label="Receptor (entidad)" full required>
              <select value={form.IdEntidad ?? ''} onChange={(e) => setForm({ ...form, IdEntidad: e.target.value ? Number(e.target.value) : null })} className={selCls}>
                <option value="">Seleccione...</option>
                {entidades.map((x) => <option key={x.i_IdEntidad} value={x.i_IdEntidad}>{x.v_Nombre} ({x.v_Tipo})</option>)}
              </select>
            </Field>
            <Field label="Fecha documento" required><input type="date" value={form.FechaDocumento} onChange={(e) => setForm({ ...form, FechaDocumento: e.target.value })} className={selCls} /></Field>
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
              <select value={form.IdCentroCosto || ''} onChange={(e) => setForm({ ...form, IdCentroCosto: Number(e.target.value) })} className={selCls}>
                <option value="">Seleccione...</option>
                {centros.map((c) => <option key={c.i_IdCentroCosto} value={c.i_IdCentroCosto}>{c.v_Nombre}</option>)}
              </select>
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
            <Field label="Glosa" full><input value={form.Glosa ?? ''} onChange={(e) => setForm({ ...form, Glosa: e.target.value })} className={selCls} /></Field>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Neto = Bruto − IGV = <b>S/ {money((form.MontoBruto || 0) - (form.IGV || 0))}</b>. Se crea en estado POR PAGAR (no afecta caja hasta pagarse).
            {form.IGV > form.MontoBruto && <span className="text-rose-500"> · El IGV no puede superar el monto bruto.</span>}
          </p>
          <p className="text-[11px] text-slate-400 mt-1"><span className="text-rose-500">*</span> Campos obligatorios.{!formValido && ' Complete los obligatorios para habilitar Guardar.'}</p>
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

const Modal: React.FC<{ title: string; onClose: () => void; onSave?: () => void; saveLabel?: string; hideSave?: boolean; saveDisabled?: boolean; children: React.ReactNode }> = ({ title, onClose, onSave, saveLabel = 'Guardar', hideSave, saveDisabled, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
    <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
