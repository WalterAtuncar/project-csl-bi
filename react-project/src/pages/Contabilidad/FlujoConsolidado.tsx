import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Lock, Unlock, PlayCircle, RefreshCw } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import { useContaAuth } from '../../context/ContaAuthContext';
import type { FlujoConsolidado as FlujoData, FlujoMesRow, FormaPagoRow } from '../../services/contabilidad/contaTypes';
import MediosPagoFilterCard from './components/MediosPagoFilterCard';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const money = (n: number) => (n === 0 ? '—' : n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));

type RowKind = 'header' | 'detail' | 'total' | 'saldo';
interface Row { label: string; values: number[]; total: number; kind: RowKind; indent?: boolean }

const FlujoConsolidado: React.FC = () => {
  const { canWrite, hasRole } = useContaAuth();
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [data, setData] = useState<FlujoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mesCerrar, setMesCerrar] = useState(now.getMonth() + 1);

  // Filtro por medio de pago (estado local propio de la pantalla, D4: sin persistencia/context).
  const [medios, setMedios] = useState<FormaPagoRow[]>([]);
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [incluirCredito, setIncluirCredito] = useState(true);
  const filtroActivo = medios.length > 0 && (seleccion.length < medios.length || !incluirCredito);

  useEffect(() => {
    contabilidadService
      .cajaFormasPago()
      .then((m) => { setMedios(m); setSeleccion(m.map((x) => x.i_IdFormaPago)); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Error cargando medios de pago'));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Convencion de eficiencia (§5.2): todos marcados => sin formasPago; credito ON => sin incluirCredito.
      const formasPagoParam = medios.length > 0 && seleccion.length < medios.length ? seleccion.join(',') : undefined;
      const incluirCreditoParam = incluirCredito ? undefined : false;
      setData(await contabilidadService.flujoConsolidado(anio, formasPagoParam, incluirCreditoParam));
    }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error cargando flujo'); }
    finally { setLoading(false); }
  }, [anio, seleccion, incluirCredito, medios]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const byMes = new Map<number, FlujoMesRow>();
    data.Resumen.forEach((r) => byMes.set(r.Mes, r));
    const val = (sel: (r: FlujoMesRow) => number) => Array.from({ length: 12 }, (_, i) => sel(byMes.get(i + 1) || ({} as FlujoMesRow)) || 0);
    const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

    const out: Row[] = [];
    const push = (label: string, values: number[], kind: RowKind, indent = false, totalOverride?: number) =>
      out.push({ label, values, total: totalOverride ?? sum(values), kind, indent });

    // INGRESOS OPERATIVOS por unidad (contado) + cobranzas credito por unidad
    push('INGRESOS OPERATIVOS', new Array(12).fill(0), 'header');
    const unidades = [...new Set(data.IngresosPorUnidad.map((x) => x.Unidad))].sort();
    const ingByUnidad = (unidad: string, credito: boolean) =>
      val((r) => 0).map((_, i) =>
        data.IngresosPorUnidad
          .filter((x) => x.Unidad === unidad && x.EsCredito === credito && x.Mes === i + 1)
          .reduce((s, x) => s + x.Monto, 0));
    unidades.forEach((u) => {
      const contado = ingByUnidad(u, false);
      if (sum(contado) !== 0) push(u, contado, 'detail', true);
    });
    unidades.forEach((u) => {
      const credito = ingByUnidad(u, true);
      if (sum(credito) !== 0) push(`Cobranzas crédito ${u.toLowerCase().replace('atencion_', '')}`, credito, 'detail', true);
    });
    push('TOTAL INGRESOS', val((r) => r.IngresosOp), 'total');

    // EGRESOS OPERATIVOS
    push('EGRESOS OPERATIVOS', new Array(12).fill(0), 'header');
    push('Personal', val((r) => r.EgrPersonal), 'detail', true);
    push('Administrativo', val((r) => r.EgrAdmin), 'detail', true);
    push('Médico', val((r) => r.EgrMedico), 'detail', true);
    push('Tributos + AFP', val((r) => r.EgrTributos), 'detail', true);
    push('Impuesto a la renta', val((r) => r.EgrRenta), 'detail', true);
    push('TOTAL EGRESOS OPERATIVOS', val((r) => r.TotalEgresosOp), 'total');

    push('FLUJO DE CAJA OPERATIVO', val((r) => r.FlujoOperativo), 'total');
    push('Inversión', val((r) => r.Inversion), 'detail', true);
    push('CAJA OPERATIVA + INVERSIÓN', val((r) => r.CajaOpInversion), 'total');
    push('Financiamiento (amort. + ITF)', val((r) => r.Financiamiento), 'detail', true);
    push('CAJA OPERATIVA + FINANCIAMIENTO', val((r) => r.CajaOpFinanciamiento), 'total');
    push('Otros egresos', val((r) => r.OtrosEgresos), 'detail', true);
    push('Otros ingresos', val((r) => r.OtrosIngresos), 'detail', true);
    push('SALDO DE CAJA', val((r) => r.SaldoDeCaja), 'total');

    const saldoIni = val((r) => r.SaldoInicial);
    const saldoFin = val((r) => r.SaldoFinal);
    push('SALDO INICIAL', saldoIni, 'saldo', false, saldoIni[0]);
    push('SALDO FINAL', saldoFin, 'saldo', false, saldoFin[11]);
    return out;
  }, [data]);

  const cerrarMes = async () => {
    if (!window.confirm(`Cerrar caja de ${MESES[mesCerrar - 1]} ${anio}? Materializa el saldo y encadena el mes siguiente.`)) return;
    try {
      const res = await contabilidadService.cajaCerrarMes(anio, mesCerrar);
      toast.success(`Mes cerrado. Saldo final: S/ ${res.saldoFinal.toLocaleString('es-PE')}`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al cerrar mes'); }
  };
  const reabrirMes = async () => {
    if (!window.confirm(`Reabrir ${MESES[mesCerrar - 1]} ${anio}? (solo SA)`)) return;
    try { await contabilidadService.cajaReabrirMes(anio, mesCerrar); toast.success('Mes reabierto'); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error al reabrir'); }
  };
  const fijarApertura = async () => {
    const si = window.prompt('Saldo inicial de apertura (S/):', '0');
    if (si === null) return;
    const mn = window.prompt('MONTO INICIAL NETO (ajuste pre-2026, S/):', '0');
    if (mn === null) return;
    try {
      await contabilidadService.cajaApertura(anio, 1, Number(si), Number(mn));
      toast.success('Apertura fijada en enero');
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error en apertura'); }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Flujo de Caja Consolidado</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ingresos por cobranza y egresos pagados, por mes, con saldos encadenados.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={selCls}>
            {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
          {canWrite && (
            <>
              <select value={mesCerrar} onChange={(e) => setMesCerrar(Number(e.target.value))} className={selCls}>
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <button onClick={cerrarMes} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                <Lock className="h-4 w-4" /> Cerrar mes
              </button>
              <button onClick={fijarApertura} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                <PlayCircle className="h-4 w-4" /> Apertura
              </button>
              {hasRole('SA') && (
                <button onClick={reabrirMes} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 text-sm text-amber-700 hover:bg-amber-50">
                  <Unlock className="h-4 w-4" /> Reabrir
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* filtro por medio de pago (liquidez). Independiente del select de mes (que es para Cerrar Mes). */}
      <MediosPagoFilterCard
        medios={medios}
        seleccion={seleccion}
        incluirCredito={incluirCredito}
        onAplicar={(sel, credito) => { setSeleccion(sel); setIncluirCredito(credito); }}
      />

      {filtroActivo && (
        <div className="mb-4 text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Vista filtrada: {seleccion.length} de {medios.length} medios{!incluirCredito ? ' · crédito excluido' : ''}. Ingresos reflejan el filtro; egresos y saldos son totales.
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400 border-b-2 border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2 text-left sticky left-0 bg-white dark:bg-slate-800 z-10 min-w-[220px]">Concepto</th>
              {MESES.map((m) => <th key={m} className="px-2 py-2 text-right whitespace-nowrap">{m}</th>)}
              <th className="px-3 py-2 text-right font-bold bg-slate-50 dark:bg-slate-700/40">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={14} className="px-3 py-8 text-center text-slate-400">Cargando...</td></tr>}
            {!loading && rows.map((r, idx) => {
              // D5: saldos/apertura atenuados (no reflejan el filtro). D2: egresos totales rotulados.
              const dimmed = filtroActivo && r.label.startsWith('SALDO');
              const esEgresoTotal = filtroActivo && r.label === 'TOTAL EGRESOS OPERATIVOS';
              return (
                <tr key={idx} className={`${rowClass(r.kind)} ${dimmed ? 'opacity-50' : ''}`}>
                  <td className={`px-3 py-1.5 text-left sticky left-0 z-10 ${cellBg(r.kind)} ${r.indent ? 'pl-6' : ''}`}>
                    {r.label}
                    {dimmed && <span className="ml-2 text-[10px] font-normal normal-case text-slate-400">no refleja el filtro</span>}
                    {esEgresoTotal && <span className="ml-2 text-[10px] font-normal text-amber-500">totales (sin filtro)</span>}
                  </td>
                  {r.values.map((v, i) => (
                    <td key={i} className="px-2 py-1.5 text-right tabular-nums">{r.kind === 'header' ? '' : money(v)}</td>
                  ))}
                  <td className={`px-3 py-1.5 text-right font-bold tabular-nums ${cellBg(r.kind)}`}>{r.kind === 'header' ? '' : money(r.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Montos en soles redondeados. SALDO FINAL = SALDO INICIAL + SALDO DE CAJA; el saldo final de cada mes es el inicial del siguiente (encadenado).
        {filtroActivo && ' Con filtro activo, los egresos y los saldos se muestran totales (no reflejan el filtro por medio de pago).'}
      </p>
    </div>
  );
};

function rowClass(kind: RowKind): string {
  switch (kind) {
    case 'header': return 'bg-slate-100 dark:bg-slate-700/50 font-bold text-slate-700 dark:text-slate-200 uppercase text-[11px]';
    case 'total': return 'border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100';
    case 'saldo': return 'bg-emerald-50 dark:bg-emerald-900/20 font-bold text-emerald-700 dark:text-emerald-300';
    default: return 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30';
  }
}
function cellBg(kind: RowKind): string {
  switch (kind) {
    case 'header': return 'bg-slate-100 dark:bg-slate-700/50';
    case 'saldo': return 'bg-emerald-50 dark:bg-emerald-900/20';
    default: return 'bg-white dark:bg-slate-800';
  }
}

const selCls = 'px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

export default FlujoConsolidado;
