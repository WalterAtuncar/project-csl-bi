// Piezas de charts reutilizables del Dashboard (recharts). Dark-aware. Moneda es-PE, baseline 0.
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useChartTheme } from './DashUI';
import { moneyAxis, money } from './dashHelpers';

export interface MoneyBarDatum { label: string; value: number; full?: string; sub?: string; color?: string }

// Barras horizontales de moneda (top-N). Tooltip con nombre completo + monto + sub. `perItemColor`
// usa el color propio de cada dato (color fijo por unidad); si no, un color único.
export const MoneyHBar: React.FC<{
  data: MoneyBarDatum[];
  color?: string;
  height?: number;
  yWidth?: number;
  perItemColor?: boolean;
}> = ({ data, color = '#2563EB', height = 300, yWidth = 150, perItemColor }) => {
  const t = useChartTheme();
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 56, left: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke={t.grid} strokeOpacity={0.5} />
          <XAxis type="number" domain={[0, 'dataMax']} tick={{ fontSize: 10, fill: t.axis }} tickFormatter={moneyAxis} />
          <YAxis type="category" dataKey="label" width={yWidth} tick={{ fontSize: 11, fill: t.axis }} interval={0} />
          <Tooltip
            cursor={{ fill: t.dark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.15)' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload as MoneyBarDatum;
              return (
                <div style={t.tooltip} className="px-3 py-2">
                  <div className="font-semibold mb-0.5">{d.full ?? d.label}</div>
                  {d.sub && <div className="text-[11px] text-slate-400">{d.sub}</div>}
                  <div className="text-[11px]">{money(d.value)}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill={color} radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {perItemColor && data.map((d, i) => <Cell key={i} fill={d.color ?? color} />)}
            <LabelList dataKey="value" position="right" formatter={(v: number) => moneyAxis(v)} style={{ fontSize: 10, fill: t.axis }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
