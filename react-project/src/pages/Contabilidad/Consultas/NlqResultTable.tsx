import React from 'react';
import type { NlqCelda, NlqColumna } from '../../../services/contabilidad/contaTypes';
import { formatCelda, alineacion, esColumnaNumerica } from './nlqFormat';

// Proteccion de render (el API ya limita filas server-side; esto solo evita reventar el DOM en un caso raro).
const MAX_VISIBLE = 500;

// Tabla del resultado NLQ: cada celda se formatea por Columnas[i].Formato (money/date/int/pct/text).
const NlqResultTable: React.FC<{ columnas: NlqColumna[]; filas: NlqCelda[][] }> = ({ columnas, filas }) => {
  if (!columnas.length) return null;
  const visibles = filas.slice(0, MAX_VISIBLE);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
            {columnas.map((c, i) => (
              <th
                key={i}
                className={`px-3 py-2 font-medium whitespace-nowrap ${esColumnaNumerica(c) ? 'text-right' : 'text-left'}`}
              >
                {c.Nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibles.map((fila, r) => (
            <tr
              key={r}
              className="border-t border-slate-100 dark:border-slate-700/70 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              {columnas.map((c, i) => (
                <td key={i} className={`px-3 py-1.5 whitespace-nowrap text-slate-700 dark:text-slate-200 ${alineacion(c)}`}>
                  {formatCelda(fila?.[i] ?? null, c.Formato)}
                </td>
              ))}
            </tr>
          ))}
          {visibles.length === 0 && (
            <tr>
              <td colSpan={columnas.length} className="px-3 py-6 text-center text-slate-400">
                La consulta no devolvió filas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {filas.length > MAX_VISIBLE && (
        <div className="px-3 py-2 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-700/70">
          Mostrando las primeras {MAX_VISIBLE.toLocaleString('es-PE')} de {filas.length.toLocaleString('es-PE')} filas.
        </div>
      )}
    </div>
  );
};

export default NlqResultTable;
