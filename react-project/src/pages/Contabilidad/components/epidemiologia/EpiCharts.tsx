// Piezas de charts reutilizables del dashboard de Epidemiología (recharts). Dark-mode aware.
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { useChartTheme } from './EpiUI';
import { nInt } from './epiHelpers';

export interface HBarDatum { label: string; value: number; full?: string; sub?: string }

// Barras horizontales genéricas (top-N). Tooltip muestra el nombre completo (`full`) + valor.
export const HBarChart: React.FC<{
  data: HBarDatum[];
  color: string;
  unidad?: string;
  height?: number;
  yWidth?: number;
  perItemColor?: (i: number) => string; // si se define, colorea cada barra
}> = ({ data, color, unidad = '', height = 320, yWidth = 150, perItemColor }) => {
  const t = useChartTheme();
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke={t.grid} strokeOpacity={0.5} />
          <XAxis type="number" tick={{ fontSize: 11, fill: t.axis }} allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={yWidth} tick={{ fontSize: 11, fill: t.axis }} interval={0} />
          <Tooltip
            cursor={{ fill: t.dark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.15)' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload as HBarDatum;
              return (
                <div style={t.tooltip} className="px-3 py-2">
                  <div className="font-semibold mb-0.5">{d.full ?? d.label}</div>
                  {d.sub && <div className="text-[11px] text-slate-400">{d.sub}</div>}
                  <div className="text-[11px]">{nInt(d.value)}{unidad ? ` ${unidad}` : ''}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill={color} radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {perItemColor && data.map((_, i) => <Cell key={i} fill={perItemColor(i)} />)}
            <LabelList dataKey="value" position="right" formatter={(v: number) => nInt(v)} style={{ fontSize: 10, fill: t.axis }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface DivergDatum { label: string; full?: string; M: number; F: number; mAbs: number; fAbs: number }

// Barras divergentes M (izquierda, negativo) / F (derecha). Sirve para pirámide y morbilidad×sexo.
export const DivergingBarChart: React.FC<{
  data: DivergDatum[];
  height?: number;
  yWidth?: number;
  colorM: string;
  colorF: string;
}> = ({ data, height = 320, yWidth = 110, colorM, colorF }) => {
  const t = useChartTheme();
  const max = Math.max(1, ...data.map((d) => Math.max(d.mAbs, d.fAbs)));
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart layout="vertical" data={data} stackOffset="sign" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke={t.grid} strokeOpacity={0.5} />
          <XAxis type="number" domain={[-max, max]} tickFormatter={(v) => nInt(Math.abs(v))} tick={{ fontSize: 10, fill: t.axis }} allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={yWidth} tick={{ fontSize: 11, fill: t.axis }} interval={0} />
          <Tooltip
            cursor={{ fill: t.dark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.15)' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload as DivergDatum;
              return (
                <div style={t.tooltip} className="px-3 py-2">
                  <div className="font-semibold mb-0.5">{d.full ?? d.label}</div>
                  <div className="text-[11px]" style={{ color: colorM }}>Masculino: {nInt(d.mAbs)}</div>
                  <div className="text-[11px]" style={{ color: colorF }}>Femenino: {nInt(d.fAbs)}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="M" stackId="s" fill={colorM} radius={[3, 0, 0, 3]} isAnimationActive={false} />
          <Bar dataKey="F" stackId="s" fill={colorF} radius={[0, 3, 3, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
