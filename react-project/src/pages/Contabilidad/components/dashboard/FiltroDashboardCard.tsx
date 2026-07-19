// Card de filtros COMPARTIDO por los 2 tabs del Dashboard (estado elevado a la página). Mantiene un
// "borrador" local y solo COMMITEA al presionar "Aplicar" (evita refetch por cada tecla). Los tipos de
// caja son catalog-driven (GET /dashboard/tipos-caja — NO se hardcodean los 6); todos ON por default,
// se impide desmarcar el último (mínimo 1). tiposCaja viaja como CSV string (regla del proyecto).
import React, { useEffect, useRef, useState } from 'react';
import { Filter, Search, Boxes, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import contabilidadService from '../../../../services/contabilidad/ContabilidadService';
import type { DashFiltro, DashTipoCaja } from '../../../../services/contabilidad/contaTypes';
import { unidadCorto, unidadColor } from './dashHelpers';

const inputCls = 'px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-primary';

// CSV que se emite al filtro. CLAVE (D6/§5.2): con TODOS los tipos marcados se emite '' (vacío) para
// que el service OMITA el param → el API reciba null → el SP incluya el bucket 0 (ADMINISTRACION,
// centros sin i_IdTipoCaja). Un CSV no-nulo (aunque sea '1,2,3,4,5,6') EXCLUYE ese bucket. Solo cuando
// el usuario deselecciona alguna unidad se emite el CSV explícito de las marcadas.
const emitCsv = (ids: number[], total: number): string =>
  (total > 0 && ids.length >= total) ? '' : [...ids].sort((a, b) => a - b).join(',');

const FiltroDashboardCard: React.FC<{
  value: DashFiltro;
  onApply: (f: DashFiltro) => void;
  loading?: boolean;
}> = ({ value, onApply, loading }) => {
  const [tipos, setTipos] = useState<DashTipoCaja[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [draftDesde, setDraftDesde] = useState(value.desde);
  const [draftHasta, setDraftHasta] = useState(value.hasta);
  const [selIds, setSelIds] = useState<number[]>([]);
  const commitedRef = useRef(false);

  // Catálogo de tipos de caja (una vez, al montar). Inicializa la selección (TODOS por default) y, si el
  // filtro nace "vacío" (TODOS pendiente), auto-commitea el CSV explícito para disparar el 1er fetch.
  useEffect(() => {
    let vivo = true;
    contabilidadService.dashTiposCaja()
      .then((ts) => {
        if (!vivo) return;
        setTipos(ts);
        const allIds = ts.map((t) => t.i_IdTipoCaja);
        if (value.tiposCaja) {
          setSelIds(value.tiposCaja.split(',').map(Number).filter((n) => allIds.includes(n)));
        } else {
          setSelIds(allIds);
          if (!commitedRef.current) {
            commitedRef.current = true;
            // TODOS marcados -> emitCsv devuelve '' (TODOS real, incluye bucket 0 ADMINISTRACION).
            onApply({ desde: value.desde, hasta: value.hasta, tiposCaja: emitCsv(allIds, allIds.length) });
          }
        }
      })
      .catch((e) => { if (vivo) toast.error(e instanceof Error ? e.message : 'No se pudieron cargar los tipos de caja'); })
      .finally(() => { if (vivo) setCatLoading(false); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza el borrador cuando el commit externo cambia (p.ej. reset del padre). value.tiposCaja==''
  // significa TODOS (bucket 0 incluido) -> deja los 6 chips marcados.
  useEffect(() => {
    setDraftDesde(value.desde);
    setDraftHasta(value.hasta);
    if (tipos.length) {
      const allIds = tipos.map((t) => t.i_IdTipoCaja);
      setSelIds(value.tiposCaja ? value.tiposCaja.split(',').map(Number).filter((n) => allIds.includes(n)) : allIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.desde, value.hasta, value.tiposCaja]);

  const toggle = (id: number) => {
    const has = selIds.includes(id);
    if (has && selIds.length === 1) return; // mínimo 1
    setSelIds(has ? selIds.filter((x) => x !== id) : [...selIds, id]);
  };

  const rangoInvalido = !!draftDesde && !!draftHasta && draftDesde > draftHasta;
  const draftCsv = emitCsv(selIds, tipos.length);
  const dirty = draftDesde !== value.desde || draftHasta !== value.hasta || draftCsv !== value.tiposCaja;

  const aplicar = () => {
    if (rangoInvalido || !draftDesde || !draftHasta || selIds.length === 0) return;
    onApply({ desde: draftDesde, hasta: draftHasta, tiposCaja: draftCsv });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium pb-2">
          <Filter className="h-4 w-4" /> Filtros
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
          <input type="date" value={draftDesde} onChange={(e) => setDraftDesde(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
          <input type="date" value={draftHasta} onChange={(e) => setDraftHasta(e.target.value)} className={inputCls} />
        </div>

        {/* Chips-checkbox de tipos de caja (catalog-driven) */}
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tipos de caja (unidades)</label>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
              <Boxes className="h-3 w-3" /> {selIds.length}/{tipos.length || 6} tipos
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {catLoading
              ? [1, 2, 3, 4, 5, 6].map((i) => <span key={i} className="h-7 w-24 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)
              : tipos.map((t) => {
                const on = selIds.includes(t.i_IdTipoCaja);
                const esUltimo = on && selIds.length === 1;
                const color = unidadColor(t.v_NombreTipoCaja);
                return (
                  <label
                    key={t.i_IdTipoCaja}
                    title={esUltimo ? 'Elige al menos un tipo de caja' : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium select-none transition-colors ${
                      on
                        ? 'border-transparent text-white'
                        : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-transparent'
                    } ${esUltimo ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    style={on ? { backgroundColor: color } : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(t.i_IdTipoCaja)}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-700"
                    />
                    {unidadCorto(t.v_NombreTipoCaja)}
                  </label>
                );
              })}
          </div>
        </div>

        <button
          onClick={aplicar}
          disabled={rangoInvalido || loading || selIds.length === 0}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold ${rangoInvalido || loading || selIds.length === 0 ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary-light'} ${dirty && !rangoInvalido ? 'ring-2 ring-primary/30' : ''}`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? 'Cargando…' : 'Aplicar'}
        </button>
      </div>
      {rangoInvalido && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">La fecha «Desde» no puede ser posterior a «Hasta».</p>
      )}
    </div>
  );
};

export default FiltroDashboardCard;
