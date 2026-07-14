// Chart 6 — Heatmap consultorio × capítulo CIE-10 (recharts no trae heatmap: grid propio con intensidad).
// Filas = top consultorios por total de dx; columnas = capítulos presentes (romano, con nombre en tooltip).
import React, { useMemo } from 'react';
import type { EpiHeatmapRow } from '../../../../services/contabilidad/contaTypes';
import { capRomano, nInt } from './epiHelpers';

const MAX_CONSULTORIOS = 14;

const HeatmapConsultorioCapitulo: React.FC<{ data: EpiHeatmapRow[] }> = ({ data }) => {
  const { consultorios, capitulos, matrix, max } = useMemo(() => {
    const consTotals = new Map<string, number>();
    const capMap = new Map<string, { capNum: number | null; capNombre: string }>();
    const cell = new Map<string, number>(); // `${cons}|${capKey}` -> NumDx

    for (const r of data) {
      consTotals.set(r.ConsultorioNombre, (consTotals.get(r.ConsultorioNombre) ?? 0) + r.NumDx);
      const capKey = r.CapNum == null ? 'null' : String(r.CapNum);
      if (!capMap.has(capKey)) capMap.set(capKey, { capNum: r.CapNum, capNombre: r.CapNombre });
      cell.set(`${r.ConsultorioNombre}|${capKey}`, (cell.get(`${r.ConsultorioNombre}|${capKey}`) ?? 0) + r.NumDx);
    }

    const consultorios = [...consTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_CONSULTORIOS).map(([c]) => c);
    const capitulos = [...capMap.entries()]
      .sort((a, b) => {
        const an = a[1].capNum ?? 999, bn = b[1].capNum ?? 999;
        return an - bn;
      })
      .map(([key, v]) => ({ key, ...v }));

    let max = 0;
    const matrix = consultorios.map((c) => capitulos.map((cap) => {
      const v = cell.get(`${c}|${cap.key}`) ?? 0;
      if (v > max) max = v;
      return v;
    }));
    return { consultorios, capitulos, matrix, max };
  }, [data]);

  // Intensidad: opacidad del primario en función del valor (escala raíz para no aplastar valores bajos).
  const bg = (v: number): string => {
    if (v <= 0 || max <= 0) return 'transparent';
    const alpha = 0.12 + 0.78 * Math.sqrt(v / max);
    return `rgba(30, 58, 138, ${alpha.toFixed(3)})`;
  };

  if (!consultorios.length) return null;

  return (
    <div className="overflow-auto max-h-[440px]">
      <table className="border-separate" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white dark:bg-slate-800 text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-1 min-w-[150px]">Consultorio</th>
            {capitulos.map((cap) => (
              <th key={cap.key} title={cap.capNombre} className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1 py-1 text-center min-w-[34px]">
                {cap.capNum == null ? 'OTR' : capRomano(cap.capNum)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {consultorios.map((c, ri) => (
            <tr key={c}>
              <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 px-2 py-1 whitespace-nowrap min-w-[150px]" title={c}>
                {c.length > 22 ? `${c.slice(0, 21)}…` : c}
              </td>
              {capitulos.map((cap, ci) => {
                const v = matrix[ri][ci];
                const strong = v > 0 && v / (max || 1) > 0.55;
                return (
                  <td
                    key={cap.key}
                    title={`${c} · ${cap.capNombre}: ${nInt(v)} dx`}
                    className={`text-center text-[10px] rounded ${strong ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}
                    style={{ backgroundColor: bg(v), width: 34, height: 26 }}
                  >
                    {v > 0 ? nInt(v) : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HeatmapConsultorioCapitulo;
