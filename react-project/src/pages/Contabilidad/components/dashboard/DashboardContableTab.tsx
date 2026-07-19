// TAB Contable. Fila de 8 KPI cards (RS0) + 10 charts C1..C10 (§6 del plan). Varias fuentes nacen
// vacías hoy (D7): CxP aging, planilla, saldos bancarios, honorarios → empty-state con la nota de qué
// las poblará (NUNCA un chart roto). Fetch propio + cache por clave (inyectada por la página).
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ComposedChart, Bar, Line, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Wallet, Receipt, HandCoins, TrendingDown, Landmark, CreditCard, Users, Percent,
  Layers, Banknote, Stethoscope,
} from 'lucide-react';
import contabilidadService from '../../../../services/contabilidad/ContabilidadService';
import type { DashFiltro, DashContableResponse } from '../../../../services/contabilidad/contaTypes';
import { DashCard, KpiCard, DashboardEmptyState, useChartTheme } from './DashUI';
import { MoneyHBar } from './DashCharts';
import ComposicionGastosChart from './ComposicionGastosChart';
import {
  money, moneyC, moneyAxis, nPct, mesLabel, mesKey, unidadColor, unidadCorto, medioColor, catColor, filtroKey,
} from './dashHelpers';

const IGV_HINT = 'Estimación referencial (bruto − valor neto), NO liquidación oficial F.621 (no considera exoneraciones, notas de crédito ni prorrata).';
const NO_FILTRA = 'No filtra por tipo de caja.';

const BUCKETS = ['0-30', '31-60', '61-90', '90+'] as const;
const BUCKET_COLOR: Record<string, string> = { '0-30': '#10B981', '31-60': '#F59E0B', '61-90': '#F97316', '90+': '#F43F5E' };

const DashboardContableTab: React.FC<{ filtro: DashFiltro; cache: Map<string, DashContableResponse>; onLoading?: (b: boolean) => void }> = ({ filtro, cache, onLoading }) => {
  const t = useChartTheme();
  const [data, setData] = useState<DashContableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // Reporta el estado de carga hacia la página (para el botón "Aplicar" del filtro compartido).
  const report = (b: boolean) => { setLoading(b); onLoading?.(b); };

  const key = filtroKey(filtro.desde, filtro.hasta, filtro.tiposCaja);
  // '' (o ausente) = TODOS -> SISOL sí va; con CSV explícito, solo si contiene el id 3.
  const sisolOn = !filtro.tiposCaja || filtro.tiposCaja.split(',').includes('3');

  useEffect(() => {
    if (!filtro.desde || !filtro.hasta) { report(true); return; } // sin rango aún; tiposCaja='' = TODOS (válido)
    const cached = cache.get(key);
    if (cached) { setData(cached); report(false); return; }
    let vivo = true;
    report(true);
    contabilidadService.dashContable(filtro)
      .then((d) => { if (vivo) { cache.set(key, d); setData(d); } })
      .catch((e) => { if (vivo) { toast.error(e instanceof Error ? e.message : 'Error al cargar el dashboard contable'); setData(null); } })
      .finally(() => { if (vivo) report(false); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const k = data?.Kpis;

  // ---- C1: ingresos vs egresos + neto (13m) ----
  const ingEgr = useMemo(() => (data?.IngresosVsEgresos ?? []).map((r) => ({
    label: mesLabel(r.Anio, r.Mes), Cobrado: r.Cobrado, Egresos: r.Egresos, FlujoNeto: r.FlujoNeto,
  })), [data]);

  // ---- C2: cobranzas por medio × mes (13m) ----
  const cobrMedio = useMemo(() => {
    const rows = data?.CobranzasMedioMes ?? [];
    const medios = Array.from(new Map(rows.map((r) => [r.IdFormaPago, r.FormaPago])).entries())
      .map(([id, nombre], i) => ({ id, nombre, color: medioColor(nombre, i) }));
    const byMonth = new Map<string, Record<string, number | string>>();
    for (const r of rows) {
      const mk = mesKey(r.Anio, r.Mes);
      if (!byMonth.has(mk)) byMonth.set(mk, { label: mesLabel(r.Anio, r.Mes), _k: mk });
      const row = byMonth.get(mk)!;
      row[`f${r.IdFormaPago}`] = ((row[`f${r.IdFormaPago}`] as number) ?? 0) + r.Monto;
    }
    const arr = Array.from(byMonth.values()).sort((a, b) => String(a._k).localeCompare(String(b._k)));
    return { medios, arr };
  }, [data]);

  // ---- C4: evolución CxC (13m) ----
  const evoCxc = useMemo(() => (data?.EvolucionCxc ?? []).map((r) => ({
    label: mesLabel(r.Anio, r.Mes), Facturado: r.CreditoFacturadoMes, Cobrado: r.CreditoCobradoMes, Saldo: r.SaldoAcumulado,
  })), [data]);

  // ---- C5: CxC por unidad ----
  const cxcUnidad = useMemo(() => (data?.CxcUnidad ?? [])
    .filter((r) => r.PorCobrar !== 0)
    .sort((a, b) => b.PorCobrar - a.PorCobrar)
    .map((r) => ({ label: unidadCorto(r.Unidad), value: r.PorCobrar, color: unidadColor(r.Unidad), sub: `Facturado ${moneyC(r.CreditoFacturado)} · Cobrado ${moneyC(r.CreditoCobrado)}` })), [data]);

  // ---- C6: CxP aging (nace vacío) ----
  const cxpAging = useMemo(() => {
    const rows = data?.CxpAging ?? [];
    const byCat = new Map<string, Record<string, number | string>>();
    for (const r of rows) {
      if (!byCat.has(r.Categoria)) byCat.set(r.Categoria, { label: r.Categoria });
      (byCat.get(r.Categoria)!)[r.Bucket] = ((byCat.get(r.Categoria)![r.Bucket] as number) ?? 0) + r.Monto;
    }
    return Array.from(byCat.values());
  }, [data]);

  // ---- C7: IGV mensual (13m) ----
  const igv = useMemo(() => (data?.IgvMensual ?? []).map((r) => ({
    label: mesLabel(r.Anio, r.Mes), Debito: r.IGVDebitoEstimado, Credito: r.IGVCreditoFiscal, Resultante: r.IGVResultante,
  })), [data]);

  // ---- C8: planilla por concepto × mes (nace vacío) ----
  const planilla = useMemo(() => {
    const rows = data?.PlanillaMes ?? [];
    const conceptos = Array.from(new Set(rows.map((r) => r.Concepto)));
    const byMonth = new Map<string, Record<string, number | string>>();
    for (const r of rows) {
      const mk = mesKey(r.Anio, r.Mes);
      if (!byMonth.has(mk)) byMonth.set(mk, { label: mesLabel(r.Anio, r.Mes), _k: mk });
      const row = byMonth.get(mk)!;
      row[r.Concepto] = ((row[r.Concepto] as number) ?? 0) + r.Monto;
    }
    const arr = Array.from(byMonth.values()).sort((a, b) => String(a._k).localeCompare(String(b._k)));
    return { conceptos, arr };
  }, [data]);

  // ---- C10: honorarios × consultorio (nace vacío) ----
  const honorarios = useMemo(() => (data?.HonorariosConsultorio ?? [])
    .sort((a, b) => b.Monto - a.Monto)
    .map((r, i) => ({ label: r.Consultorio, value: r.Monto, color: catColor(i), sub: `${r.NumPagos} pago(s)` })), [data]);

  const saldos = data?.SaldosBancarios ?? [];
  const sisol = data?.SisolLiquidaciones ?? [];

  return (
    <div>
      <div className="flex justify-end mb-2">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">Datos al {mesLabel(Number(filtro.hasta.slice(0, 4)), Number(filtro.hasta.slice(5, 7)))} · corte {filtro.hasta}</span>
      </div>

      {/* Fila de 8 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Cobrado" value={money(k?.Cobrado ?? 0)} icon={Wallet} tone="emerald" loading={loading}
          delta={k ? { actual: k.Cobrado, prev: k.CobradoPrev } : undefined} />
        <KpiCard label="Egresos pagados" value={money(k?.Egresos ?? 0)} sub={k ? `Caja mayor ${moneyC(k.EgresosLegacy)} · Conta ${moneyC(k.EgresosConta)}` : undefined}
          icon={Receipt} tone="rose" loading={loading} delta={k ? { actual: k.Egresos, prev: k.EgresosPrev, invert: true } : undefined} />
        <KpiCard label="Flujo neto" value={money(k?.FlujoNeto ?? 0)} icon={HandCoins} tone={(k?.FlujoNeto ?? 0) >= 0 ? 'emerald' : 'rose'} loading={loading}
          delta={k ? { actual: k.FlujoNeto, prev: k.FlujoNetoPrev } : undefined} />
        <KpiCard label="Egreso prom. diario" value={money(k?.EgresoPromedioDiario ?? 0)} sub="proxy burn rate" icon={TrendingDown} tone="amber" loading={loading} />
        <KpiCard label="Por cobrar (CxC)" value={money(k?.PorCobrar ?? 0)} icon={Landmark} tone="sky" loading={loading} />
        <KpiCard label="Por pagar (CxP)" value={money(k?.PorPagar ?? 0)} sub="espejo del CxC" icon={CreditCard} tone="rose" loading={loading} />
        <KpiCard label="Planilla" value={money(k?.Planilla ?? 0)} icon={Users} tone="violet" loading={loading} />
        <KpiCard label="IGV resultante est." value={money(k?.IGVResultanteEstimado ?? 0)} sub={k ? `Débito ${moneyC(k.IGVDebitoEstimado)} · Créd. ${moneyC(k.IGVCreditoFiscal)}` : undefined}
          icon={Percent} tone="slate" loading={loading} hint={IGV_HINT} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* C1 — Ingresos vs egresos mensual + neto (13m) */}
        <DashCard title="Ingresos vs egresos y flujo neto" subtitle="Cobrado y egresos (barras) · flujo neto (línea) · 13 meses"
          className="lg:col-span-2" loading={loading} height={300}
          isEmpty={!loading && ingEgr.length === 0} empty={<DashboardEmptyState pill={false} title="Sin datos" nota="No hay datos para el filtro seleccionado." />}>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <ComposedChart data={ingEgr} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.axis }} />
                <YAxis tick={{ fontSize: 11, fill: t.axis }} width={46} tickFormatter={moneyAxis} />
                <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [money(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Cobrado" name="Cobrado" fill="#10B981" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Egresos" name="Egresos" fill="#F43F5E" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Line type="monotone" dataKey="FlujoNeto" name="Flujo neto" stroke="#2563EB" strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* C2 — Cobranzas por medio × mes (13m) */}
        <DashCard title="Cobranzas por medio de pago" subtitle="Composición mensual de la cobranza · 13 meses"
          className="lg:col-span-2" loading={loading} height={300}
          isEmpty={!loading && cobrMedio.arr.length === 0} empty={<DashboardEmptyState pill={false} title="Sin cobranza" nota="No hay cobranza para el filtro seleccionado." />}>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={cobrMedio.arr} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.axis }} />
                <YAxis tick={{ fontSize: 11, fill: t.axis }} width={46} tickFormatter={moneyAxis} />
                <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [money(v), n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {cobrMedio.medios.map((m) => (
                  <Bar key={m.id} dataKey={`f${m.id}`} name={m.nombre} stackId="cm" fill={m.color} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* C3 — Composición de gastos (treemap/pareto) */}
        <DashCard title="Composición de gastos" subtitle="Reparto del egreso del rango" loading={loading} height={300}
          isEmpty={!loading && (data?.ComposicionGastos?.length ?? 0) === 0} empty={<DashboardEmptyState title="Sin egresos" nota="Se poblará con la carga histórica de egresos (hoy solo egresos de caja mayor)." />}>
          <ComposicionGastosChart data={data?.ComposicionGastos ?? []} />
        </DashCard>

        {/* C5 — CxC por unidad */}
        <DashCard title="CxC por unidad" subtitle="Por cobrar (histórico al corte) por unidad de negocio" loading={loading} height={300}
          isEmpty={!loading && cxcUnidad.length === 0} empty={<DashboardEmptyState pill={false} title="Sin CxC" nota="No hay cuentas por cobrar para el filtro." />}>
          <MoneyHBar data={cxcUnidad} height={260} yWidth={110} perItemColor />
        </DashCard>

        {/* C4 — Evolución CxC (13m) */}
        <DashCard title="Evolución de cuentas por cobrar" subtitle="Crédito facturado/cobrado (barras) · saldo acumulado (línea) · 13 meses"
          className="lg:col-span-2" loading={loading} height={300}
          isEmpty={!loading && evoCxc.length === 0} empty={<DashboardEmptyState pill={false} title="Sin datos" nota="No hay evolución de CxC para el filtro." />}>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <ComposedChart data={evoCxc} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.axis }} />
                <YAxis tick={{ fontSize: 11, fill: t.axis }} width={46} tickFormatter={moneyAxis} />
                <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [money(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Facturado" name="Crédito facturado" fill="#0EA5E9" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Cobrado" name="Crédito cobrado" fill="#10B981" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Line type="monotone" dataKey="Saldo" name="Saldo acumulado" stroke="#F59E0B" strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* C7 — IGV débito vs crédito (13m) */}
        <DashCard title="IGV débito vs crédito" subtitle="Estimación referencial · 13 meses" hint={IGV_HINT} note={`El crédito fiscal nace en 0 (registro de compras vacío). ${NO_FILTRA}`}
          className="lg:col-span-2" loading={loading} height={300}
          isEmpty={!loading && igv.length === 0} empty={<DashboardEmptyState pill={false} title="Sin datos" nota="No hay IGV para el filtro seleccionado." />}>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <ComposedChart data={igv} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.axis }} />
                <YAxis tick={{ fontSize: 11, fill: t.axis }} width={46} tickFormatter={moneyAxis} />
                <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [money(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Debito" name="IGV débito (est.)" fill="#6366F1" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Credito" name="Crédito fiscal" fill="#0EA5E9" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Line type="monotone" dataKey="Resultante" name="IGV resultante (est.)" stroke="#DC2626" strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* C6 — CxP aging (nace vacío) */}
        <DashCard title="Antigüedad de cuentas por pagar (CxP)" subtitle="Deuda por bucket de días · al corte" loading={loading} height={300}
          isEmpty={!loading && cxpAging.length === 0}
          empty={<DashboardEmptyState nota="Se poblará con la carga de egresos por pagar (CxP): mostrará la deuda a proveedores por antigüedad." />}>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={cxpAging} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.axis }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: t.axis }} width={46} tickFormatter={moneyAxis} />
                <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [money(v), `${n} días`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {BUCKETS.map((b) => (
                  <Bar key={b} dataKey={b} name={b} stackId="ag" fill={BUCKET_COLOR[b]} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* C8 — Planilla por concepto (nace vacío) */}
        <DashCard title="Planilla por concepto" subtitle="Costo de personal apilado por concepto · 13 meses" note={NO_FILTRA} loading={loading} height={300}
          isEmpty={!loading && planilla.arr.length === 0}
          empty={<DashboardEmptyState icon={Layers} nota="Se poblará con la carga de planilla (Costos de Personal): evidenciará los picos de gratificaciones (jul/dic) y CTS (may/nov)." />}>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={planilla.arr} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.axis }} />
                <YAxis tick={{ fontSize: 11, fill: t.axis }} width={46} tickFormatter={moneyAxis} />
                <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [money(v), n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {planilla.conceptos.map((c, i) => (
                  <Bar key={c} dataKey={c} name={c} stackId="pl" fill={catColor(i)} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* C9 — Saldos bancarios (tiles) */}
        <DashCard title="Saldos bancarios" subtitle="Posición por cuenta de tesorería" note={NO_FILTRA}
          className="lg:col-span-2" loading={loading} height={200}
          isEmpty={!loading && saldos.length === 0}
          empty={<DashboardEmptyState icon={Banknote} nota="Se poblará con la carga de saldos bancarios mensuales (saldo_banco_mensual)." />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {saldos.map((c) => (
              <div key={c.IdCuenta} className={`rounded-lg border p-3 ${c.EsDetraccion ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{c.Banco}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{c.Cuenta} · {c.Moneda}</p>
                  </div>
                  <Landmark className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
                <p className="mt-2 text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
                  {c.Saldo == null ? <span className="text-sm font-normal text-slate-400 dark:text-slate-500">sin dato</span> : money(c.Saldo)}
                </p>
                {c.EsDetraccion && (
                  <span className="mt-1 inline-block text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                    fondo restringido (detracciones)
                  </span>
                )}
              </div>
            ))}
          </div>
        </DashCard>

        {/* C10 — Honorarios × consultorio + SISOL */}
        <DashCard title="Honorarios médicos y liquidación SISOL" subtitle="Honorarios pagados por consultorio · liquidación SISOL del rango"
          className="lg:col-span-2" loading={loading} height={300}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Honorarios por consultorio</p>
              {honorarios.length === 0
                ? <DashboardEmptyState icon={Stethoscope} nota="Se poblará con el primer pago de honorarios médicos (PH-1) registrado en el módulo." />
                : <MoneyHBar data={honorarios} height={260} yWidth={140} perItemColor />}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Liquidación SISOL</p>
              {!sisolOn ? (
                <div className="h-full flex items-center justify-center text-center px-4 py-8">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Marca la unidad <span className="font-semibold">SISOL</span> en el filtro para ver la liquidación.</p>
                </div>
              ) : sisol.length === 0 ? (
                <DashboardEmptyState pill={false} title="Sin liquidación" nota="No hay liquidaciones SISOL en el rango seleccionado." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 dark:text-slate-400 text-left border-b border-slate-100 dark:border-slate-700">
                        <th className="py-1 pr-2 font-medium">Mes</th>
                        <th className="py-1 px-1 font-medium text-right">Venta neta</th>
                        <th className="py-1 px-1 font-medium text-right">%</th>
                        <th className="py-1 px-1 font-medium text-right">Clínica</th>
                        <th className="py-1 px-1 font-medium text-right">Hospital</th>
                        <th className="py-1 pl-1 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sisol.map((r) => (
                        <tr key={`${r.Anio}-${r.Mes}`} className="border-b border-slate-50 dark:border-slate-700/50">
                          <td className="py-1 pr-2">{mesLabel(r.Anio, r.Mes)}</td>
                          <td className="py-1 px-1 text-right tabular-nums">{moneyC(r.VentaNeta)}</td>
                          <td className="py-1 px-1 text-right tabular-nums">{nPct(r.PctClinica, 0)}</td>
                          <td className="py-1 px-1 text-right tabular-nums">{moneyC(r.MontoClinica)}</td>
                          <td className="py-1 px-1 text-right tabular-nums">{moneyC(r.MontoHospital)}</td>
                          <td className="py-1 pl-1">
                            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{r.Estado}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </DashCard>
      </div>
    </div>
  );
};

export default DashboardContableTab;
