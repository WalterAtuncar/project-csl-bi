// Chart 6 — Heatmap consultorio × capítulo CIE-10 (recharts no trae heatmap: grid propio con intensidad).
// Filas = top consultorios por total de dx; columnas = capítulos presentes (romano). Ancho completo
// (table-fixed w-full) + tooltip personalizado (card flotante) con cursor pointer en las celdas con datos.
import React, { useMemo, useRef, useState } from 'react';
import type { EpiHeatmapRow } from '../../../../services/contabilidad/contaTypes';
import { capRomano, nInt } from './epiHelpers';

const MAX_CONSULTORIOS = 14;
const PRIMARY = '#1E3A8A';

interface Hover { cons: string; romano: string; capNombre: string; value: number; x: number; y: number }

const HeatmapConsultorioCapitulo: React.FC<{ data: EpiHeatmapRow[] }> = ({ data }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

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
      .sort((a, b) => (a[1].capNum ?? 999) - (b[1].capNum ?? 999))
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

  const onCellMove = (e: React.MouseEvent, cons: string, cap: { capNum: number | null; capNombre: string }, v: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      cons,
      romano: cap.capNum == null ? 'OTR' : capRomano(cap.capNum),
      capNombre: cap.capNombre,
      value: v,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  if (!consultorios.length) return null;

  // Posición del tooltip: sigue al cursor, acotado para no salir por la derecha del contenedor.
  const TW = 244;
  const wrapW = wrapRef.current?.clientWidth ?? 9999;
  const tipLeft = hover ? Math.max(8, Math.min(hover.x + 16, wrapW - TW - 8)) : 0;
  const tipTop = hover ? hover.y + 18 : 0;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="overflow-auto max-h-[440px]">
        <table className="w-full table-fixed border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white dark:bg-slate-800 text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-1" style={{ width: 160 }}>Consultorio</th>
              {capitulos.map((cap) => (
                <th key={cap.key} className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1 py-1 text-center">
                  {cap.capNum == null ? 'OTR' : capRomano(cap.capNum)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {consultorios.map((c, ri) => (
              <tr key={c}>
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 px-2 py-1 truncate" style={{ width: 160, maxWidth: 160 }} title={c}>
                  {c}
                </td>
                {capitulos.map((cap, ci) => {
                  const v = matrix[ri][ci];
                  const strong = v > 0 && v / (max || 1) > 0.55;
                  const has = v > 0;
                  return (
                    <td
                      key={cap.key}
                      onMouseEnter={has ? (e) => onCellMove(e, c, cap, v) : undefined}
                      onMouseMove={has ? (e) => onCellMove(e, c, cap, v) : undefined}
                      onMouseLeave={has ? () => setHover(null) : undefined}
                      className={`text-center text-[10px] rounded transition-transform ${has ? 'cursor-pointer hover:ring-2 hover:ring-blue-400/70' : ''} ${strong ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}
                      style={{ backgroundColor: bg(v), height: 26 }}
                    >
                      {has ? nInt(v) : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip personalizado (card flotante, dark-aware) — reemplaza el title nativo del navegador. */}
      {hover && (
        <div
          className="pointer-events-none absolute z-30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl px-3 py-2"
          style={{ left: tipLeft, top: tipTop, width: TW }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center h-5 min-w-[24px] px-1 rounded text-white text-[10px] font-semibold" style={{ backgroundColor: PRIMARY }}>{hover.romano}</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-100 leading-tight">{hover.capNombre}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="uppercase tracking-wide text-[9px] text-slate-400 dark:text-slate-500">Consultorio</span><br />
            {hover.cons}
          </div>
          <div className="flex items-baseline gap-1 border-t border-slate-100 dark:border-slate-700 pt-1.5">
            <span className="text-lg font-bold tabular-nums text-blue-700 dark:text-blue-300">{nInt(hover.value)}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">diagnóstico{hover.value === 1 ? '' : 's'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeatmapConsultorioCapitulo;
