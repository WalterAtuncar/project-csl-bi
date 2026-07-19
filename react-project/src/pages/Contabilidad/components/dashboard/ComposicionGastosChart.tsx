// Composición de gastos del rango (C3). Treemap cuando hay muchas categorías (Eleken: anti-donut para
// >5 grupos); fallback Pareto (barras desc + línea de % acumulado) cuando hay pocas — así siempre es
// legible con la data legacy de hoy (pocas categorías) y escalará con la carga de egresos conta.
import React from 'react';
import {
  Treemap, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { useChartTheme } from './DashUI';
import { money, moneyC, moneyAxis, nPct, truncar, catColor } from './dashHelpers';
import type { DashComposicionGastoRow } from '../../../../services/contabilidad/contaTypes';

interface CellProps { x?: number; y?: number; width?: number; height?: number; index?: number; name?: string; value?: number }
const TreemapCell: React.FC<CellProps> = ({ x = 0, y = 0, width = 0, height = 0, index = 0, name = '', value = 0 }) => {
  const color = catColor(index);
  const showText = width > 56 && height > 28;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3} style={{ fill: color, stroke: '#fff', strokeOpacity: 0.4, strokeWidth: 1 }} />
      {showText && (
        <>
          <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={600}>{truncar(name, Math.max(3, Math.floor(width / 8)))}</text>
          <text x={x + 6} y={y + 30} fill="#fff" fontSize={10} fillOpacity={0.85}>{moneyAxis(value)}</text>
        </>
      )}
    </g>
  );
};

const ComposicionGastosChart: React.FC<{ data: DashComposicionGastoRow[]; height?: number }> = ({ data, height = 300 }) => {
  const t = useChartTheme();
  const rows = [...data].sort((a, b) => b.Monto - a.Monto);

  // Fallback Pareto cuando hay <=5 categorías (un treemap con pocas cajas se lee peor que un Pareto).
  if (rows.length <= 5) {
    let acc = 0;
    const total = rows.reduce((s, r) => s + r.Monto, 0) || 1;
    const pareto = rows.map((r) => {
      acc += r.Monto;
      return { label: truncar(r.Categoria, 18), full: `${r.Categoria} · ${r.Fuente}`, Monto: r.Monto, cum: (acc / total) * 100 };
    });
    return (
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <ComposedChart data={pareto} margin={{ top: 12, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.axis }} interval={0} />
            <YAxis yAxisId="l" tick={{ fontSize: 11, fill: t.axis }} width={46} tickFormatter={moneyAxis} />
            <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: t.axis }} width={38} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [n === '% acumulado' ? nPct(v) : money(v), n]} />
            <Bar yAxisId="l" dataKey="Monto" name="Monto" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {pareto.map((_, i) => <Cell key={i} fill={catColor(i)} />)}
              <LabelList dataKey="Monto" position="top" formatter={(v: number) => moneyAxis(v)} style={{ fontSize: 10, fill: t.axis }} />
            </Bar>
            <Line yAxisId="r" type="monotone" dataKey="cum" name="% acumulado" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const tree = rows.map((r) => ({ name: r.Categoria, size: r.Monto, fuente: r.Fuente, pct: r.Pct }));
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <Treemap data={tree} dataKey="size" nameKey="name" stroke="#fff" isAnimationActive={false} content={<TreemapCell />}>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload as { name: string; size: number; fuente: string; pct: number };
              return (
                <div style={t.tooltip} className="px-3 py-2">
                  <div className="font-semibold mb-0.5">{d.name}</div>
                  <div className="text-[11px] text-slate-400">{d.fuente}</div>
                  <div className="text-[11px]">{moneyC(d.size)} · {nPct(d.pct)}</div>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
};

export default ComposicionGastosChart;
