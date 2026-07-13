import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import type { CajaDiaRow, CajaIndicadores, FormaPagoRow, CuadreDiaResponse } from '../../services/contabilidad/contaTypes';
import MediosPagoFilterCard from './components/MediosPagoFilterCard';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad = (n: number) => String(n).padStart(2, '0');
const RULE = '─'.repeat(80);

const CajaDiaria: React.FC = () => {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [dias, setDias] = useState<CajaDiaRow[]>([]);
  const [indic, setIndic] = useState<CajaIndicadores | null>(null);
  const [loading, setLoading] = useState(false);

  // Cuadre de caja diario: el dia se elige por click en el grafico o en la serie (un unico estado).
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [cuadre, setCuadre] = useState<CuadreDiaResponse | null>(null);

  // Filtro por medio de pago (estado local propio de la pantalla, D4: sin persistencia/context).
  const [medios, setMedios] = useState<FormaPagoRow[]>([]);
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [incluirCredito, setIncluirCredito] = useState(true);
  const filtroActivo = medios.length > 0 && (seleccion.length < medios.length || !incluirCredito);

  // Catalogo dinamico de medios (una vez). Default = todos marcados + credito ON.
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
      const [serie, ind] = await Promise.all([
        contabilidadService.cajaDiaria(anio, mes, formasPagoParam, incluirCreditoParam),
        contabilidadService.cajaIndicadores(anio, mes),
      ]);
      setDias(serie);
      setIndic(ind);
      // dia objetivo del cuadre: hoy si es el mes en curso; si no, el ultimo dia con movimiento.
      const esMesActual = anio === now.getFullYear() && mes === now.getMonth() + 1;
      const diaObjetivo = esMesActual ? `${anio}-${pad(mes)}-${pad(now.getDate())}` : serie[serie.length - 1]?.Dia?.slice(0, 10);
      setDiaSeleccionado(diaObjetivo ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando caja diaria');
    } finally {
      setLoading(false);
    }
  }, [anio, mes, seleccion, incluirCredito, medios]);

  useEffect(() => { load(); }, [load]);

  // Cuadre del dia seleccionado (server-side): re-fetch al cambiar de dia o el filtro.
  // Es 1 dia -> barato re-consultar. Ingresos vienen filtrados; egresos SIEMPRE totales (D4).
  useEffect(() => {
    if (!diaSeleccionado) { setCuadre(null); return; }
    const formasPagoParam = medios.length > 0 && seleccion.length < medios.length ? seleccion.join(',') : undefined;
    const incluirCreditoParam = incluirCredito ? undefined : false;
    let cancelado = false;
    setCuadre(null);
    contabilidadService
      .cajaCuadreDia(diaSeleccionado, formasPagoParam, incluirCreditoParam)
      .then((c) => { if (!cancelado) setCuadre(c); })
      .catch((e) => { if (!cancelado) toast.error(e instanceof Error ? e.message : 'Error cargando el cuadre del día'); });
    return () => { cancelado = true; };
  }, [diaSeleccionado, seleccion, incluirCredito, medios]);

  const totalIngresos = useMemo(() => dias.reduce((s, d) => s + d.Ingresos, 0), [dias]);
  const totalEgresos = useMemo(() => dias.reduce((s, d) => s + d.Egresos, 0), [dias]);
  const saldoHoy = useMemo(() => (dias.length ? dias[dias.length - 1].SaldoAcumulado : 0), [dias]);

  const chartData = useMemo(() => dias.map((d) => ({
    dia: d.Dia.slice(8, 10),
    Saldo: Number(d.SaldoAcumulado),
    Ingresos: Number(d.Ingresos),
    Egresos: Number(d.Egresos),
  })), [dias]);

  // Lineas *****TOTAL***** por forma de pago (GroupBy client-side sobre Ingresos del cuadre, D5).
  const totalesPorFormaPago = useMemo(() => {
    if (!cuadre) return [] as [string, number][];
    const map = new Map<string, number>();
    cuadre.Ingresos.forEach((i) => {
      const k = i.FormaPago || 'SIN FORMA DE PAGO';
      map.set(k, (map.get(k) || 0) + i.Monto);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [cuadre]);

  const totalIngresosCuadre = useMemo(() => (cuadre ? cuadre.Ingresos.reduce((s, i) => s + i.Monto, 0) : 0), [cuadre]);
  const totalEgresosCuadre = useMemo(() => (cuadre ? cuadre.Egresos.reduce((s, e) => s + e.Monto, 0) : 0), [cuadre]);
  const netoDia = totalIngresosCuadre - totalEgresosCuadre;
  const cuadreVacio = cuadre != null && cuadre.Ingresos.length === 0 && cuadre.Egresos.length === 0;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Caja Diaria</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Saldo de caja al día. Ingresos por cobranza menos egresos pagados.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={selCls}>
            {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={selCls}>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </div>
      </div>

      {/* filtro por medio de pago (liquidez) */}
      <MediosPagoFilterCard
        medios={medios}
        seleccion={seleccion}
        incluirCredito={incluirCredito}
        onAplicar={(sel, credito) => { setSeleccion(sel); setIncluirCredito(credito); }}
      />

      {/* banner de vista filtrada */}
      {filtroActivo && (
        <div className="mb-4 text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Vista filtrada: {seleccion.length} de {medios.length} medios{!incluirCredito ? ' · crédito excluido' : ''}
        </div>
      )}

      {/* tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card title="Saldo al día" value={saldoHoy} icon={<Wallet className="h-5 w-5" />} tone="emerald"
          dimmed={filtroActivo} note={filtroActivo ? 'Saldos de caja TOTAL — no reflejan el filtro' : undefined} />
        <Card title={`Ingresos ${MESES[mes - 1]} (al día)`} value={totalIngresos} icon={<TrendingUp className="h-5 w-5" />} tone="sky" />
        <Card title={`Egresos ${MESES[mes - 1]} (al día)`} value={totalEgresos} icon={<TrendingDown className="h-5 w-5" />} tone="rose"
          note={filtroActivo ? 'Egresos totales (sin filtro por medio de pago)' : undefined} />
      </div>
      {/* indicadores por pagar / por cobrar (checklist E2E) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Card title="Egresos por pagar (deuda)" value={indic?.PorPagar ?? 0} icon={<ArrowDownCircle className="h-5 w-5" />} tone="amber" />
        <Card title="Ventas al crédito por cobrar" value={indic?.PorCobrar ?? 0} icon={<ArrowUpCircle className="h-5 w-5" />} tone="violet" />
      </div>

      {/* grafico saldo diario */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-5">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Saldo de caja acumulado</h3>
          <span className="text-[11px] text-slate-400">
            {filtroActivo ? 'Saldos de caja TOTAL — no reflejan el filtro · ' : ''}Haz click en un día para ver su cuadre
          </span>
        </div>
        <div style={{ width: '100%', height: 260, cursor: 'pointer' }} className={filtroActivo ? 'opacity-50' : ''}>
          <ResponsiveContainer>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              onClick={(st: any) => { const d = st?.activeLabel; if (d) setDiaSeleccionado(`${anio}-${pad(mes)}-${d}`); }}
            >
              <defs>
                <linearGradient id="gSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} width={44} />
              <Tooltip formatter={(v: number) => `S/ ${money(v)}`} labelFormatter={(l) => `Día ${l}`} />
              <Area type="monotone" dataKey="Saldo" stroke="#10b981" strokeWidth={2} fill="url(#gSaldo)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* cuadre de caja diario (estilo reporte SAMBHS) */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Cuadre de caja diario{diaSeleccionado ? ` — ${diaSeleccionado}` : ''}
            </h3>
            {filtroActivo && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">vista filtrada</span>
            )}
          </div>

          {!diaSeleccionado ? (
            <p className="text-sm text-slate-400 py-6 text-center">Haz click en un día del gráfico o de la serie para ver su cuadre</p>
          ) : !cuadre ? (
            <p className="text-sm text-slate-400 py-6 text-center">Cargando cuadre…</p>
          ) : cuadreVacio ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sin movimientos ese día</p>
          ) : (
            <>
              {/* detalle largo: scrollea; los bloques TOTAL/pie quedan fijos fuera del scroll */}
              <div className="max-h-[380px] overflow-y-auto font-mono text-xs tabular-nums pr-1">
                {/* INGRESOS */}
                {cuadre.Ingresos.length > 0 && (
                  <>
                    <div className="mb-1 text-[11px] font-sans font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide">Ingresos</div>
                    <table className="w-full">
                      <tbody>
                        {cuadre.Ingresos.map((r, i) => (
                          <tr key={`i-${i}`} className="border-b border-slate-50 dark:border-slate-700/30">
                            <td className="py-0.5 pr-2 text-right text-slate-400 w-7">{i + 1}</td>
                            <td className="py-0.5 pr-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.Documento ?? '—'}</td>
                            <td className="py-0.5 pr-2 text-slate-500 dark:text-slate-400">{r.Unidad}</td>
                            <td className="py-0.5 pr-2 text-slate-500 dark:text-slate-400">{r.FormaPago}</td>
                            <td className="py-0.5 text-right text-slate-700 dark:text-slate-200 whitespace-nowrap">{money(r.Monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {/* EGRESOS (siempre totales; rotulado cuando hay filtro activo) */}
                {cuadre.Egresos.length > 0 && (
                  <>
                    <div className="mt-3 mb-1 text-[11px] font-sans font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wide">
                      Egresos
                      {filtroActivo && <span className="ml-1 normal-case font-normal text-amber-500">(totales — no reflejan el filtro)</span>}
                    </div>
                    <table className="w-full">
                      <tbody>
                        {cuadre.Egresos.map((r, i) => (
                          <tr key={`e-${i}`} className="border-b border-slate-50 dark:border-slate-700/30">
                            <td className="py-0.5 pr-2 text-right text-slate-400 w-7">{i + 1}</td>
                            <td className="py-0.5 pr-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.Origen}</td>
                            <td className="py-0.5 pr-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.Documento ?? '—'}</td>
                            <td className="py-0.5 pr-2 text-slate-500 dark:text-slate-400">{r.Concepto ?? '—'}</td>
                            <td className="py-0.5 text-right text-rose-500 whitespace-nowrap">−{money(r.Monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              {/* bloque fijo: separadores + *****TOTAL***** por forma de pago + pie */}
              <div className="mt-2 font-mono text-xs tabular-nums">
                <div className="text-slate-300 dark:text-slate-600 overflow-hidden whitespace-nowrap select-none leading-none">{RULE}</div>
                {totalesPorFormaPago.map(([fp, monto]) => (
                  <div key={fp} className="flex justify-between gap-2 py-0.5 text-slate-600 dark:text-slate-300">
                    <span className="whitespace-nowrap"><span className="text-emerald-600 dark:text-emerald-400">*****TOTAL*****</span> {fp}</span>
                    <span className="whitespace-nowrap">S/ {money(monto)}</span>
                  </div>
                ))}
                <div className="text-slate-300 dark:text-slate-600 overflow-hidden whitespace-nowrap select-none leading-none">{RULE}</div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500 dark:text-slate-400">Total ingresos</span>
                  <span className="font-semibold text-sky-600 dark:text-sky-400">S/ {money(totalIngresosCuadre)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500 dark:text-slate-400">Total egresos</span>
                  <span className="font-semibold text-rose-500">S/ −{money(totalEgresosCuadre)}</span>
                </div>
                <div className="flex justify-between py-1 mt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-100">NETO DEL DÍA</span>
                  <span className={`font-bold ${netoDia >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>S/ {money(netoDia)}</span>
                </div>
                <div className="mt-2 text-[10px] font-sans text-slate-400 dark:text-slate-500">Dinero en caja: — · Depósito día ant.: — · Nro. operación: —</div>
              </div>
            </>
          )}
        </div>

        {/* serie diaria (click en una fila selecciona el dia del cuadre) */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-2">Día</th>
                <th className="px-3 py-2 text-right">Ingresos</th>
                <th className="px-3 py-2 text-right" title={filtroActivo ? 'Egresos totales (sin filtro por medio de pago)' : undefined}>
                  Egresos{filtroActivo && <span className="text-[10px] font-normal text-amber-500 ml-1">(totales)</span>}
                </th>
                <th className="px-3 py-2 text-right" title={filtroActivo ? 'Saldos de caja TOTAL — no reflejan el filtro' : undefined}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">Cargando...</td></tr>}
              {!loading && dias.map((d) => {
                const diaIso = d.Dia.slice(0, 10);
                const activo = diaSeleccionado === diaIso;
                return (
                  <tr
                    key={d.Dia}
                    onClick={() => setDiaSeleccionado(diaIso)}
                    className={`border-b border-slate-100 dark:border-slate-700/50 cursor-pointer ${activo ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}
                  >
                    <td className="px-3 py-1.5">{diaIso}</td>
                    <td className="px-3 py-1.5 text-right text-sky-600">{d.Ingresos ? money(d.Ingresos) : '—'}</td>
                    <td className="px-3 py-1.5 text-right text-rose-500">{d.Egresos ? money(d.Egresos) : '—'}</td>
                    <td className={`px-3 py-1.5 text-right font-medium ${filtroActivo ? 'opacity-50' : ''}`}>{money(d.SaldoAcumulado)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtroActivo && (
            <p className="text-[11px] text-slate-400 px-3 py-2 border-t border-slate-100 dark:border-slate-700/50">
              Ingresos reflejan el filtro. Egresos y Saldo son totales — no reflejan el filtro.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const toneMap: Record<string, string> = {
  emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600',
  sky: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600',
  rose: 'bg-rose-50 dark:bg-rose-900/30 text-rose-500',
  amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600',
  violet: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600',
};

const Card: React.FC<{ title: string; value: number; icon: React.ReactNode; tone: string; dimmed?: boolean; note?: string }> = ({ title, value, icon, tone, dimmed, note }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
    <div className="flex items-center gap-4">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${toneMap[tone]} ${dimmed ? 'opacity-50' : ''}`}>{icon}</div>
      <div className={dimmed ? 'opacity-50' : ''}>
        <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
        <div className="text-xl font-bold text-slate-800 dark:text-slate-100">S/ {money(value)}</div>
      </div>
    </div>
    {note && <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">{note}</div>}
  </div>
);

const selCls = 'px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

export default CajaDiaria;
