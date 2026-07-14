// Chart 8 — Canal endémico (lazy: se pide al montar). ComposedChart con bandas apiladas por zona
// (Éxito/Seguridad/Alarma a partir de Q1/Mediana/Q3 de los 2 años previos) + línea de casos actuales.
import React, { useEffect, useMemo, useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import contabilidadService from '../../../../services/contabilidad/ContabilidadService';
import type { EpiAmbito, EpiCanalRow } from '../../../../services/contabilidad/contaTypes';
import { EpiCard, useChartTheme } from './EpiUI';
import { ZONA_COLOR, nInt } from './epiHelpers';

interface CanalDatum {
  semana: number;
  zExito: number;      // 0..Q1
  zSeguridad: number;  // Q1..Mediana (delta)
  zAlarma: number;     // Mediana..Q3 (delta)
  Q1: number; Mediana: number; Q3: number;
  actual: number | null;
}

const CanalEndemicoChart: React.FC<{ anio: number; ambito: EpiAmbito }> = ({ anio, ambito }) => {
  const t = useChartTheme();
  const [rows, setRows] = useState<EpiCanalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setLoading(true); setError(null);
    contabilidadService.epiCanalEndemico({ anio, ambito })
      .then((r) => { if (vivo) setRows(r); })
      .catch((e) => { if (vivo) setError(e instanceof Error ? e.message : 'Error al cargar el canal endémico'); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [anio, ambito]);

  const data: CanalDatum[] = useMemo(() => rows.map((r) => ({
    semana: r.SemanaISO,
    zExito: r.Q1,
    zSeguridad: Math.max(0, r.Mediana - r.Q1),
    zAlarma: Math.max(0, r.Q3 - r.Mediana),
    Q1: r.Q1, Mediana: r.Mediana, Q3: r.Q3,
    actual: r.CasosActual,
  })), [rows]);

  const leyenda = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
      {(['Exito', 'Seguridad', 'Alarma', 'Epidemia'] as const).map((z) => (
        <span key={z} className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: ZONA_COLOR[z], opacity: z === 'Epidemia' ? 0.9 : 0.55 }} />
          {z === 'Exito' ? 'Éxito' : z}
        </span>
      ))}
      <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5" style={{ backgroundColor: '#0f172a' }} /> Casos {anio}</span>
    </div>
  );

  return (
    <EpiCard
      title="Canal endémico"
      subtitle={`Semana ISO · banda histórica (${anio - 2}–${anio - 1}) vs casos ${anio}`}
      className="lg:col-span-2"
      height={340}
      loading={loading}
      isEmpty={!loading && !error && data.length === 0}
      emptyLabel="No hay banda histórica suficiente para el año/ámbito seleccionado."
      right={leyenda}
    >
      {error ? (
        <div className="h-full flex items-center justify-center text-sm text-rose-500 dark:text-rose-400" style={{ minHeight: 340 }}>{error}</div>
      ) : (
        <div style={{ width: '100%', height: 340 }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} />
              <XAxis dataKey="semana" tick={{ fontSize: 10, fill: t.axis }} tickFormatter={(v) => `S${v}`} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: t.axis }} width={38} allowDecimals={false} />
              <Tooltip
                cursor={{ stroke: t.axis, strokeOpacity: 0.3 }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload as CanalDatum;
                  return (
                    <div style={t.tooltip} className="px-3 py-2">
                      <div className="font-semibold mb-1">Semana {d.semana}</div>
                      <div className="text-[11px] space-y-0.5">
                        <div>Q1 (éxito &lt;): <b>{nInt(d.Q1)}</b></div>
                        <div>Mediana: <b>{nInt(d.Mediana)}</b></div>
                        <div>Q3 (alarma &gt;): <b>{nInt(d.Q3)}</b></div>
                        {d.actual != null && <div className="pt-0.5 border-t border-slate-300/40">Casos {anio}: <b>{nInt(d.actual)}</b></div>}
                      </div>
                    </div>
                  );
                }}
              />
              {/* Bandas apiladas: Éxito (0..Q1), Seguridad (Q1..Mediana), Alarma (Mediana..Q3). Sobre Q3 = Epidemia. */}
              <Area type="monotone" dataKey="zExito" stackId="band" stroke="none" fill={ZONA_COLOR.Exito} fillOpacity={0.45} isAnimationActive={false} />
              <Area type="monotone" dataKey="zSeguridad" stackId="band" stroke="none" fill={ZONA_COLOR.Seguridad} fillOpacity={0.45} isAnimationActive={false} />
              <Area type="monotone" dataKey="zAlarma" stackId="band" stroke="none" fill={ZONA_COLOR.Alarma} fillOpacity={0.45} isAnimationActive={false} />
              <Line type="monotone" dataKey="actual" stroke={t.dark ? '#f8fafc' : '#0f172a'} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </EpiCard>
  );
};

export default CanalEndemicoChart;
