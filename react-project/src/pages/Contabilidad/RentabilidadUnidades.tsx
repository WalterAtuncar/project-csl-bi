import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import type { RentabilidadUnidadRow, RentabilidadGastoRow } from '../../services/contabilidad/contaTypes';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const unidadLabel = (u: string) => u.replace(/_/g, ' ');

const semCls: Record<string, string> = {
  RENTABLE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  BAJO_MARGEN: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  PERDIDA: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  SIN_INGRESO: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
  NEUTRO: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
  TOTAL: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
};
const semLabel: Record<string, string> = {
  RENTABLE: 'Rentable', BAJO_MARGEN: 'Bajo margen', PERDIDA: 'Pérdida',
  SIN_INGRESO: 'Sin ingreso', NEUTRO: 'Neutro', TOTAL: 'Total',
};

const RentabilidadUnidades: React.FC = () => {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<RentabilidadUnidadRow[]>([]);
  const [gastos, setGastos] = useState<RentabilidadGastoRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  // Toggle "incluir ventas a credito" (PLAN §5.4). Estado local, default ON, sin persistencia (T5).
  const [incluirCredito, setIncluirCredito] = useState(true);
  const filtroActivo = !incluirCredito;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // El toggle aplica a PorUnidad (ingresos); rentabilidadGastos se recarga igual pero SIN
      // el param — los gastos no tienen dimension de condicion de venta (T3/T6).
      const incluirCreditoParam = incluirCredito ? undefined : false;
      const [u, g] = await Promise.all([
        contabilidadService.rentabilidadPorUnidad(anio, mes, incluirCreditoParam),
        contabilidadService.rentabilidadGastos(anio, mes),
      ]);
      setRows(u);
      setGastos(g);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando rentabilidad por unidad');
    } finally { setLoading(false); }
  }, [anio, mes, incluirCredito]);

  useEffect(() => { load(); }, [load]);

  const gastosPorUnidad = useMemo(() => {
    const map = new Map<string, RentabilidadGastoRow[]>();
    gastos.forEach((g) => {
      const k = g.Unidad || 'ADMINISTRACION';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(g);
    });
    return map;
  }, [gastos]);

  const toggle = (u: string) => {
    const s = new Set(expanded);
    s.has(u) ? s.delete(u) : s.add(u);
    setExpanded(s);
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Rentabilidad por Unidad</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Resultado por unidad de negocio. Haga clic en una fila para ver el detalle de gastos.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={selCls}>
            {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={selCls}>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          {/* Toggle credito: aplica directo al cambiar (sin boton Aplicar) — PLAN §5.2 */}
          <label
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none"
            title="OFF = solo facturación al contado y depósito; se excluyen las ventas a crédito (cuentas por cobrar)"
          >
            <input
              type="checkbox"
              checked={incluirCredito}
              onChange={(e) => setIncluirCredito(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Incluir ventas a crédito
          </label>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </div>
      </div>

      {/* banner de vista sin credito */}
      {filtroActivo && (
        <div className="mb-4 text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Vista sin ventas a crédito
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2">Unidad</th>
              <th className="px-3 py-2 text-right">Ingresos</th>
              <th className="px-3 py-2 text-right">
                Gastos{filtroActivo && <span className="block font-normal normal-case text-[10px] text-amber-600 dark:text-amber-400">totales (no filtrados)</span>}
              </th>
              <th className={`px-3 py-2 text-right ${filtroActivo ? 'opacity-50' : ''}`}>Resultado</th>
              <th className={`px-3 py-2 text-right ${filtroActivo ? 'opacity-50' : ''}`}>Margen</th>
              <th className={`px-3 py-2 text-center ${filtroActivo ? 'opacity-50' : ''}`}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Cargando...</td></tr>}
            {!loading && rows.map((r) => {
              const key = r.Unidad;
              const gs = gastosPorUnidad.get(r.Unidad) || [];
              const isOpen = expanded.has(key);
              const rowStyle = r.EsTotal ? 'font-bold bg-sky-50 dark:bg-sky-900/20' : r.EsAdministracion ? 'text-slate-500 dark:text-slate-400' : '';
              return (
                <React.Fragment key={key}>
                  <tr className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer ${rowStyle}`} onClick={() => gs.length && toggle(key)}>
                    <td className="px-3 py-2">{gs.length ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : null}</td>
                    <td className="px-3 py-2 font-medium">{unidadLabel(r.Unidad)}</td>
                    <td className="px-3 py-2 text-right">{money(r.Ingresos)}</td>
                    <td className="px-3 py-2 text-right text-rose-500">{money(r.Gastos)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${r.Resultado >= 0 ? 'text-emerald-600' : 'text-rose-600'} ${filtroActivo ? 'opacity-50' : ''}`}>{money(r.Resultado)}</td>
                    <td className={`px-3 py-2 text-right ${filtroActivo ? 'opacity-50' : ''}`}>{r.EsAdministracion ? '—' : `${r.MargenPorc}%`}</td>
                    <td className={`px-3 py-2 text-center ${filtroActivo ? 'opacity-50' : ''}`}>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${semCls[r.Semaforo] || 'bg-slate-100 text-slate-500'}`}>{semLabel[r.Semaforo] || r.Semaforo}</span>
                    </td>
                  </tr>
                  {isOpen && gs.map((g, i) => (
                    <tr key={`${key}-${i}`} className="bg-slate-50/60 dark:bg-slate-900/30 text-xs text-slate-500 dark:text-slate-400">
                      <td></td>
                      <td className="px-3 py-1.5 pl-8">{g.CentroCosto || 'Sin centro'}</td>
                      <td></td>
                      <td className="px-3 py-1.5 text-right text-rose-400">{money(g.Gasto)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* rotulo T4: Resultado/Margen/Estado son vista parcial con OFF */}
      {filtroActivo && (
        <p className="mt-3 text-[11px] leading-tight text-amber-600 dark:text-amber-400">
          Resultado / Margen / Estado: calculado sobre ingresos sin crédito y gastos totales — vista parcial.
        </p>
      )}
    </div>
  );
};

const selCls = 'px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

export default RentabilidadUnidades;
