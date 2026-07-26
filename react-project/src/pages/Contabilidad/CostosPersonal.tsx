import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, CreditCard } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import { useContaAuth } from '../../context/ContaAuthContext';
import { CONCEPTOS_PERSONAL, conceptoLabel } from '../../services/contabilidad/contaTypes';
import type { CentroCosto, CostoPersonal } from '../../services/contabilidad/contaTypes';
import { money } from '../../utils/money';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

const CostosPersonal: React.FC = () => {
  const { canWrite } = useContaAuth();
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [data, setData] = useState<CostoPersonal[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({}); // key `${centroId}|${concepto}` -> valor editado
  const [loading, setLoading] = useState(false);

  const key = (centroId: number, concepto: string) => `${centroId}|${concepto}`;

  // Carga COMPLETA (cambio de periodo / post-pagar). NO se usa tras guardar una celda: reconstruir
  // el draft desde el server pisaba lo que el usuario estuviera tipeando en otra celda (carrera D2).
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await contabilidadService.costosPersonalList(anio, mes);
      setData(rows);
      const d: Record<string, string> = {};
      rows.forEach((r) => { d[key(r.i_IdCentroCosto, r.v_Concepto)] = String(r.d_Monto); });
      setDraft(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando costos');
    } finally {
      setLoading(false);
    }
  }, [anio, mes]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try { setCentros(await contabilidadService.centrosCosto(true)); }
      catch (e) { toast.error(e instanceof Error ? e.message : 'Error catalogos'); }
    })();
  }, []);

  const rowDe = (centroId: number, concepto: string) =>
    data.find((r) => r.i_IdCentroCosto === centroId && r.v_Concepto === concepto);

  // Dirty-check: hay un valor valido tipeado y difiere de lo persistido. Dinero se compara en
  // CENTAVOS ENTEROS (regla del proyecto: jamas por diferencia de floats). PAGADO nunca es dirty.
  const esDirty = (centroId: number, concepto: string): boolean => {
    const raw = draft[key(centroId, concepto)];
    if (raw == null || raw === '') return false;
    const monto = Number(raw);
    if (isNaN(monto)) return false;
    const row = rowDe(centroId, concepto);
    if (row?.v_Estado === 'PAGADO') return false;
    if (!row) return true; // celda nueva con valor
    return Math.round(monto * 100) !== Math.round(row.d_Monto * 100);
  };

  const guardarCelda = async (centroId: number, concepto: string) => {
    if (!canWrite) return;
    if (!esDirty(centroId, concepto)) return; // blur sin cambio real => NO postea (dirty-check D2)
    const monto = Number(draft[key(centroId, concepto)]);
    try {
      await contabilidadService.costoPersonalUpsert({ Anio: anio, Mes: mes, IdCentroCosto: centroId, Concepto: concepto, Monto: monto });
      // Actualiza SOLO esta celda en el estado local (sin load() completo): preserva lo que el
      // usuario este tipeando en otras celdas. Updates funcionales para no pisar estado concurrente.
      setData((prev) => {
        const idx = prev.findIndex((r) => r.i_IdCentroCosto === centroId && r.v_Concepto === concepto);
        if (idx >= 0) return prev.map((r, i) => (i === idx ? { ...r, d_Monto: monto } : r));
        const centro = centros.find((c) => c.i_IdCentroCosto === centroId);
        return [...prev, {
          i_Id: 0, n_Anio: anio, n_Mes: mes, i_IdCentroCosto: centroId,
          CentroCosto: centro?.v_Nombre ?? '', v_Concepto: concepto, d_Monto: monto,
          v_Estado: 'POR_PAGAR', t_FechaPago: null,
        }];
      });
      setDraft((d) => ({ ...d, [key(centroId, concepto)]: String(monto) }));
      toast.success('Guardado', { id: 'cp-save' });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al guardar'); }
  };

  const pagarMes = async () => {
    // Flush ANTES de pagar: persiste cualquier celda editada aun sin guardar (p.ej. la celda
    // enfocada, cuyo blur corre en carrera con este click) para que el pago no deje montos afuera.
    const pendientes: [number, string][] = [];
    centros.forEach((c) => CONCEPTOS_PERSONAL.forEach((con) => {
      if (esDirty(c.i_IdCentroCosto, con)) pendientes.push([c.i_IdCentroCosto, con]);
    }));
    for (const [cId, con] of pendientes) await guardarCelda(cId, con);
    if (!window.confirm(`Marcar como PAGADO todos los costos POR PAGAR de ${MESES[mes - 1]} ${anio}?`)) return;
    try {
      // FechaPago = ultimo dia del mes contabilizado (NO hoy). El flujo detallado agrupa por MONTH(t_FechaPago),
      // asi el costo de un mes cae en ESE mes aunque el pago se registre despues. (El SP ademas la
      // deriva server-side; el contrato del service se mantiene intacto.)
      const ultimoDia = new Date(anio, mes, 0).getDate();
      const fechaPago = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      const n = await contabilidadService.costoPersonalPagar(anio, mes, fechaPago);
      toast.success(`${n} conceptos pagados`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al pagar'); }
  };

  const totalCentro = (centroId: number) =>
    CONCEPTOS_PERSONAL.reduce((s, c) => s + (Number(draft[key(centroId, c)]) || 0), 0);
  const totalConcepto = (concepto: string) =>
    centros.reduce((s, c) => s + (Number(draft[key(c.i_IdCentroCosto, concepto)]) || 0), 0);
  const granTotal = useMemo(() => centros.reduce((s, c) => s + totalCentro(c.i_IdCentroCosto), 0), [centros, draft]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Costos de Personal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Costo mensual por centro de costo y concepto. Edite una celda y presione Enter o salga del campo para guardar.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={selCls}>
            {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={selCls}>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          {canWrite && (
            <button onClick={pagarMes} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
              <CreditCard className="h-4 w-4" /> Pagar mes
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2 text-left sticky left-0 bg-white dark:bg-slate-800">Centro de costo</th>
              {CONCEPTOS_PERSONAL.map((c) => <th key={c} className="px-3 py-2 text-right whitespace-nowrap">{conceptoLabel(c)}</th>)}
              <th className="px-3 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={CONCEPTOS_PERSONAL.length + 2} className="px-3 py-8 text-center text-slate-400">Cargando...</td></tr>}
            {!loading && centros.map((c) => (
              <tr key={c.i_IdCentroCosto} className="border-b border-slate-100 dark:border-slate-700/50">
                <td className="px-3 py-1.5 sticky left-0 bg-white dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200">{c.v_Nombre}</td>
                {CONCEPTOS_PERSONAL.map((concepto) => {
                  const k = key(c.i_IdCentroCosto, concepto);
                  const row = rowDe(c.i_IdCentroCosto, concepto);
                  const pagado = row?.v_Estado === 'PAGADO';
                  const dirty = esDirty(c.i_IdCentroCosto, concepto);
                  return (
                    <td key={concepto} className="px-1 py-1 text-right">
                      <input
                        type="number" step="0.01"
                        disabled={!canWrite}
                        // PAGADO: readOnly (el SP rechaza el upsert de un concepto pagado con 400 — se previene en UI).
                        readOnly={pagado}
                        value={draft[k] ?? ''}
                        onChange={(e) => { if (pagado) return; setDraft((d) => ({ ...d, [k]: e.target.value })); }}
                        onBlur={() => guardarCelda(c.i_IdCentroCosto, concepto)}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className={`w-24 px-2 py-1 rounded border text-right text-xs outline-none focus:ring-2 focus:ring-emerald-500 ${
                          pagado
                            ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 cursor-default'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                        }`}
                        placeholder="0.00"
                      />
                      {/* affordance por celda: PAGADO / sin guardar (dirty) / ✓ guardado. Aclara el flujo
                          "guardar celda (blur) vs Pagar mes" sin rediseñar la grilla. */}
                      <div className="h-3 pr-1 text-right text-[9px] leading-3">
                        {pagado
                          ? <span className="text-emerald-600 dark:text-emerald-400">PAGADO</span>
                          : dirty
                            ? <span className="text-amber-500">● sin guardar</span>
                            : row
                              ? <span className="text-slate-400">✓ guardado</span>
                              : null}
                      </div>
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-right font-semibold text-slate-800 dark:text-slate-100">{money(totalCentro(c.i_IdCentroCosto))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200">
              <td className="px-3 py-2 sticky left-0 bg-white dark:bg-slate-800">Total</td>
              {CONCEPTOS_PERSONAL.map((c) => <td key={c} className="px-3 py-2 text-right">{money(totalConcepto(c))}</td>)}
              <td className="px-3 py-2 text-right text-emerald-600">S/ {money(granTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Save className="h-3 w-3" /> Los montos en verde ya fueron pagados y no se editan. "Pagar mes" guarda primero cualquier celda pendiente e impacta la caja del mes seleccionado.</p>
    </div>
  );
};

const selCls = 'px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

export default CostosPersonal;
