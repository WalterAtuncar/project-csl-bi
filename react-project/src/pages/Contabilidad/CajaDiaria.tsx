import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, ArrowUpCircle, ArrowDownCircle, Boxes, FileSpreadsheet, FileText } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import type { CajaDiaRow, CajaIndicadores, FormaPagoRow, CuadreDiaResponse } from '../../services/contabilidad/contaTypes';
import MediosPagoFilterCard from './components/MediosPagoFilterCard';
import ReconciliacionCajaMayorCard from './components/ReconciliacionCajaMayorCard';
import { unidadCorto, unidadColor } from './components/dashboard/dashHelpers';
import { exportarCuadreCajaExcel, type CuadreExportData } from './components/caja/excelCuadreCaja';
import { abrirCierreCajaPDF } from './components/caja/CierreCajaPDF';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad = (n: number) => String(n).padStart(2, '0');
const RULE = '─'.repeat(80);
// El backend puede marcar el origen del egreso como 'CAJA LEGACY' (pipeline de caja mayor). "Legacy" es
// jerga interna y NO debe verse en la UI: se muestra como 'CAJA MAYOR' y se limpia cualquier resto del término.
const labelOrigen = (o?: string) =>
  (o ?? '').replace(/CAJA\s+LEGACY/i, 'CAJA MAYOR').replace(/\bLEGACY\b/gi, '').replace(/\s+/g, ' ').trim();

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

  // Filtro por TIPO DE CAJA (unidad) — 100% client-side sobre los Ingresos del cuadre ya en memoria.
  // Se deriva del propio día (distinct de Unidad); todos ON por default; mínimo 1; toggle en vivo (sin Aplicar).
  const [unidadesSel, setUnidadesSel] = useState<string[]>([]);

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
  // Es 1 dia -> barato re-consultar. Ingresos vienen filtrados por MEDIO DE PAGO desde el server;
  // egresos vienen totales (sin filtro de medio de pago). El filtro por TIPO DE CAJA es client-side
  // y aplica a AMBOS (ingresos y egresos) via unidadesSel.
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

  // --- Filtro por tipo de caja (unidad): CLIENT-SIDE sobre el cuadre en memoria (ingresos + egresos) ---
  // Opción A: los chips se derivan del día -> distinct de las unidades presentes en ingresos ∪ egresos.
  // Una unidad que solo aparece en egresos (p.ej. FARMACIA sin ingreso ese día) igual tiene su chip.
  const unidadesDisponibles = useMemo(
    () =>
      cuadre
        ? [...new Set([...cuadre.Ingresos.map((i) => i.Unidad), ...cuadre.Egresos.map((e) => e.Unidad || 'SIN UNIDAD')])].sort()
        : [],
    [cuadre],
  );
  // Al cambiar de día (nuevo cuadre) resetea la selección a "todas las unidades disponibles".
  useEffect(() => {
    if (cuadre) setUnidadesSel(unidadesDisponibles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuadre]);
  // Ingresos visibles = solo las unidades seleccionadas.
  const ingresosVisibles = useMemo(
    () => (cuadre ? cuadre.Ingresos.filter((i) => unidadesSel.includes(i.Unidad)) : []),
    [cuadre, unidadesSel],
  );
  // Egresos visibles = solo las unidades seleccionadas (la fila trae Unidad; null/'' -> 'SIN UNIDAD').
  const egresosVisibles = useMemo(
    () => (cuadre ? cuadre.Egresos.filter((e) => unidadesSel.includes(e.Unidad || 'SIN UNIDAD')) : []),
    [cuadre, unidadesSel],
  );
  // Mínimo 1: no permite desmarcar la última unidad seleccionada (mismo comportamiento que FiltroDashboardCard).
  const toggleUnidad = (u: string) => {
    const has = unidadesSel.includes(u);
    if (has && unidadesSel.length === 1) return;
    setUnidadesSel(has ? unidadesSel.filter((x) => x !== u) : [...unidadesSel, u]);
  };
  // Vista filtrada por tipo de caja (coexiste con `filtroActivo`, el de medios de pago; son independientes).
  const filtroTipoCajaActivo = cuadre != null && unidadesSel.length < unidadesDisponibles.length;

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
    const map = new Map<string, number>();
    ingresosVisibles.forEach((i) => {
      const k = i.FormaPago || 'SIN FORMA DE PAGO';
      map.set(k, (map.get(k) || 0) + i.Monto);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [ingresosVisibles]);

  // Cuadre agrupado por TIPO DE CAJA (unidad: asistencial, ocupacional, farmacia, ...).
  // GroupBy client-side sobre los Ingresos del cuadre (el detalle ya trae Unidad, D5), orden desc.
  const totalesPorTipoCaja = useMemo(() => {
    const map = new Map<string, number>();
    ingresosVisibles.forEach((i) => {
      const k = i.Unidad || 'SIN TIPO DE CAJA';
      map.set(k, (map.get(k) || 0) + i.Monto);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [ingresosVisibles]);
  const maxTipoCaja = totalesPorTipoCaja.length ? totalesPorTipoCaja[0][1] : 0;
  const maxFormaPago = totalesPorFormaPago.length ? totalesPorFormaPago[0][1] : 0;

  const totalIngresosCuadre = useMemo(() => ingresosVisibles.reduce((s, i) => s + i.Monto, 0), [ingresosVisibles]);
  const totalEgresosCuadre = useMemo(() => egresosVisibles.reduce((s, e) => s + e.Monto, 0), [egresosVisibles]);
  const netoDia = totalIngresosCuadre - totalEgresosCuadre;
  const cuadreVacio = cuadre != null && cuadre.Ingresos.length === 0 && cuadre.Egresos.length === 0;

  // Payload WYSIWYG del export (Excel/PDF). Se arma on-click desde los MISMOS memos de pantalla
  // (nada re-consultado ni re-sumado desde el cuadre crudo). Origen de egreso YA traducido con
  // labelOrigen (§R2: "legacy" jamás visible). generadoPor sale de la sesión conta (§R4).
  const buildExportData = (): CuadreExportData => {
    let generadoPor = '—';
    try {
      const raw = localStorage.getItem('conta_user');
      if (raw) generadoPor = JSON.parse(raw).Username || '—';
    } catch { /* fallback '—' */ }
    return {
      fecha: diaSeleccionado ?? '',
      generadoPor,
      ingresos: ingresosVisibles.map((r) => ({
        Documento: r.Documento ?? '—',
        Unidad: r.Unidad,
        FormaPago: r.FormaPago,
        Condicion: r.EsCobranzaCredito ? 'CRÉDITO' : 'CONTADO',
        Cajero: r.UsuarioCajero,
        Monto: r.Monto,
      })),
      egresos: egresosVisibles.map((r) => ({
        Origen: labelOrigen(r.Origen),
        Documento: r.Documento ?? '—',
        Unidad: r.Unidad || 'SIN UNIDAD',
        Concepto: r.Concepto ?? '—',
        Monto: r.Monto,
      })),
      totalesPorFormaPago,
      totalesPorTipoCaja,
      totalIngresos: totalIngresosCuadre,
      totalEgresos: totalEgresosCuadre,
      neto: netoDia,
      filtroUnidades: filtroTipoCajaActivo ? unidadesSel.map(unidadCorto) : null,
      filtroMedios: filtroActivo ? `${seleccion.length} de ${medios.length} medios${!incluirCredito ? ' · crédito excluido' : ''}` : null,
    };
  };

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

      {/* indicador de la reconciliación de la CAJA MAYOR LEGACY (tubería distinta de esta Caja Diaria) */}
      <ReconciliacionCajaMayorCard />

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
            {(filtroActivo || filtroTipoCajaActivo) && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">vista filtrada</span>
            )}
          </div>

          {/* Filtro por tipo de caja (unidad): chips derivados del día (ingresos ∪ egresos), toggle EN VIVO. */}
          {cuadre && unidadesDisponibles.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tipos de caja (unidades)</label>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
                  <Boxes className="h-3 w-3" /> {unidadesSel.length}/{unidadesDisponibles.length} cajas
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unidadesDisponibles.map((u) => {
                  const on = unidadesSel.includes(u);
                  const esUltimo = on && unidadesSel.length === 1;
                  const color = unidadColor(u);
                  return (
                    <label
                      key={u}
                      title={esUltimo ? 'Elige al menos un tipo de caja' : undefined}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium select-none transition-colors ${on ? 'border-transparent text-white' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-transparent'} ${esUltimo ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      style={on ? { backgroundColor: color } : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleUnidad(u)}
                        className="h-3 w-3 rounded border-slate-300 accent-slate-700"
                      />
                      {unidadCorto(u)}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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
                {ingresosVisibles.length > 0 && (
                  <>
                    <div className="mb-1 text-[11px] font-sans font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide">Ingresos</div>
                    <table className="w-full">
                      <tbody>
                        {ingresosVisibles.map((r, i) => (
                          <tr key={`i-${i}`} className="border-b border-slate-50 dark:border-slate-700/30">
                            <td className="py-0.5 pr-2 text-right text-slate-400 w-7">{i + 1}</td>
                            <td className="py-0.5 pr-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.Documento ?? '—'}</td>
                            <td className="py-0.5 pr-2 text-slate-500 dark:text-slate-400">{r.Unidad}</td>
                            <td className="py-0.5 pr-2 text-slate-500 dark:text-slate-400">{r.FormaPago}</td>
                            <td className="py-0.5 pr-2 text-slate-500 dark:text-slate-400 whitespace-nowrap truncate max-w-[120px]">{r.UsuarioCajero}</td>
                            <td className="py-0.5 text-right text-slate-700 dark:text-slate-200 whitespace-nowrap">{money(r.Monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {/* EGRESOS: filtrados por tipo de caja (client-side); el filtro de MEDIOS DE PAGO NO
                    se refleja en egresos -> la nota "(totales…)" solo aplica cuando `filtroActivo`. */}
                {egresosVisibles.length > 0 && (
                  <>
                    <div className="mt-3 mb-1 text-[11px] font-sans font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wide">
                      Egresos
                      {filtroActivo && <span className="ml-1 normal-case font-normal text-amber-500">(totales — no reflejan el filtro)</span>}
                    </div>
                    <table className="w-full">
                      <tbody>
                        {egresosVisibles.map((r, i) => (
                          <tr key={`e-${i}`} className="border-b border-slate-50 dark:border-slate-700/30">
                            <td className="py-0.5 pr-2 text-right text-slate-400 w-7">{i + 1}</td>
                            <td className="py-0.5 pr-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{labelOrigen(r.Origen)}</td>
                            <td className="py-0.5 pr-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.Documento ?? '—'}</td>
                            <td className="py-0.5 pr-2 text-slate-500 dark:text-slate-400">{unidadCorto(r.Unidad || 'SIN UNIDAD')}</td>
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
                {totalesPorFormaPago.map(([fp, monto], idx) => {
                  const barPct = maxFormaPago > 0 ? (monto / maxFormaPago) * 100 : 0;
                  const pct = totalIngresosCuadre > 0 ? (monto / totalIngresosCuadre) * 100 : 0;
                  return (
                    // key incluye el dia => re-dispara la animacion de llenado al cambiar de dia
                    <div key={`${diaSeleccionado}-fp-${fp}`} className="relative overflow-hidden rounded">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded bg-secondary/10 dark:bg-secondary/20"
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut', delay: idx * 0.12 }}
                      />
                      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-0.5 px-1.5 text-slate-600 dark:text-slate-300">
                        <span className="truncate"><span className="font-semibold text-secondary dark:text-red-400">*****TOTAL*****</span> {fp}</span>
                        <span className="font-sans text-[11px] font-semibold text-center text-secondary dark:text-red-400 tabular-nums">{pct.toFixed(1)}%</span>
                        <span className="text-right whitespace-nowrap">S/ {money(monto)}</span>
                      </div>
                    </div>
                  );
                })}
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

                {/* Cuadre por tipo de caja: ingresos del dia agrupados por unidad, mayor a menor */}
                {totalesPorTipoCaja.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="mb-1.5 flex items-baseline justify-between font-sans">
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                        Cuadre por tipo de caja
                        {(filtroActivo || filtroTipoCajaActivo) && <span className="ml-1 normal-case font-normal text-amber-500">(ingresos filtrados)</span>}
                      </span>
                      <span className="text-[10px] text-slate-400">ingresos por unidad</span>
                    </div>
                    <div className="space-y-1">
                      {totalesPorTipoCaja.map(([unidad, monto], idx) => {
                        const pct = totalIngresosCuadre > 0 ? (monto / totalIngresosCuadre) * 100 : 0;
                        const barPct = maxTipoCaja > 0 ? (monto / maxTipoCaja) * 100 : 0;
                        return (
                          // key incluye el dia => remonta y re-dispara la animacion de llenado al cambiar de dia
                          <div key={`${diaSeleccionado}-${unidad}`} className="relative overflow-hidden rounded">
                            <motion.div
                              className="absolute inset-y-0 left-0 rounded bg-indigo-100 dark:bg-indigo-500/20"
                              initial={{ width: 0 }}
                              animate={{ width: `${barPct}%` }}
                              transition={{ duration: 0.9, ease: 'easeOut', delay: idx * 0.12 }}
                            />
                            <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-1.5 py-0.5">
                              <span className="font-sans text-[11px] text-slate-600 dark:text-slate-300 truncate">{unidad}</span>
                              <span className="font-sans text-[11px] font-semibold text-center text-primary dark:text-blue-300 tabular-nums">{pct.toFixed(1)}%</span>
                              <span className="text-right text-slate-700 dark:text-slate-200 whitespace-nowrap">S/ {money(monto)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Exportar el cuadre del día (WYSIWYG): Excel se descarga, PDF se abre en pestaña nueva.
                    Bajo guard de cuadre con movimientos (ingresos o egresos visibles). */}
                {(ingresosVisibles.length > 0 || egresosVisibles.length > 0) && (
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2 font-sans">
                    <button
                      onClick={() => exportarCuadreCajaExcel(buildExportData())}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[#217346] hover:bg-[#1a5c38]"
                    >
                      <FileSpreadsheet className="h-4 w-4" /> Excel
                    </button>
                    <button
                      onClick={() => { abrirCierreCajaPDF(buildExportData()).catch(() => toast.error('No se pudo generar el PDF')); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[#F40F02] hover:bg-[#c50c01]"
                    >
                      <FileText className="h-4 w-4" /> PDF
                    </button>
                  </div>
                )}

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
