import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, CreditCard } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import { useContaAuth } from '../../context/ContaAuthContext';
import { CONCEPTOS_PERSONAL } from '../../services/contabilidad/contaTypes';
import type { CentroCosto, CostoPersonal } from '../../services/contabilidad/contaTypes';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const conceptoLabel = (c: string) => c.replace(/_/g, ' ');

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

  const estadoDe = (centroId: number, concepto: string) =>
    data.find((r) => r.i_IdCentroCosto === centroId && r.v_Concepto === concepto)?.v_Estado;

  const guardarCelda = async (centroId: number, concepto: string) => {
    const raw = draft[key(centroId, concepto)];
    const monto = Number(raw);
    if (raw == null || raw === '' || isNaN(monto)) return;
    try {
      await contabilidadService.costoPersonalUpsert({ Anio: anio, Mes: mes, IdCentroCosto: centroId, Concepto: concepto, Monto: monto });
      toast.success('Guardado', { id: 'cp-save' });
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al guardar'); }
  };

  const pagarMes = async () => {
    if (!window.confirm(`Marcar como PAGADO todos los costos POR PAGAR de ${MESES[mes - 1]} ${anio}?`)) return;
    try {
      const n = await contabilidadService.costoPersonalPagar(anio, mes, new Date().toISOString().slice(0, 10));
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
                  const est = estadoDe(c.i_IdCentroCosto, concepto);
                  return (
                    <td key={concepto} className="px-1 py-1 text-right">
                      <input
                        type="number" step="0.01"
                        disabled={!canWrite || est === 'PAGADO'}
                        value={draft[k] ?? ''}
                        onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                        onBlur={() => guardarCelda(c.i_IdCentroCosto, concepto)}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className={`w-24 px-2 py-1 rounded border text-right text-xs outline-none focus:ring-2 focus:ring-emerald-500 ${
                          est === 'PAGADO'
                            ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                        }`}
                        placeholder="0.00"
                      />
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
      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Save className="h-3 w-3" /> Los montos en verde ya fueron pagados y no se editan. "Pagar mes" impacta la caja del mes seleccionado.</p>
    </div>
  );
};

const selCls = 'px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

export default CostosPersonal;
