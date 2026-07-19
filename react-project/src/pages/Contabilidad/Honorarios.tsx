import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, X, Eye, Printer, Ban, ChevronLeft, ChevronRight, RefreshCw, Stethoscope, FileText,
} from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import { useContaAuth } from '../../context/ContaAuthContext';
import type {
  HonorarioPagoListItem, HonorarioProfesional, HonorarioPagoDetalle,
} from '../../services/contabilidad/contaTypes';
import GenerarPagoHonorarioModal from './components/honorarios/GenerarPagoHonorarioModal';
import { descargarPlantillaAtenciones } from './components/honorarios/excelHonorarios';
import { abrirReciboHonorarioPDF } from './components/honorarios/ReciboPDF';

const PAGE_SIZE = 15;
const money = (n: number) => (n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtFecha = (iso: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const estadoBadge: Record<string, string> = {
  PAGADO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  ANULADO: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

// Badge del tipo de producción (mismo molde que estadoBadge).
const tipoProduccionBadge: Record<string, string> = {
  CLINICA: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  SISOL: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
};
const tipoProduccionLabel = (t: string) => (t === 'CLINICA' ? 'Clínica' : t === 'SISOL' ? 'SISOL' : t || '—');

const tipoComprobanteLabel = (t: string) => (t === '01' ? 'Factura' : t === '02' ? 'Recibo por Honorarios' : t);

const selCls = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

const Honorarios: React.FC = () => {
  const { canWrite } = useContaAuth();

  const [items, setItems] = useState<HonorarioPagoListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // filtros
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [incluirAnulados, setIncluirAnulados] = useState(false);
  const [medicoId, setMedicoId] = useState<number | undefined>(undefined);

  // autocomplete profesional
  const [buscar, setBuscar] = useState('');
  const [profesionales, setProfesionales] = useState<HonorarioProfesional[]>([]);
  const [showProf, setShowProf] = useState(false);
  const profBoxRef = useRef<HTMLDivElement>(null);

  // modales
  const [modalNuevo, setModalNuevo] = useState(false);
  const [detalle, setDetalle] = useState<HonorarioPagoDetalle | null>(null);
  const [anularId, setAnularId] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [anulando, setAnulando] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contabilidadService.honorariosPagos({
        desde: desde || undefined, hasta: hasta || undefined, medicoId,
        incluirAnulados, page, pageSize: PAGE_SIZE,
      });
      setItems(res.Items);
      setTotal(res.Total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al listar pagos');
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, medicoId, incluirAnulados, page]);

  useEffect(() => { load(); }, [load]);

  // debounce 300ms del autocomplete (mín 3 chars)
  useEffect(() => {
    if (buscar.trim().length < 3) { setProfesionales([]); setShowProf(false); return; }
    const t = setTimeout(async () => {
      try {
        const res = await contabilidadService.honorariosProfesionales(buscar.trim());
        setProfesionales(res); setShowProf(true);
      } catch { /* silencioso */ }
    }, 300);
    return () => clearTimeout(t);
  }, [buscar]);

  // cerrar dropdown al click fuera
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (profBoxRef.current && !profBoxRef.current.contains(e.target as Node)) setShowProf(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const selectProfesional = (p: HonorarioProfesional) => {
    setMedicoId(p.systemUserId);
    setBuscar(p.Name || p.userName);
    setShowProf(false);
    setPage(1);
  };
  const limpiarProfesional = () => { setMedicoId(undefined); setBuscar(''); setProfesionales([]); setPage(1); };

  const totalPaginaPagado = useMemo(
    () => items.reduce((s, x) => s + (x.v_Estado !== 'ANULADO' ? x.d_TotalPago : 0), 0),
    [items],
  );

  // ---- acciones ----
  const verDetalle = async (id: number) => {
    try { setDetalle(await contabilidadService.honorariosPagoGet(id)); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error al cargar el detalle'); }
  };

  const imprimir = async (id: number) => {
    try {
      const d = await contabilidadService.honorariosPagoGet(id);
      await abrirReciboHonorarioPDF({
        IdPago: d.Cabecera.i_IdPago,
        MedicoNombre: d.Cabecera.v_MedicoNombre,
        PeriodoDesde: d.Cabecera.t_PeriodoDesde,
        PeriodoHasta: d.Cabecera.t_PeriodoHasta,
        FechaPago: d.Cabecera.t_FechaPago,
        TotalServicios: d.Cabecera.d_TotalServicios,
        TotalPago: d.Cabecera.d_TotalPago,
        Glosa: d.Cabecera.v_Glosa ?? null,
        Estado: d.Cabecera.v_Estado,
        TipoProduccion: d.Cabecera.v_TipoProduccion ?? null,
        TipoComprobante: d.Comprobante?.v_TipoComprobante ?? null,
        Serie: d.Comprobante?.v_Serie ?? null,
        Numero: d.Comprobante?.v_Numero ?? null,
        Consultorios: d.Consultorios.map((c) => ({ Nombre: c.v_ConsultorioNombre, MontoServicios: c.d_MontoServicios, MontoPago: c.d_MontoPago })),
      });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al generar el recibo'); }
  };

  const confirmarAnular = async () => {
    if (anularId == null) return;
    if (!motivo.trim()) { toast.error('El motivo es obligatorio'); return; }
    setAnulando(true);
    try {
      await contabilidadService.honorariosPagoAnular(anularId, motivo.trim());
      toast.success('Pago anulado (egresos revertidos, servicios liberados)');
      setAnularId(null); setMotivo('');
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al anular'); }
    finally { setAnulando(false); }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-emerald-600" /> Honorarios Médicos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pagos de honorarios por consultorio. El registro genera egresos (CC asistencial) por consultorio.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={descargarPlantillaAtenciones} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
            <Download className="h-4 w-4" /> Plantilla de atenciones
          </button>
          {canWrite && (
            <button onClick={() => setModalNuevo(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
              <Plus className="h-4 w-4" /> Generar nuevo pago
            </button>
          )}
        </div>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <div ref={profBoxRef} className="relative">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Profesional</label>
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onFocus={() => { if (profesionales.length) setShowProf(true); }}
              placeholder="Mín. 3 caracteres..."
              className="w-56 pl-7 pr-7 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {(buscar || medicoId) && (
              <button onClick={limpiarProfesional} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
          {showProf && profesionales.length > 0 && (
            <div className="absolute z-30 mt-1 w-72 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-xl max-h-60 overflow-y-auto">
              {profesionales.map((p) => (
                <button key={p.systemUserId} onClick={() => selectProfesional(p)} className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border-b border-slate-100 dark:border-slate-600 last:border-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.Name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{p.userName}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Pago desde</label>
          <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }} className={selCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Pago hasta</label>
          <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }} className={selCls} />
        </div>
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none">
          <input type="checkbox" checked={incluirAnulados} onChange={(e) => { setIncluirAnulados(e.target.checked); setPage(1); }} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          Incluir anulados
        </label>
        <button onClick={() => load()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
        <div className="ml-auto text-sm text-slate-500 dark:text-slate-400">
          Total página (sin anulados): <span className="font-semibold text-emerald-600">S/ {money(totalPaginaPagado)}</span>
        </div>
      </div>

      {/* tabla */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Fecha pago</th>
              <th className="px-3 py-2">Médico</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Periodo</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-center">Consult.</th>
              <th className="px-3 py-2 text-center">Servicios</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-400">Cargando...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-400">Sin pagos registrados</td></tr>}
            {!loading && items.map((p) => (
              <tr key={p.i_IdPago} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-3 py-2 text-slate-400">{p.i_IdPago}</td>
                <td className="px-3 py-2">{fmtFecha(p.t_FechaPago)}</td>
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{p.v_MedicoNombre}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoProduccionBadge[p.v_TipoProduccion] || 'bg-slate-100 text-slate-600'}`}>{tipoProduccionLabel(p.v_TipoProduccion)}</span></td>
                <td className="px-3 py-2 text-xs text-slate-500">{fmtFecha(p.t_PeriodoDesde)} - {fmtFecha(p.t_PeriodoHasta)}</td>
                <td className="px-3 py-2 text-right font-semibold text-emerald-600">S/ {money(p.d_TotalPago)}</td>
                <td className="px-3 py-2 text-center">{p.NroConsultorios}</td>
                <td className="px-3 py-2 text-center">{p.NroServicios}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadge[p.v_Estado] || 'bg-slate-100 text-slate-600'}`}>{p.v_Estado}</span></td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button title="Ver" onClick={() => verDetalle(p.i_IdPago)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><Eye className="h-4 w-4 text-slate-500" /></button>
                    <button title="Imprimir recibo" onClick={() => imprimir(p.i_IdPago)} className="p-1.5 rounded hover:bg-sky-100 dark:hover:bg-sky-900/40"><Printer className="h-4 w-4 text-sky-600" /></button>
                    {canWrite && p.v_Estado === 'PAGADO' && (
                      <button title="Anular" onClick={() => { setAnularId(p.i_IdPago); setMotivo(''); }} className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40"><Ban className="h-4 w-4 text-rose-500" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* paginación server-side real */}
      <div className="flex items-center justify-between mt-3 text-sm text-slate-500 dark:text-slate-400">
        <span>{total} pagos</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span>Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* modal generar nuevo pago */}
      {modalNuevo && (
        <GenerarPagoHonorarioModal isOpen={modalNuevo} onClose={() => setModalNuevo(false)} onRegistrado={() => { setPage(1); load(); }} />
      )}

      {/* modal detalle (Ver) */}
      {detalle && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={() => setDetalle(null)}>
          <div className="w-full max-w-3xl my-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Pago #{detalle.Cabecera.i_IdPago} · {detalle.Cabecera.v_MedicoNombre}</h3>
              <button onClick={() => setDetalle(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Info label="Fecha pago" value={fmtFecha(detalle.Cabecera.t_FechaPago)} />
                <Info label="Tipo producción" value={tipoProduccionLabel(detalle.Cabecera.v_TipoProduccion)} />
                <Info label="Periodo" value={`${fmtFecha(detalle.Cabecera.t_PeriodoDesde)} - ${fmtFecha(detalle.Cabecera.t_PeriodoHasta)}`} />
                <Info label="Total servicios" value={`S/ ${money(detalle.Cabecera.d_TotalServicios)}`} />
                <Info label="Total pago" value={`S/ ${money(detalle.Cabecera.d_TotalPago)}`} highlight />
                <Info label="Estado" value={detalle.Cabecera.v_Estado} />
                {detalle.Cabecera.d_PorcMedico != null && <Info label="% médico" value={`${detalle.Cabecera.d_PorcMedico}%`} />}
                {detalle.Cabecera.v_Glosa && <Info label="Glosa" value={detalle.Cabecera.v_Glosa} />}
                {detalle.Cabecera.v_MotivoAnulacion && <Info label="Motivo anulación" value={detalle.Cabecera.v_MotivoAnulacion} />}
              </div>

              {detalle.Comprobante && (
                <div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-emerald-600" /> Comprobante
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <Info label="Tipo" value={tipoComprobanteLabel(detalle.Comprobante.v_TipoComprobante)} />
                      <Info label="Serie-Número" value={`${detalle.Comprobante.v_Serie || '—'}${detalle.Comprobante.v_Numero ? '-' + detalle.Comprobante.v_Numero : ''}`} />
                      <Info label="Emisión" value={fmtFecha(detalle.Comprobante.t_FechaEmision)} />
                      <Info label="Vencimiento" value={fmtFecha(detalle.Comprobante.t_FechaVencimiento)} />
                      <Info label="Moneda" value={`${detalle.Comprobante.v_Moneda} · TC ${detalle.Comprobante.d_TipoCambio}`} />
                      <Info label="RUC emisor (congelado)" value={detalle.Comprobante.v_RucEmisor || '—'} />
                      <Info label="Razón social (congelada)" value={detalle.Comprobante.v_RazonSocialEmisor || '—'} />
                      {detalle.Comprobante.i_IdProveedor != null && (
                        <Info label="Proveedor vigente" value={`${detalle.Comprobante.ProveedorRuc || '—'} · ${detalle.Comprobante.ProveedorRazonSocial || '—'}`} />
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                      <Info label="Base imponible" value={`S/ ${money(detalle.Comprobante.d_BaseImponible)}`} />
                      <Info label="IGV" value={`S/ ${money(detalle.Comprobante.d_IGV)}`} />
                      <Info label="Retención" value={`S/ ${money(detalle.Comprobante.d_MontoRetencion)}`} />
                      <Info label="Detracción" value={`S/ ${money(detalle.Comprobante.d_MontoDetraccion ?? 0)}`} />
                      <Info label="Neto a pagar" value={`S/ ${money(detalle.Comprobante.d_NetoPagar)}`} highlight />
                    </div>
                    {(detalle.Comprobante.d_PorcDetraccion != null || detalle.Comprobante.v_ConstanciaDetraccion || detalle.Comprobante.v_Observaciones) && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {detalle.Comprobante.d_PorcDetraccion != null && <Info label="% detracción" value={`${detalle.Comprobante.d_PorcDetraccion}%`} />}
                        {detalle.Comprobante.v_ConstanciaDetraccion && <Info label="N° constancia" value={detalle.Comprobante.v_ConstanciaDetraccion} />}
                        {detalle.Comprobante.v_Observaciones && <Info label="Observaciones" value={detalle.Comprobante.v_Observaciones} />}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Consultorios y egresos</div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700"><th className="px-3 py-1.5">Consultorio</th><th className="px-3 py-1.5 text-right">Servicios</th><th className="px-3 py-1.5 text-right">Pago</th><th className="px-3 py-1.5 text-center">Egreso</th><th className="px-3 py-1.5">Estado egreso</th></tr></thead>
                    <tbody>
                      {detalle.Consultorios.map((c) => (
                        <tr key={c.i_IdConsultorio} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="px-3 py-1.5">{c.v_ConsultorioNombre}</td>
                          <td className="px-3 py-1.5 text-right">S/ {money(c.d_MontoServicios)}</td>
                          <td className="px-3 py-1.5 text-right font-medium text-emerald-600">S/ {money(c.d_MontoPago)}</td>
                          <td className="px-3 py-1.5 text-center text-slate-500">{c.i_IdEgreso ?? '—'}</td>
                          <td className="px-3 py-1.5 text-xs text-slate-500">{c.EgresoEstado ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Servicios ({detalle.Servicios.length})</div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/60"><tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700"><th className="px-3 py-1.5">Service Id</th><th className="px-3 py-1.5 text-center">Consult.</th><th className="px-3 py-1.5 text-right">Precio</th><th className="px-3 py-1.5 text-right">%</th><th className="px-3 py-1.5 text-right">Pagado</th><th className="px-3 py-1.5 text-center">Anulado</th></tr></thead>
                    <tbody>
                      {detalle.Servicios.map((s, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="px-3 py-1.5 font-mono text-xs">{s.v_ServiceId}</td>
                          <td className="px-3 py-1.5 text-center">{s.i_IdConsultorio}</td>
                          <td className="px-3 py-1.5 text-right">{s.d_Precio != null ? `S/ ${money(s.d_Precio)}` : '—'}</td>
                          <td className="px-3 py-1.5 text-right">{s.d_Porc != null ? `${s.d_Porc}%` : '—'}</td>
                          <td className="px-3 py-1.5 text-right">{s.d_Pagado != null ? `S/ ${money(s.d_Pagado)}` : '—'}</td>
                          <td className="px-3 py-1.5 text-center">{s.b_Anulado ? 'Sí' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => imprimir(detalle.Cabecera.i_IdPago)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <Printer className="h-4 w-4" /> Imprimir recibo
                </button>
                <button onClick={() => setDetalle(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* modal anular */}
      {anularId != null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => !anulando && setAnularId(null)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Anular pago #{anularId}</h3>
              <button onClick={() => setAnularId(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Se revertirán los egresos generados y se liberarán los servicios (podrán volver a pagarse).</p>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Motivo <span className="text-rose-500">*</span></label>
              <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500" placeholder="Explique el motivo de la anulación" />
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setAnularId(null)} disabled={anulando} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button>
              <button onClick={confirmarAnular} disabled={anulando || !motivo.trim()} className={`px-4 py-2 rounded-lg text-white text-sm font-semibold ${!motivo.trim() || anulando ? 'bg-rose-600/50 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'}`}>
                {anulando ? 'Anulando...' : 'Confirmar anulación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Info: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div>
    <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase">{label}</div>
    <div className={`font-semibold ${highlight ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'}`}>{value}</div>
  </div>
);

export default Honorarios;
