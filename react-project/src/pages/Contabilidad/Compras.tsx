// [SOFT-DELETE 2026-07-13] Bandeja fiscal de clasificacion de compras SIN feed (dbo.registro_compras=0).
// Retirada del sidebar y del routing: el registro de egresos (/conta/egresos) unifico compras (receptor
// PROVEEDOR) + entidades. Este componente queda INTACTO en disco. Restaurar cuando exista el feed
// PLE/SUNAT: re-agregar la ruta en App.tsx (element={<Compras />}) y el navItem en ContaLayout.
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Tag, CheckCircle2, RefreshCw, X } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import { useContaAuth } from '../../context/ContaAuthContext';
import type { CompraRow, CentroCosto, TipoGasto } from '../../services/contabilidad/contaTypes';

const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Compras: React.FC = () => {
  const { canWrite } = useContaAuth();
  const now = new Date();
  const [periodo, setPeriodo] = useState(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [soloSin, setSoloSin] = useState(false);
  const [rows, setRows] = useState<CompraRow[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [tipos, setTipos] = useState<TipoGasto[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<CompraRow | null>(null);
  const [sel, setSel] = useState({ centro: '', tipo: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await contabilidadService.comprasList(periodo || undefined, soloSin)); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  }, [periodo, soloSin]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { (async () => { try { const [c, t] = await Promise.all([contabilidadService.centrosCosto(true), contabilidadService.tiposGasto(true)]); setCentros(c); setTipos(t); } catch { /* noop */ } })(); }, []);

  const clasificar = async () => {
    if (!target) return;
    if (!sel.centro || !sel.tipo) { toast.error('Seleccione centro de costo y tipo de gasto'); return; }
    try {
      await contabilidadService.compraClasificar(target.i_IdCompra, Number(sel.centro), Number(sel.tipo));
      toast.success('Compra clasificada. Egreso espejo generado.');
      setTarget(null); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al clasificar'); }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Registro de Compras</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Clasifique cada compra con centro de costo y tipo de gasto; se genera el egreso contable.</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="YYYYMM" className={selCls + ' w-28'} />
          <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={soloSin} onChange={(e) => setSoloSin(e.target.checked)} /> Solo sin clasificar</label>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"><RefreshCw className="h-4 w-4" /> Actualizar</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Documento</th>
              <th className="px-3 py-2">Proveedor</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2">Clasificación</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Cargando...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Sin compras en el periodo {periodo}</td></tr>}
            {!loading && rows.map((c) => (
              <tr key={c.i_IdCompra} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-3 py-1.5">{c.fecha_emision?.slice(0, 10)}</td>
                <td className="px-3 py-1.5">{c.tipo_comprobante} {c.Documento}</td>
                <td className="px-3 py-1.5">{c.Proveedor}<div className="text-xs text-slate-400">{c.Ruc}</div></td>
                <td className="px-3 py-1.5 text-right font-medium">{money(c.importe_total)}</td>
                <td className="px-3 py-1.5">
                  {c.Clasificada
                    ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle2 className="h-4 w-4" />{c.CentroCosto} · {c.TipoGasto}</span>
                    : <span className="text-xs text-amber-600">Sin clasificar</span>}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {canWrite && !c.Clasificada && (
                    <button onClick={() => { setTarget(c); setSel({ centro: '', tipo: '' }); }} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs"><Tag className="h-3 w-3" /> Clasificar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setTarget(null)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Clasificar compra {target.Documento}</h3>
              <button onClick={() => setTarget(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-500">{target.Proveedor} · S/ {money(target.importe_total)} (IGV {money(target.igv)})</p>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Centro de costo</label>
                <select value={sel.centro} onChange={(e) => setSel({ ...sel, centro: e.target.value })} className={selCls + ' w-full'}><option value="">Seleccione...</option>{centros.map((c) => <option key={c.i_IdCentroCosto} value={c.i_IdCentroCosto}>{c.v_Nombre}</option>)}</select>
              </div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Tipo de gasto</label>
                <select value={sel.tipo} onChange={(e) => setSel({ ...sel, tipo: e.target.value })} className={selCls + ' w-full'}><option value="">Seleccione...</option>{tipos.filter((t) => t.i_IdPadre != null).map((t) => <option key={t.i_IdTipoGasto} value={t.i_IdTipoGasto}>{t.v_Nombre}</option>)}</select>
              </div>
              <p className="text-xs text-slate-400">Se creará un egreso POR PAGAR ligado a esta compra. No podrá registrarse un egreso manual duplicado.</p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setTarget(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button>
              <button onClick={clasificar} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Clasificar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const selCls = 'px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

export default Compras;
