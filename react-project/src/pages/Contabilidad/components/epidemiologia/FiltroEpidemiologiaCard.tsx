// Card de filtros COMPARTIDO por los 2 tabs de Epidemiología (estado elevado a la página).
// Mantiene un "borrador" local y solo COMMITEA al presionar "Aplicar" (evita refetch por cada tecla,
// clave porque el dashboard es pesado). El check "Solo con diagnóstico" se muestra solo en TAB 1.
import React, { useEffect, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import type { EpiAmbito } from '../../../../services/contabilidad/contaTypes';

export interface EpiFiltro {
  desde: string;               // yyyy-MM-dd
  hasta: string;               // yyyy-MM-dd
  ambito: EpiAmbito;
  incluirDescartados: boolean;
  soloConDx: boolean;          // solo aplica a TAB 1
}

const AMBITOS: { value: EpiAmbito; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ASISTENCIAL', label: 'Asistencial' },
  { value: 'OCUPACIONAL', label: 'Ocupacional' },
  { value: 'HOSPITALIZACION', label: 'Hospitalización' },
];

const inputCls = 'px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-primary';

const FiltroEpidemiologiaCard: React.FC<{
  value: EpiFiltro;
  onApply: (f: EpiFiltro) => void;
  showSoloConDx: boolean;
  loading?: boolean;
}> = ({ value, onApply, showSoloConDx, loading }) => {
  const [draft, setDraft] = useState<EpiFiltro>(value);

  // Si el commit externo cambia (p.ej. al montar), sincroniza el borrador.
  useEffect(() => { setDraft(value); }, [value]);

  const rangoInvalido = !!draft.desde && !!draft.hasta && draft.desde > draft.hasta;
  const dirty = JSON.stringify(draft) !== JSON.stringify(value);

  const aplicar = () => {
    if (rangoInvalido || !draft.desde || !draft.hasta) return;
    onApply(draft);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium pb-2">
          <Filter className="h-4 w-4" /> Filtros
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
          <input type="date" value={draft.desde} onChange={(e) => setDraft({ ...draft, desde: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
          <input type="date" value={draft.hasta} onChange={(e) => setDraft({ ...draft, hasta: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ámbito</label>
          <select value={draft.ambito} onChange={(e) => setDraft({ ...draft, ambito: e.target.value as EpiAmbito })} className={inputCls}>
            {AMBITOS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none">
          <input type="checkbox" checked={draft.incluirDescartados} onChange={(e) => setDraft({ ...draft, incluirDescartados: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
          Incluir descartados
        </label>
        {showSoloConDx && (
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none">
            <input type="checkbox" checked={draft.soloConDx} onChange={(e) => setDraft({ ...draft, soloConDx: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
            Solo con diagnóstico
          </label>
        )}
        <button
          onClick={aplicar}
          disabled={rangoInvalido || loading}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold ${rangoInvalido || loading ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary-light'} ${dirty && !rangoInvalido ? 'ring-2 ring-primary/30' : ''}`}
        >
          <Search className="h-4 w-4" /> Aplicar
        </button>
      </div>
      {rangoInvalido && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">La fecha «Desde» no puede ser posterior a «Hasta».</p>
      )}
    </div>
  );
};

export default FiltroEpidemiologiaCard;
