// Waterfall del flujo de caja del período (G6). Técnica recharts: barra apilada con un segmento
// "base" transparente que hace flotar el segmento visible (Yellowfin/Domo). ENTRADA sube, SALIDA
// baja, NETO es una barra sólida desde 0. Robusto ante el signo del Monto de las SALIDA (usa abs).
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useChartTheme } from './DashUI';
import { moneyAxis, moneyC, truncar } from './dashHelpers';
import type { DashWaterfallRow } from '../../../../services/contabilidad/contaTypes';

const COLOR = { ENTRADA: '#10B981', SALIDA: '#F43F5E', NETO: '#2563EB' } as const;

interface WFBar { name: string; full: string; base: number; bar: number; monto: number; color: string }

const WaterfallCaja: React.FC<{ data: DashWaterfallRow[]; height?: number }> = ({ data, height = 340 }) => {
  const t = useChartTheme();

  const rows = [...data].sort((a, b) => a.Orden - b.Orden);
  let running = 0;
  const chart: WFBar[] = rows.map((r) => {
    const mag = Math.abs(r.Monto);
    const full = r.Concepto;
    const name = truncar(r.Concepto, 16);
    if (r.Tipo === 'ENTRADA') {
      const base = running;
      running += mag;
      return { name, full, base, bar: mag, monto: mag, color: COLOR.ENTRADA };
    }
    if (r.Tipo === 'SALIDA') {
      const bottom = running - mag;
      running = bottom;
      return { name, full, base: bottom, bar: mag, monto: -mag, color: COLOR.SALIDA };
    }
    // NETO: barra sólida desde 0 hasta el flujo neto (usa el Monto reportado, con su signo).
    const val = r.Monto;
    return { name, full, base: Math.min(0, val), bar: Math.abs(val), monto: val, color: COLOR.NETO };
  });

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={chart} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.5} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: t.axis }} interval={0} />
          <YAxis tick={{ fontSize: 11, fill: t.axis }} width={46} tickFormatter={moneyAxis} />
          <Tooltip
            cursor={{ fill: t.dark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.15)' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload as WFBar;
              return (
                <div style={t.tooltip} className="px-3 py-2">
                  <div className="font-semibold mb-0.5">{d.full}</div>
                  <div className="text-[11px]" style={{ color: d.color }}>
                    {d.monto >= 0 ? '+' : '−'} {moneyC(Math.abs(d.monto))}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="bar" stackId="wf" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {chart.map((d, i) => <Cell key={i} fill={d.color} />)}
            <LabelList dataKey="monto" position="top" formatter={(v: number) => moneyAxis(Math.abs(v))} style={{ fontSize: 10, fill: t.axis }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WaterfallCaja;
