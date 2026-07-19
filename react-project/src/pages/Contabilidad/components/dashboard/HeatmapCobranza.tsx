// Heatmap de cobranza día×semana (G9). Grid CSS propio (no recharts): filas = día de la semana
// (1=lun..7=dom), columnas = semanas secuenciales del rango; intensidad emerald ∝ Cobrado/máx.
import React from 'react';
import { moneyC, fmtDiaMes } from './dashHelpers';
import type { DashHeatmapCobranzaRow } from '../../../../services/contabilidad/contaTypes';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const HeatmapCobranza: React.FC<{ data: DashHeatmapCobranzaRow[] }> = ({ data }) => {
  // Semanas (columnas) ordenadas; guardamos su etiqueta de fecha de inicio.
  const semanas = Array.from(new Map(data.map((r) => [r.NumSemana, r.FechaInicioSemana])).entries())
    .sort((a, b) => a[0] - b[0]);
  // Índice rápido (dia|semana) -> cobrado.
  const idx = new Map<string, number>();
  let max = 0;
  for (const r of data) {
    idx.set(`${r.DiaSemana}|${r.NumSemana}`, r.Cobrado);
    if (r.Cobrado > max) max = r.Cobrado;
  }

  const cellBg = (v: number): string => {
    if (!v || v <= 0) return 'transparent';
    const ratio = max > 0 ? v / max : 0;
    const alpha = 0.12 + ratio * 0.78; // 0.12..0.90
    return `rgba(16,185,129,${alpha.toFixed(3)})`;
  };
  const textCls = (v: number): string => (max > 0 && v / max > 0.55 ? 'text-white' : 'text-slate-600 dark:text-slate-300');

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${semanas.length}, minmax(40px, 1fr))` }}>
        {/* Cabecera: esquina + fecha de inicio de cada semana */}
        <div />
        {semanas.map(([num, fecha]) => (
          <div key={num} className="text-[10px] text-center text-slate-400 dark:text-slate-500 pb-1" title={`Semana desde ${fmtDiaMes(fecha)}`}>
            {fmtDiaMes(fecha)}
          </div>
        ))}

        {/* 7 filas (Lun..Dom) */}
        {DIAS.map((dia, di) => (
          <React.Fragment key={dia}>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pr-2 flex items-center justify-end">{dia}</div>
            {semanas.map(([num, fecha]) => {
              const v = idx.get(`${di + 1}|${num}`) ?? 0;
              return (
                <div
                  key={`${dia}-${num}`}
                  className={`h-9 rounded flex items-center justify-center text-[9px] font-medium border border-slate-100 dark:border-slate-700/50 ${textCls(v)}`}
                  style={{ backgroundColor: cellBg(v) }}
                  title={`${dia} · semana del ${fmtDiaMes(fecha)}: ${moneyC(v)}`}
                >
                  {v > 0 ? moneyC(v).replace('S/ ', '') : ''}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Leyenda de intensidad */}
      <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400 dark:text-slate-500">
        <span>menos</span>
        <div className="flex gap-0.5">
          {[0.12, 0.32, 0.52, 0.72, 0.9].map((a) => (
            <span key={a} className="h-3 w-4 rounded-sm" style={{ backgroundColor: `rgba(16,185,129,${a})` }} />
          ))}
        </div>
        <span>más cobranza</span>
      </div>
    </div>
  );
};

export default HeatmapCobranza;
