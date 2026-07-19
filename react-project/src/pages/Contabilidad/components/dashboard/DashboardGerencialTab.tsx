// TAB Gerencial. Fila de 8 KPI cards (RS0) + 9 charts G1..G9 (§6 del plan). Fetch propio al cambiar
// el filtro; cache por clave desde|hasta|tiposCaja (inyectada por la página, persiste al alternar tabs).
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  LineChart, Line, ComposedChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Wallet, Receipt, Ticket, Percent, HandCoins, Landmark, Scale,
} from 'lucide-react';
import contabilidadService from '../../../../services/contabilidad/ContabilidadService';
import type { DashFiltro, DashGerencialResponse } from '../../../../services/contabilidad/contaTypes';
import { DashCard, KpiCard, DashboardEmptyState, useChartTheme } from './DashUI';
import { MoneyHBar } from './DashCharts';
import WaterfallCaja from './WaterfallCaja';
import HeatmapCobranza from './HeatmapCobranza';
import {
  money, moneyC, moneyAxis, nInt, nPct, mesLabel, mesKey, fmtDiaMes, fmtFecha, truncar,
  unidadColor, unidadCorto, medioColor, catColor, UNIDAD_ORDEN, filtroKey,
} from './dashHelpers';

const RATIO_HINT = 'Cobrado ÷ facturado del período. Puede superar 100% cuando se cobra crédito de meses previos.';
const MARGEN_HINT = 'Margen operativo = (ingresos ajustados por SISOL − egresos devengados) ÷ ingresos.';

const DashboardGerencialTab: React.FC<{ filtro: DashFiltro; cache: Map<string, DashGerencialResponse>; onLoading?: (b: boolean) => void }> = ({ filtro, cache, onLoading }) => {
  const t = useChartTheme();
  const [data, setData] = useState<DashGerencialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // Reporta el estado de carga hacia la página (para el botón "Aplicar" del filtro compartido).
  const report = (b: boolean) => { setLoading(b); onLoading?.(b); };

  const key = filtroKey(filtro.desde, filtro.hasta, filtro.tiposCaja);

  useEffect(() => {
    if (!filtro.desde || !filtro.hasta) { report(true); return; } // sin rango aún; tiposCaja='' = TODOS (válido)
    const cached = cache.get(key);
    if (cached) { setData(cached); report(false); return; }
    let vivo = true;
    report(true);
    contabilidadService.dashGerencial(filtro)
      .then((d) => { if (vivo) { cache.set(key, d); setData(d); } })
      .catch((e) => { if (vivo) { toast.error(e instanceof Error ? e.message : 'Error al cargar el dashboard gerencial'); setData(null); } })
      .finally(() => { if (vivo) report(false); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const k = data?.Kpis;

  // ---- G1/G2: tendencia mensual 13m ----
  const tendencia = useMemo(() => (data?.TendenciaMensual ?? []).map((r) => ({
    label: mesLabel(r.Anio, r.Mes), VentaNeta: r.VentaNeta, Cobrado: r.Cobrado, Egresos: r.Egresos, MargenPct: r.MargenPct,
  })), [data]);

  // ---- G3: serie diaria del rango ----
  const serie = useMemo(() => (data?.SerieDiaria ?? []).map((r) => ({
    label: fmtDiaMes(r.Fecha), full: fmtFecha(r.Fecha), VentaNeta: r.VentaNeta, Cobrado: r.Cobrado, Egresos: r.Egresos,
  })), [data]);

  // ---- G4: mix por unidad (donut + mini tabla) ----
  const mixUnidad = useMemo(() => (data?.MixUnidad ?? [])
    .filter((r) => r.VentaNeta > 0 || r.Cobrado > 0)
    .map((r) => ({ ...r, corto: unidadCorto(r.Unidad), color: unidadColor(r.Unidad) })), [data]);

  // ---- G5: mix mensual apilado por unidad ----
  const mixMensual = useMemo(() => {
    const rows = data?.MixMensual ?? [];
    const unis = Array.from(new Map(rows.map((r) => [r.IdTipoCaja, r.Unidad])).entries())
      .sort((a, b) => (UNIDAD_ORDEN[a[0]] ?? 99) - (UNIDAD_ORDEN[b[0]] ?? 99))
      .map(([id, nombre]) => ({ id, nombre, corto: unidadCorto(nombre), color: unidadColor(nombre) }));
    const byMonth = new Map<string, Record<string, number | string>>();
    for (const r of rows) {
      const mk = mesKey(r.Anio, r.Mes);
      if (!byMonth.has(mk)) byMonth.set(mk, { label: mesLabel(r.Anio, r.Mes), _k: mk });
      const row = byMonth.get(mk)!;
      row[`u${r.IdTipoCaja}`] = ((row[`u${r.IdTipoCaja}`] as number) ?? 0) + r.VentaNeta;
    }
    const arr = Array.from(byMonth.values()).sort((a, b) => String(a._k).localeCompare(String(b._k)));
    return { unis, arr };
  }, [data]);

  // ---- G7: medios de pago (donut) ----
  const medios = useMemo(() => (data?.MediosPago ?? [])
    .filter((r) => r.Monto > 0)
    .map((r, i) => ({ name: r.FormaPago, value: r.Monto, pct: r.Pct, color: medioColor(r.FormaPago, i) })), [data]);

  // ---- G8: CxC por unidad + top egresos ----
  const cxc = useMemo(() => (data?.CxcUnidad ?? [])
    .filter((r) => r.PorCobrar !== 0)
    .sort((a, b) => b.PorCobrar - a.PorCobrar)
    .map((r) => ({ label: unidadCorto(r.Unidad), value: r.PorCobrar, color: unidadColor(r.Unidad), sub: `Facturado ${moneyC(r.CreditoFacturado)} · Cobrado ${moneyC(r.CreditoCobrado)}` })), [data]);
  const topEgr = useMemo(() => (data?.TopEgresos ?? [])
    .map((r, i) => ({ label: truncar(r.Categoria, 22), full: `${r.Categoria} · ${r.Fuente}`, value: r.Monto, color: catColor(i), sub: `${nPct(r.Pct)} del total` })), [data]);

  return (
    <div>
      {/* Timestamp de frescura */}
      <div className="flex justify-end mb-2">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">Datos al {fmtFecha(filtro.hasta)}</span>
      </div>

      {/* Fila de 8 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Ingresos (facturado)" value={money(k?.VentaNeta ?? 0)} sub={`${nInt(k?.NumVentas)} ventas`} icon={TrendingUp} tone="sky" loading={loading}
          delta={k ? { actual: k.VentaNeta, prev: k.VentaNetaPrev } : undefined} />
        <KpiCard label="Cobranza (caja)" value={money(k?.Cobrado ?? 0)} icon={Wallet} tone="emerald" loading={loading}
          delta={k ? { actual: k.Cobrado, prev: k.CobradoPrev } : undefined} />
        <KpiCard label="Ticket promedio" value={money(k?.TicketPromedio ?? 0)} icon={Ticket} tone="violet" loading={loading}
          delta={k ? { actual: k.TicketPromedio, prev: k.TicketPromedioPrev } : undefined} />
        <KpiCard label="Egresos" value={money(k?.Egresos ?? 0)} icon={Receipt} tone="rose" loading={loading}
          delta={k ? { actual: k.Egresos, prev: k.EgresosPrev, invert: true } : undefined} />
        <KpiCard label="Flujo neto" value={money(k?.FlujoNeto ?? 0)} sub="cobrado − egresos" icon={HandCoins}
          tone={(k?.FlujoNeto ?? 0) >= 0 ? 'emerald' : 'rose'} loading={loading} />
        <KpiCard label="Margen operativo" value={nPct(k?.MargenOperativoPct ?? 0)} icon={Percent} tone="amber" loading={loading} hint={MARGEN_HINT}
          delta={k ? { actual: k.MargenOperativoPct, prev: k.MargenOperativoPctPrev, points: true } : undefined} />
        <KpiCard label="Por cobrar (CxC)" value={money(k?.PorCobrar ?? 0)} sub="crédito facturado − cobrado" icon={Landmark} tone="slate" loading={loading} />
        <KpiCard label="Ratio cobranza" value={nPct(k?.RatioCobranzaPct ?? 0)} sub="cobrado ÷ facturado" icon={Scale} tone="sky" loading={loading} hint={RATIO_HINT} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* G1 — Tendencia ingresos vs cobranza (13m) */}
        <DashCard title="Tendencia de ingresos y cobranza" subtitle="Facturado vs cobrado · últimos 13 meses"
          className="lg:col-span-2" loading={loading} height={300}
          isEmpty={!loading && tendencia.length === 0} empty={<DashboardEmptyState pill={false} title="Sin datos" nota="No hay tendencia para el filtro seleccionado." />}>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={tendencia} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.axis }} />
                <YAxis tick={{ fontSize: 11, fill: t.axis }} width={46} tickFormatter={moneyAxis} />
                <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [money(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="VentaNeta" name="Facturado" stroke="#0EA5E9" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="Cobrado" name="Cobrado" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* G2 — Ingresos vs egresos + margen % (13m) */}
        <DashCard title="Ingresos vs egresos y margen" subtitle="Barras: facturado y egresos · línea: margen % (eje derecho)"
          className="lg:col-span-2" loading={loading} height={300}
          isEmpty={!loading && tendencia.length === 0} empty={<DashboardEmptyState pill={false} title="Sin datos" nota="No hay datos para el filtro seleccionado." />}>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <ComposedChart data={tendencia} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.axis }} />
                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: t.axis }} width={46} tickFormatter={moneyAxis} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: t.axis }} width={40} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [n === 'Margen %' ? nPct(v) : money(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="VentaNeta" name="Facturado" fill="#0EA5E9" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar yAxisId="l" dataKey="Egresos" name="Egresos" fill="#F43F5E" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Line yAxisId="r" type="monotone" dataKey="MargenPct" name="Margen %" stroke="#F59E0B" strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* G3 — Actividad diaria del rango */}
        <DashCard title="Actividad diaria del período" subtitle="Facturado y cobrado (área) · egresos (barra) · por día"
          className="lg:col-span-2" loading={loading} height={280}
          isEmpty={!loading && serie.length === 0} empty={<DashboardEmptyState pill={false} title="Sin datos" nota="No hay movimientos diarios para el filtro." />}>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <ComposedChart data={serie} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: t.axis }} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tick={{ fontSize: 11, fill: t.axis }} width={46} tickFormatter={moneyAxis} />
                <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [money(v), n]} labelFormatter={(l, p) => (p && p[0] ? (p[0].payload as { full: string }).full : String(l))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="VentaNeta" name="Facturado" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.14} isAnimationActive={false} />
                <Area type="monotone" dataKey="Cobrado" name="Cobrado" stroke="#10B981" fill="#10B981" fillOpacity={0.16} isAnimationActive={false} />
                <Bar dataKey="Egresos" name="Egresos" fill="#F43F5E" barSize={6} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* G4 — Mix por unidad (donut + mini tabla) */}
        <DashCard title="Mix por unidad de negocio" subtitle="Foto del rango · participación en el facturado"
          loading={loading} height={320}
          isEmpty={!loading && mixUnidad.length === 0} empty={<DashboardEmptyState pill={false} title="Sin ventas" nota="No hay ventas para el filtro seleccionado." />}>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div style={{ width: '55%', height: 240, minWidth: 180 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={mixUnidad} dataKey="VentaNeta" nameKey="corto" cx="50%" cy="50%" innerRadius={54} outerRadius={92} paddingAngle={2} isAnimationActive={false}>
                    {mixUnidad.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={t.tooltip} formatter={(v: number, _n, p) => [money(v), (p?.payload as { corto: string })?.corto]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400 text-left border-b border-slate-100 dark:border-slate-700">
                    <th className="py-1 pr-2 font-medium">Unidad</th>
                    <th className="py-1 px-1 font-medium text-right">Venta</th>
                    <th className="py-1 px-1 font-medium text-right">Cobrado</th>
                    <th className="py-1 pl-1 font-medium text-right">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {mixUnidad.map((r) => (
                    <tr key={r.IdTipoCaja} className="border-b border-slate-50 dark:border-slate-700/50">
                      <td className="py-1 pr-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: r.color }} />
                          {r.corto}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-right tabular-nums">{moneyC(r.VentaNeta)}</td>
                      <td className="py-1 px-1 text-right tabular-nums">{moneyC(r.Cobrado)}</td>
                      <td className={`py-1 pl-1 text-right tabular-nums font-medium ${r.Resultado >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{moneyC(r.Resultado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DashCard>

        {/* G7 — Medios de pago (donut) */}
        <DashCard title="Medios de pago" subtitle="Cómo entra la cobranza del rango"
          loading={loading} height={320}
          isEmpty={!loading && medios.length === 0} empty={<DashboardEmptyState pill={false} title="Sin cobranza" nota="No hay cobranza para el filtro seleccionado." />}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={medios} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={96} paddingAngle={2} isAnimationActive={false}>
                  {medios.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string, p) => [`${money(v)} · ${nPct((p?.payload as { pct: number })?.pct)}`, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* G5 — Evolución del mix (13m) */}
        <DashCard title="Evolución del mix por unidad" subtitle="Facturado apilado por unidad · últimos 13 meses"
          className="lg:col-span-2" loading={loading} height={300}
          isEmpty={!loading && mixMensual.arr.length === 0} empty={<DashboardEmptyState pill={false} title="Sin datos" nota="No hay mix mensual para el filtro." />}>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={mixMensual.arr} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.axis }} />
                <YAxis tick={{ fontSize: 11, fill: t.axis }} width={46} tickFormatter={moneyAxis} />
                <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [money(v), n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {mixMensual.unis.map((u) => (
                  <Bar key={u.id} dataKey={`u${u.id}`} name={u.corto} stackId="mix" fill={u.color} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* G6 — Waterfall del flujo del período */}
        <DashCard title="Waterfall del flujo de caja" subtitle="Cómo se formó el flujo neto del período"
          className="lg:col-span-2" loading={loading} height={340}
          isEmpty={!loading && (data?.Waterfall?.length ?? 0) === 0} empty={<DashboardEmptyState pill={false} title="Sin datos" nota="No hay flujo para el filtro seleccionado." />}>
          <WaterfallCaja data={data?.Waterfall ?? []} />
        </DashCard>

        {/* G8 — CxC por unidad + top egresos */}
        <DashCard title="Por cobrar y en qué se va la plata" subtitle="CxC por unidad (histórico al corte) · top categorías de egreso"
          className="lg:col-span-2" loading={loading} height={320}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">CxC por unidad (por cobrar)</p>
              {cxc.length === 0
                ? <DashboardEmptyState pill={false} title="Sin CxC" nota="No hay cuentas por cobrar para el filtro." />
                : <MoneyHBar data={cxc} height={260} yWidth={110} perItemColor />}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Top categorías de egreso</p>
              {topEgr.length === 0
                ? <DashboardEmptyState pill={false} title="Sin egresos" nota="No hay egresos para el filtro." />
                : <MoneyHBar data={topEgr} height={260} yWidth={140} perItemColor />}
            </div>
          </div>
        </DashCard>

        {/* G9 — Heatmap de cobranza (día × semana) */}
        <DashCard title="Cobranza por día y semana" subtitle="Intensidad de la cobranza · día de la semana × semana del rango"
          className="lg:col-span-2" loading={loading} height={300}
          isEmpty={!loading && (data?.HeatmapCobranza?.length ?? 0) === 0} empty={<DashboardEmptyState pill={false} title="Sin cobranza" nota="No hay cobranza para el filtro seleccionado." />}>
          <HeatmapCobranza data={data?.HeatmapCobranza ?? []} />
        </DashCard>
      </div>
    </div>
  );
};

export default DashboardGerencialTab;
