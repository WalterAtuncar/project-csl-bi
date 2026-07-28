// Grafico automatico del resultado NLQ con RECHARTS (nada hecho a mano) segun ChartSugerido:
// bar | line | pie | scatter | kpi | tabla. La deteccion de dimension vs medida sale del Formato de cada
// columna (numericas = money/int/pct; dimensiones = date/text). 'tabla' o data que no encaja -> null
// (la pagina siempre pinta la tabla por debajo).
import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { NlqCelda, NlqChartTipo, NlqColumna } from '../../../services/contabilidad/contaTypes';
import { esColumnaNumerica, formatCelda, toNumero } from './nlqFormat';

const PALETTE = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16', '#ec4899'];
const H = 340; // ResponsiveContainer necesita alto explicito del contenedor.

// Wrapper a nivel de modulo (NO definir componentes dentro del render: remontaria el chart en cada render).
const Wrap: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <div style={{ width: '100%', height: H }}>
    <ResponsiveContainer>{children}</ResponsiveContainer>
  </div>
);

// Etiqueta de porcion del pie (truncada). recharts pasa el objeto de datos + campos calculados.
const pieLabel = (nameKey: string) => (e: Record<string, unknown>): string => {
  const v = e[nameKey];
  const s = v == null ? '' : String(v);
  return s.length > 16 ? `${s.slice(0, 15)}…` : s;
};

const NlqChart: React.FC<{ columnas: NlqColumna[]; filas: NlqCelda[][]; tipo: NlqChartTipo }> = ({ columnas, filas, tipo }) => {
  // Filas -> array de objetos keyed por Nombre de columna: numericas a number, dimensiones a string formateada.
  const rows = useMemo(
    () =>
      filas.map((fila) => {
        const o: Record<string, string | number> = {};
        columnas.forEach((c, i) => {
          const v = fila?.[i] ?? null;
          o[c.Nombre] = esColumnaNumerica(c) ? toNumero(v) : formatCelda(v, c.Formato);
        });
        return o;
      }),
    [columnas, filas],
  );

  const numericas = useMemo(() => columnas.filter(esColumnaNumerica), [columnas]);
  const dimensiones = useMemo(() => columnas.filter((c) => !esColumnaNumerica(c)), [columnas]);
  const colPorNombre = useMemo(() => {
    const m: Record<string, NlqColumna> = {};
    columnas.forEach((c) => { m[c.Nombre] = c; });
    return m;
  }, [columnas]);

  // Formateo de valores en el tooltip por el Formato de la serie (name = Nombre de columna).
  const fmtValor = (value: unknown, name?: unknown): string => {
    const col = typeof name === 'string' ? colPorNombre[name] : undefined;
    return col ? formatCelda(value as NlqCelda, col.Formato) : String(value ?? '');
  };
  // Ticks del eje Y (heuristica por el Formato de la 1a numerica): miles compactados, prefijo/sufijo segun tipo.
  const fmtEje = (v: number): string => {
    const f = numericas[0]?.Formato;
    const compacto = Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })}k` : v.toLocaleString('es-PE');
    if (f === 'money') return `S/ ${compacto}`;
    if (f === 'pct') return `${v}%`;
    return compacto;
  };

  // KPI: una tarjeta por columna numerica (o por columna si no hay numericas) con la 1a fila.
  if (tipo === 'kpi') {
    const fila0 = filas[0] ?? [];
    const kpis = numericas.length ? numericas : columnas;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((c) => {
          const idx = columnas.indexOf(c);
          return (
            <div key={c.Nombre} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-5">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{c.Nombre}</div>
              <div className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                {formatCelda(fila0[idx] ?? null, c.Formato)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (tipo === 'bar' && numericas.length && rows.length) {
    const xKey = (dimensiones[0] ?? columnas[0]).Nombre;
    return (
      <Wrap>
        <BarChart data={rows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtEje} width={72} />
          <Tooltip formatter={(v, n) => [fmtValor(v, n), n]} />
          {numericas.length > 1 && <Legend />}
          {numericas.map((c, i) => (
            <Bar key={c.Nombre} dataKey={c.Nombre} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </Wrap>
    );
  }

  if (tipo === 'line' && numericas.length && rows.length) {
    const xKey = (dimensiones[0] ?? columnas[0]).Nombre;
    return (
      <Wrap>
        <LineChart data={rows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtEje} width={72} />
          <Tooltip formatter={(v, n) => [fmtValor(v, n), n]} />
          {numericas.length > 1 && <Legend />}
          {numericas.map((c, i) => (
            <Line key={c.Nombre} type="monotone" dataKey={c.Nombre} stroke={PALETTE[i % PALETTE.length]} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </Wrap>
    );
  }

  if (tipo === 'pie' && numericas.length && dimensiones.length && rows.length) {
    const nameKey = dimensiones[0].Nombre;
    const valKey = numericas[0].Nombre;
    const data = rows.slice(0, 12);
    return (
      <Wrap>
        <PieChart>
          <Pie data={data} dataKey={valKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={110} labelLine={false} label={pieLabel(nameKey)}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v, n) => [fmtValor(v, valKey), n]} />
          <Legend />
        </PieChart>
      </Wrap>
    );
  }

  if (tipo === 'scatter' && numericas.length >= 2 && rows.length) {
    const xC = numericas[0];
    const yC = numericas[1];
    return (
      <Wrap>
        <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
          <XAxis type="number" dataKey={xC.Nombre} name={xC.Nombre} tick={{ fontSize: 11 }} tickFormatter={fmtEje} />
          <YAxis type="number" dataKey={yC.Nombre} name={yC.Nombre} tick={{ fontSize: 11 }} width={72} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, n) => [fmtValor(v, n), n]} />
          <Scatter data={rows} fill={PALETTE[0]} />
        </ScatterChart>
      </Wrap>
    );
  }

  // 'tabla' o cualquier data que no encaja en el chart pedido -> sin grafico (la pagina muestra la tabla).
  return null;
};

export default NlqChart;
