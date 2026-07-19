// TAB 2 — Dashboard Epidemiológico. Fila de 6 KPIs + 12 charts (§5 del plan). Un solo fetch para el
// dashboard (puede tardar ~15s: skeletons por card, no spinner global); el canal endémico se pide aparte.
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  PieChart, Pie, Cell, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Treemap,
} from 'recharts';
import { Activity, Stethoscope, Users, ClipboardList, TrendingUp, Building2, Info } from 'lucide-react';
import contabilidadService from '../../../../services/contabilidad/ContabilidadService';
import type { EpiDashboardResponse } from '../../../../services/contabilidad/contaTypes';
import type { EpiFiltro } from './FiltroEpidemiologiaCard';
import { EpiCard, KpiCard, useChartTheme } from './EpiUI';
import { HBarChart, DivergingBarChart } from './EpiCharts';
import HeatmapConsultorioCapitulo from './HeatmapConsultorioCapitulo';
import CanalEndemicoChart from './CanalEndemicoChart';
import {
  nInt, nPct, truncar, catColor, capRomano, ORDEN_ETAPAS,
  COLOR_PRIMARY, COLOR_PRIMARY_LIGHT, COLOR_SECONDARY, COLOR_M, COLOR_F,
} from './epiHelpers';

const TOP_N = 20;

const esMasculino = (sexo: string): boolean => (sexo ?? '').trim().toUpperCase().startsWith('M');
const rankEtapa = (g: string): number => {
  const i = ORDEN_ETAPAS.findIndex((e) => e.toLowerCase() === (g ?? '').trim().toLowerCase());
  return i < 0 ? 99 : i;
};

// Envuelve un texto en varias líneas por palabras (SVG <text> no hace wrap). La última línea se
// ellipsa si no cupo todo. maxLineas<=0 => sin líneas.
function wrapWords(text: string, maxChars: number, maxLineas: number): string[] {
  if (maxLineas <= 0 || !text) return [];
  const words = text.split(/\s+/);
  const lineas: string[] = [];
  let cur = '';
  let i = 0;
  for (; i < words.length; i++) {
    const intento = cur ? cur + ' ' + words[i] : words[i];
    if (intento.length <= maxChars || !cur) { cur = intento; }
    else { lineas.push(cur); cur = words[i]; if (lineas.length >= maxLineas) { cur = ''; break; } }
  }
  if (cur && lineas.length < maxLineas) { lineas.push(cur); i = words.length; }
  if (i < words.length && lineas.length) {
    const last = lineas[lineas.length - 1];
    lineas[lineas.length - 1] = (last.length > maxChars - 1 ? last.slice(0, maxChars - 1).trimEnd() : last) + '…';
  }
  return lineas;
}

// Celda del treemap de capítulos: rect con color categórico + etiqueta legible (número romano arriba,
// nombre envuelto en varias líneas, conteo abajo). Peso de fuente ligero; solo si el bloque es grande.
interface TreemapCellProps { x?: number; y?: number; width?: number; height?: number; index?: number; name?: string; value?: number }
const TreemapCell: React.FC<TreemapCellProps> = ({ x = 0, y = 0, width = 0, height = 0, index = 0, name = '', value = 0 }) => {
  const color = catColor(index);
  const showText = width > 46 && height > 22;
  const sep = name.indexOf(' · ');
  const romano = sep > 0 ? name.slice(0, sep) : name;      // 'XIII'
  const nombre = sep > 0 ? name.slice(sep + 3) : '';       // 'Sistema osteomuscular y tejido conjuntivo'
  const maxChars = Math.max(4, Math.floor((width - 12) / 5.6));
  const maxLineas = Math.max(0, Math.floor((height - 34) / 12)); // reserva romano (arriba) + conteo (abajo)
  const lineas = wrapWords(nombre, maxChars, maxLineas);
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3} style={{ fill: color, stroke: '#fff', strokeOpacity: 0.4, strokeWidth: 1 }} />
      {showText && (
        <>
          <text x={x + 6} y={y + 15} fill="#fff" fontSize={12} fontWeight={150}>{romano}</text>
          {lineas.map((ln, i) => (
            <text key={i} x={x + 6} y={y + 28 + i * 12} fill="#fff" fontSize={10} fontWeight={150} fillOpacity={0.9}>{ln}</text>
          ))}
          <text x={x + 6} y={y + height - 7} fill="#fff" fontSize={11} fontWeight={150} fillOpacity={0.95}>{nInt(value)}</text>
        </>
      )}
    </g>
  );
};

const DashboardEpidemiologicoTab: React.FC<{ filtro: EpiFiltro }> = ({ filtro }) => {
  const t = useChartTheme();
  const [dash, setDash] = useState<EpiDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const anio = Number(filtro.desde.slice(0, 4)) || new Date().getFullYear();
  const esHospitalizacion = filtro.ambito === 'HOSPITALIZACION';

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    contabilidadService.epiDashboard({
      desde: filtro.desde, hasta: filtro.hasta, ambito: filtro.ambito,
      incluirDescartados: filtro.incluirDescartados, topN: TOP_N,
    })
      .then((d) => { if (vivo) setDash(d); })
      .catch((e) => { if (vivo) { toast.error(e instanceof Error ? e.message : 'Error al cargar el dashboard'); setDash(null); } })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [filtro]);

  const k = dash?.kpis;
  const sinDx = !!dash && k?.TotalDx === 0;
  const totalIncidencia = (k?.CasosNuevos ?? 0) + (k?.CasosRecurrentes ?? 0);
  const pctNuevos = totalIncidencia > 0 ? ((k?.CasosNuevos ?? 0) / totalIncidencia) * 100 : 0;

  // ---- Datos derivados para cada chart ----
  const consultorioData = useMemo(() => (dash?.porConsultorio ?? []).slice(0, 15).map((r) => ({
    label: truncar(r.ConsultorioNombre, 20), full: r.ConsultorioNombre, value: r.NumDx,
    sub: `${nInt(r.NumAtenciones)} atenciones · ${nInt(r.NumPacientes)} pacientes`,
  })), [dash]);

  const morbilidadData = useMemo(() => (dash?.topMorbilidad ?? []).map((r) => ({
    label: truncar(r.DiseaseName, 26), full: `${r.DiseaseName} (${r.CIE10})`, value: r.NumDx,
    sub: `${nInt(r.NumPacientes)} pacientes · ${nPct(r.PctDelTotal)} del total`,
  })), [dash]);

  const capituloData = useMemo(() => (dash?.porCapitulo ?? [])
    .filter((r) => r.NumDx > 0)
    .map((r) => ({ name: `${capRomano(r.CapNum)} · ${r.CapNombre}`, size: r.NumDx, pacientes: r.NumPacientes })), [dash]);

  const piramideData = useMemo(() => {
    const rows = dash?.piramide ?? [];
    const grupos = [...new Set(rows.map((r) => r.GrupoEtario))].sort((a, b) => rankEtapa(a) - rankEtapa(b));
    return grupos.map((g) => {
      const m = rows.filter((r) => r.GrupoEtario === g && esMasculino(r.SexoNombre)).reduce((s, r) => s + r.NumPacientes, 0);
      const f = rows.filter((r) => r.GrupoEtario === g && !esMasculino(r.SexoNombre)).reduce((s, r) => s + r.NumPacientes, 0);
      return { label: g, M: -m, F: f, mAbs: m, fAbs: f };
    }).filter((d) => d.mAbs > 0 || d.fAbs > 0);
  }, [dash]);

  const morbSexoData = useMemo(() => (dash?.morbilidadSexo ?? []).slice(0, 15).map((r) => ({
    label: truncar(r.DiseaseName, 22), full: `${r.DiseaseName} (${r.CIE10})`,
    M: -r.NumMasculino, F: r.NumFemenino, mAbs: r.NumMasculino, fAbs: r.NumFemenino,
  })), [dash]);

  const tendenciaData = useMemo(() => (dash?.tendencia ?? []).map((r) => ({
    label: `S${r.SemanaISO}`, semana: r.SemanaISO, fecha: r.FechaInicioSemana,
    NumDx: r.NumDx, NumAtenciones: r.NumAtenciones, NumCasosNuevos: r.NumCasosNuevos,
  })), [dash]);

  const nuevosData = useMemo(() => ([
    { name: 'Casos nuevos', value: k?.CasosNuevos ?? 0 },
    { name: 'Recurrentes', value: k?.CasosRecurrentes ?? 0 },
  ]), [k]);

  const medicosData = useMemo(() => (dash?.medicos ?? []).slice(0, 15).map((r) => ({
    label: truncar(r.MedicoNombre, 24), full: r.MedicoNombre, value: r.NumDx, sub: `${nInt(r.NumPacientes)} pacientes`,
  })), [dash]);

  const comorbilidadData = useMemo(() => (dash?.comorbilidad ?? []).slice(0, 15).map((r) => ({
    label: `${truncar(r.NombreA, 12)} + ${truncar(r.NombreB, 12)}`,
    full: `${r.NombreA} (${r.Cie10A}) + ${r.NombreB} (${r.Cie10B})`, value: r.NumAtenciones,
  })), [dash]);

  const geografiaData = useMemo(() => (dash?.geografia ?? []).slice(0, 15).map((r) => ({
    label: truncar(r.DistritoNombre, 20), full: `${r.DistritoNombre}${r.ProvinciaNombre ? ` — ${r.ProvinciaNombre}` : ''}`,
    value: r.NumPacientes, sub: `${nInt(r.NumDx)} diagnósticos`,
  })), [dash]);

  return (
    <div>
      {/* Banner informativo para HOSPITALIZACION (sin dx en el repositorio) */}
      {esHospitalizacion && (
        <div className="mb-4 flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>El módulo de hospitalización no registra diagnósticos en el repositorio de dx; los indicadores diagnósticos aparecerán vacíos. Use «Todos» o «Asistencial» para el análisis diagnóstico.</span>
        </div>
      )}

      {/* Fila de KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <KpiCard label="Atenciones" value={nInt(k?.TotalAtenciones)} icon={Activity} tone="primary" loading={loading} />
        <KpiCard label="Con diagnóstico" value={nInt(k?.AtencionesConDx)} sub={`${nPct(k?.PctConDx)} del total`} icon={Stethoscope} tone="emerald" loading={loading} />
        <KpiCard label="Pacientes únicos" value={nInt(k?.PacientesUnicos)} icon={Users} tone="sky" loading={loading} />
        <KpiCard label="Diagnósticos" value={nInt(k?.TotalDx)} icon={ClipboardList} tone="violet" loading={loading} />
        <KpiCard label="Casos nuevos" value={nInt(k?.CasosNuevos)} sub={`${nPct(pctNuevos)} incidencia`} icon={TrendingUp} tone="amber" loading={loading} />
        <KpiCard label="Consultorios activos" value={nInt(k?.ConsultoriosActivos)} icon={Building2} tone="rose" loading={loading} />
      </div>

      {/* Empty-state informativo si HOSPITALIZACION vino sin dx: no mostramos los charts diagnósticos rotos */}
      {esHospitalizacion && sinDx ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center">
          <Info className="h-10 w-10 mx-auto text-sky-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">Sin diagnósticos en hospitalización</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            El módulo de hospitalización no registra diagnósticos en el repositorio de dx que alimenta este análisis.
            Los KPIs de atenciones y pacientes de arriba sí son válidos. Para el análisis diagnóstico (morbilidad,
            capítulos, tendencia, canal endémico), seleccione el ámbito «Todos» o «Asistencial».
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1 — Incidencia por consultorio */}
          <EpiCard title="Incidencia diagnóstica por consultorio" subtitle="Top 15 por número de diagnósticos"
            loading={loading} isEmpty={!loading && consultorioData.length === 0} height={360}>
            <HBarChart data={consultorioData} color={COLOR_PRIMARY} unidad="dx" height={360} yWidth={150} />
          </EpiCard>

          {/* 2 — Top 20 morbilidad */}
          <EpiCard title="Top 20 diagnósticos (morbilidad)" subtitle="Patologías más frecuentes del periodo"
            loading={loading} isEmpty={!loading && morbilidadData.length === 0} height={360}>
            <HBarChart data={morbilidadData} color={COLOR_PRIMARY_LIGHT} unidad="dx" height={360} yWidth={170} />
          </EpiCard>

          {/* 3 — Distribución por capítulo CIE-10 (treemap) */}
          <EpiCard title="Distribución por capítulo CIE-10" subtitle="Reparto de la morbilidad por gran grupo"
            loading={loading} isEmpty={!loading && capituloData.length === 0} height={320}>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <Treemap data={capituloData} dataKey="size" nameKey="name" stroke="#fff" isAnimationActive={false} content={<TreemapCell />}>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload as { name: string; size: number; pacientes: number };
                      const sep = d.name.indexOf(' · ');
                      const romano = sep > 0 ? d.name.slice(0, sep) : d.name;
                      const capNombre = sep > 0 ? d.name.slice(sep + 3) : '';
                      return (
                        <div className="pointer-events-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl px-3 py-2" style={{ width: 244 }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center justify-center h-5 min-w-[24px] px-1 rounded text-white text-[10px] font-semibold" style={{ backgroundColor: '#1E3A8A' }}>{romano}</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-100 leading-tight">{capNombre}</span>
                          </div>
                          <div className="flex items-baseline gap-1 border-t border-slate-100 dark:border-slate-700 pt-1.5">
                            <span className="text-lg font-bold tabular-nums text-blue-700 dark:text-blue-300">{nInt(d.size)}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">diagnóstico{d.size === 1 ? '' : 's'}</span>
                            <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">{nInt(d.pacientes)} pac.</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </EpiCard>

          {/* 4 — Pirámide poblacional (sexo × etapa de vida) */}
          <EpiCard title="Pirámide poblacional" subtitle="Estructura por sexo (azul M / magenta F) y etapa de vida"
            loading={loading} isEmpty={!loading && piramideData.length === 0} height={320}>
            <DivergingBarChart data={piramideData} colorM={COLOR_M} colorF={COLOR_F} height={320} yWidth={100} />
          </EpiCard>

          {/* 7 — Tendencia semanal (full width) */}
          <EpiCard title="Tendencia semanal de casos" subtitle="Diagnósticos, atenciones y casos nuevos por semana ISO"
            className="lg:col-span-2" loading={loading} isEmpty={!loading && tendenciaData.length === 0} height={320}>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <ComposedChart data={tendenciaData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.axis }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: t.axis }} width={38} allowDecimals={false} />
                  <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [nInt(v), n]} labelFormatter={(l) => `Semana ${String(l).replace('S', '')}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="NumAtenciones" name="Atenciones" stroke={COLOR_PRIMARY_LIGHT} fill={COLOR_PRIMARY_LIGHT} fillOpacity={0.12} isAnimationActive={false} />
                  <Area type="monotone" dataKey="NumDx" name="Diagnósticos" stroke={COLOR_PRIMARY} fill={COLOR_PRIMARY} fillOpacity={0.18} isAnimationActive={false} />
                  <Line type="monotone" dataKey="NumCasosNuevos" name="Casos nuevos" stroke={COLOR_SECONDARY} strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </EpiCard>

          {/* 8 — Canal endémico (lazy, fetch propio; full width) */}
          {!(loading) && !esHospitalizacion && <CanalEndemicoChart anio={anio} ambito={filtro.ambito} />}
          {loading && <EpiCard title="Canal endémico" subtitle="Banda histórica vs casos actuales" className="lg:col-span-2" loading height={340} />}

          {/* 6 — Heatmap consultorio × capítulo (full width) */}
          <EpiCard title="Heatmap consultorio × capítulo" subtitle="Intensidad de diagnósticos por grupo de patología y consultorio"
            className="lg:col-span-2" loading={loading} isEmpty={!loading && (dash?.heatmap.length ?? 0) === 0} height={300}>
            <HeatmapConsultorioCapitulo data={dash?.heatmap ?? []} />
          </EpiCard>

          {/* 5 — Morbilidad diferencial por sexo */}
          <EpiCard title="Morbilidad diferencial por sexo" subtitle="Top diagnósticos por sexo (M izq / F der)"
            loading={loading} isEmpty={!loading && morbSexoData.length === 0} height={340}>
            <DivergingBarChart data={morbSexoData} colorM={COLOR_M} colorF={COLOR_F} height={340} yWidth={150} />
          </EpiCard>

          {/* 9 — Casos nuevos vs recurrentes (donut) */}
          <EpiCard title="Casos nuevos vs recurrentes" subtitle="Incidencia real vs prevalencia/recurrencia"
            loading={loading} isEmpty={!loading && totalIncidencia === 0} height={340}>
            <div style={{ width: '100%', height: 340 }} className="relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={nuevosData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} isAnimationActive={false}>
                    <Cell fill="#10B981" />
                    <Cell fill="#94A3B8" />
                  </Pie>
                  <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [nInt(v), n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-6">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{nPct(pctNuevos)}</span>
                <span className="text-xs text-slate-400">casos nuevos</span>
              </div>
            </div>
          </EpiCard>

          {/* 10 — Top médicos por diagnóstico */}
          <EpiCard title="Top médicos por diagnóstico" subtitle="Actividad diagnóstica por médico (35% sin médico asignado)"
            loading={loading} isEmpty={!loading && medicosData.length === 0} height={340}>
            <HBarChart data={medicosData} color="#0891B2" unidad="dx" height={340} yWidth={160} />
          </EpiCard>

          {/* 11 — Comorbilidad (pares de dx) */}
          <EpiCard title="Comorbilidad (pares de diagnósticos)" subtitle="Diagnósticos que co-ocurren en la misma atención"
            loading={loading} isEmpty={!loading && comorbilidadData.length === 0} height={340}>
            <HBarChart data={comorbilidadData} color="#9333EA" unidad="atenciones" height={340} yWidth={190} />
          </EpiCard>

          {/* 12 — Distribución geográfica */}
          <EpiCard title="Distribución geográfica" subtitle="Top distritos de procedencia de los pacientes"
            loading={loading} isEmpty={!loading && geografiaData.length === 0} height={340}>
            <HBarChart data={geografiaData} color="#EA580C" unidad="pacientes" height={340} yWidth={150} />
          </EpiCard>
        </div>
      )}
    </div>
  );
};

export default DashboardEpidemiologicoTab;
