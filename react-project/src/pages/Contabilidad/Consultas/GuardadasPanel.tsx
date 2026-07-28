import React from 'react';
import { Play, Trash2, Bookmark, AlertTriangle, Loader2 } from 'lucide-react';
import type { NlqGuardada } from '../../../services/contabilidad/contaTypes';

const TIPO_LABEL: Record<string, string> = {
  bar: 'Barras', line: 'Líneas', pie: 'Torta', scatter: 'Dispersión', kpi: 'KPI', tabla: 'Tabla',
};

interface Props {
  guardadas: NlqGuardada[];
  loading: boolean;
  canWrite: boolean; // borrar solo SA/CONTABILIDAD; GERENTE ve y ejecuta, no borra
  ejecutandoId: number | null;
  onEjecutar: (g: NlqGuardada) => void;
  onBorrar: (g: NlqGuardada) => void;
}

// Panel lateral de consultas guardadas: ejecutar (0 tokens) / borrar (oculto para GERENTE). Marca visual
// si DesactualizadaFlag (el esquema cambio desde que se guardo).
const GuardadasPanel: React.FC<Props> = ({ guardadas, loading, canWrite, ejecutandoId, onEjecutar, onBorrar }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
      <Bookmark className="h-4 w-4 text-sky-600" />
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Consultas guardadas</h3>
    </div>
    <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/70">
      {loading && <div className="px-4 py-6 text-center text-sm text-slate-400">Cargando…</div>}
      {!loading && guardadas.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-slate-400">Aún no hay consultas guardadas.</div>
      )}
      {guardadas.map((g) => {
        const ejecutando = ejecutandoId === g.Id;
        return (
          <div key={g.Id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{g.Nombre}</div>
                {g.Descripcion && <div className="text-xs text-slate-400 truncate">{g.Descripcion}</div>}
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                    {TIPO_LABEL[g.ChartTipo] ?? g.ChartTipo}
                  </span>
                  {g.DesactualizadaFlag && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> puede estar desactualizada
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEjecutar(g)}
                  disabled={ejecutando}
                  title="Ejecutar"
                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50"
                >
                  {ejecutando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </button>
                {canWrite && (
                  <button
                    onClick={() => onBorrar(g)}
                    title="Borrar"
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default GuardadasPanel;
