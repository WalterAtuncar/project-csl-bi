import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, Search, Download, ChevronLeft, ChevronRight, Share2, Info } from 'lucide-react';
import contabilidadService from '../../../services/contabilidad/ContabilidadService';
import { todayLima } from '../../../utils/fechas';
import type {
  EspecialistaFiltroEspecialidad, EspecialistaFiltroMedico, EspecialistaResumen,
  EspecialistaAtencionesResponse, EspecialistaReferenciasResponse,
} from '../../../services/contabilidad/contaTypes';
import ModalAtenciones from '../components/especialistas/ModalAtenciones';
import ModalReferencias from '../components/especialistas/ModalReferencias';
import { exportResumen, type EspExcelFiltros } from '../components/especialistas/excelEspecialistas';

const PAGE_SIZE = 25;
const selCls = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

// Filtros CONGELADOS en el ultimo Buscar (el resumen y los modales usan ESTOS, no los inputs vivos,
// para que cambiar una fecha sin dar Buscar no descuadre bandeja y detalle).
interface AppliedFilters {
  desde: string;
  hasta: string;
  consultorioId: number | null;
  medicoId: number | null;
  incAsistencial: boolean;
  incSisol: boolean;
  incSeguro: boolean;
}

// Etiqueta legible del universo de ventas incluido (para el encabezado del Excel).
const universoLabel = (a: AppliedFilters): string => {
  const on: string[] = [];
  if (a.incAsistencial) on.push('Asistencial');
  if (a.incSisol) on.push('SISOL');
  if (a.incSeguro) on.push('Seguro');
  return on.length === 3 ? 'Todos' : (on.join(', ') || 'Ninguno');
};

// Etiqueta de la especialidad dominante: "(+N)" cuando el medico atendio en N especialidades mas
// (N = NumEspecialidades - 1; D8). "—" si nunca fue tratante (solo refirio).
const especialidadLabel = (r: EspecialistaResumen): string =>
  r.Especialidad == null ? '—' : (r.NumEspecialidades > 1 ? `${r.Especialidad} (+${r.NumEspecialidades - 1})` : r.Especialidad);

// Diferencia en dias entre dos YYYY-MM-DD (para validar rango <= 366 antes de llamar).
const diffDays = (a: string, b: string): number =>
  Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);

// dd/mm/yyyy por SPLIT (nunca new Date('YYYY-MM-DD'): corre el dia en Lima).
const fmtFecha = (iso: string): string => {
  const [y, m, d] = (iso || '').slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const Especialistas: React.FC = () => {
  // combos (ventana fija de 12 meses; se cargan al montar, D7)
  const [especialidades, setEspecialidades] = useState<EspecialistaFiltroEspecialidad[]>([]);
  const [especialistas, setEspecialistas] = useState<EspecialistaFiltroMedico[]>([]);
  const [loadingFiltros, setLoadingFiltros] = useState(false);

  // filtros vivos (inputs)
  const [desde, setDesde] = useState(() => `${todayLima().slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(() => todayLima());
  const [consultorioId, setConsultorioId] = useState<number | null>(null);
  const [medicoId, setMedicoId] = useState<number | null>(null);
  // universo de ventas: solo se cuentan boletas Asistencial / SISOL / Seguro. Los 3 ON por defecto.
  const [incAsistencial, setIncAsistencial] = useState(true);
  const [incSisol, setIncSisol] = useState(true);
  const [incSeguro, setIncSeguro] = useState(true);
  const ningunUniverso = !incAsistencial && !incSisol && !incSeguro;

  // filtros aplicados (congelados en Buscar; el mes actual entra ya aplicado al montar)
  const [applied, setApplied] = useState<AppliedFilters>(() => ({
    desde: `${todayLima().slice(0, 7)}-01`, hasta: todayLima(), consultorioId: null, medicoId: null,
    incAsistencial: true, incSisol: true, incSeguro: true,
  }));

  // bandeja
  const [filas, setFilas] = useState<EspecialistaResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [exportingResumen, setExportingResumen] = useState(false);

  // modales (lazy) + cache client por (medicoId, pagina) invalidado en cada Buscar (D1). El cache
  // vive AQUI (page) para que reabrir un modal NO re-llame aunque el modal se desmonte al cerrar.
  const [openAtenciones, setOpenAtenciones] = useState<EspecialistaResumen | null>(null);
  const [openReferencias, setOpenReferencias] = useState<EspecialistaResumen | null>(null);
  const atencionesCache = useRef(new Map<string, EspecialistaAtencionesResponse>());
  const referenciasCache = useRef(new Map<string, EspecialistaReferenciasResponse>());

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ---- combos al montar (sin params -> ultimos 12 meses) ----
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingFiltros(true);
      try {
        // D7: combos al montar (ultimos 12 meses) con el universo default (los 3 ON). Los checkboxes
        // afectan la BUSQUEDA, no el combo -> no se recargan al togglear.
        const res = await contabilidadService.especialistasFiltros({ incAsistencial: true, incSisol: true, incSeguro: true });
        if (!alive) return;
        setEspecialidades(res.especialidades);
        setEspecialistas(res.especialistas);
      } catch (e) {
        if (alive) toast.error(e instanceof Error ? e.message : 'Error al cargar los filtros');
      } finally {
        if (alive) setLoadingFiltros(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Especialistas del combo: filtrados client-side por la especialidad elegida (RS2 = pares
  // medico x consultorio -> dedup a 1 por medico), ordenados por nombre.
  const especialistaOptions = useMemo(() => {
    const src = consultorioId != null ? especialistas.filter((e) => e.ConsultorioId === consultorioId) : especialistas;
    const seen = new Map<number, EspecialistaFiltroMedico>();
    src.forEach((e) => { if (!seen.has(e.MedicoId)) seen.set(e.MedicoId, e); });
    return [...seen.values()].sort((a, b) => a.Medico.localeCompare(b.Medico));
  }, [especialistas, consultorioId]);

  // Al cambiar la especialidad se resetea el especialista (evita dejar uno que no pertenece).
  const onEspecialidadChange = (v: number | null) => {
    setConsultorioId(v);
    setMedicoId(null);
  };

  // ---- bandeja principal (recarga al cambiar applied o page) ----
  const loadResumen = useCallback(async () => {
    setLoadingResumen(true);
    try {
      const res = await contabilidadService.especialistasResumen({
        desde: applied.desde, hasta: applied.hasta,
        consultorioId: applied.consultorioId ?? undefined,
        medicoId: applied.medicoId ?? undefined,
        incAsistencial: applied.incAsistencial, incSisol: applied.incSisol, incSeguro: applied.incSeguro,
        pagina: page, tamanio: PAGE_SIZE,
      });
      setFilas(res.filas);
      setTotal(res.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cargar el resumen');
      setFilas([]);
      setTotal(0);
    } finally {
      setLoadingResumen(false);
    }
  }, [applied, page]);

  useEffect(() => { loadResumen(); }, [loadResumen]);

  const buscar = () => {
    if (!desde || !hasta) { toast.error('Indique el rango de fechas.'); return; }
    if (desde > hasta) { toast.error('La fecha "Desde" no puede ser mayor que "Hasta".'); return; }
    if (diffDays(desde, hasta) > 366) { toast.error('El rango no puede exceder 366 días.'); return; }
    if (ningunUniverso) { toast.error('Seleccione al menos un universo de ventas (Asistencial, SISOL o Seguro).'); return; }
    atencionesCache.current.clear();
    referenciasCache.current.clear();
    setOpenAtenciones(null);
    setOpenReferencias(null);
    setPage(1);
    setApplied({ desde, hasta, consultorioId, medicoId, incAsistencial, incSisol, incSeguro });
  };

  // Etiquetas legibles de los filtros aplicados (encabezado de los Excel).
  const filtrosExport: EspExcelFiltros = useMemo(() => ({
    desde: applied.desde,
    hasta: applied.hasta,
    especialidad: applied.consultorioId != null
      ? (especialidades.find((e) => e.ConsultorioId === applied.consultorioId)?.Especialidad ?? String(applied.consultorioId))
      : 'Todas',
    especialista: applied.medicoId != null
      ? (especialistas.find((m) => m.MedicoId === applied.medicoId)?.Medico ?? String(applied.medicoId))
      : 'Todos',
    universo: universoLabel(applied),
  }), [applied, especialidades, especialistas]);

  const onExportResumen = async () => {
    setExportingResumen(true);
    try {
      const res = await contabilidadService.especialistasResumen({
        desde: applied.desde, hasta: applied.hasta,
        consultorioId: applied.consultorioId ?? undefined,
        medicoId: applied.medicoId ?? undefined,
        incAsistencial: applied.incAsistencial, incSisol: applied.incSisol, incSeguro: applied.incSeguro,
        tamanio: 0,
      });
      if (res.filas.length === 0) { toast('No hay datos para exportar'); return; }
      exportResumen(res.filas, filtrosExport);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al exportar');
    } finally {
      setExportingResumen(false);
    }
  };

  // ---- loaders con cache para los modales (viven en el page; D1) ----
  const loadAtencionesPage = useCallback(async (mid: number, pagina: number): Promise<EspecialistaAtencionesResponse> => {
    const key = `${mid}|${pagina}`;
    const hit = atencionesCache.current.get(key);
    if (hit) return hit;
    const res = await contabilidadService.especialistasAtenciones(mid, {
      desde: applied.desde, hasta: applied.hasta,
      consultorioId: applied.consultorioId ?? undefined,
      incAsistencial: applied.incAsistencial, incSisol: applied.incSisol, incSeguro: applied.incSeguro,
      pagina, tamanio: 50,
    });
    atencionesCache.current.set(key, res);
    return res;
  }, [applied]);

  const loadAtencionesAll = useCallback(async (mid: number) => {
    const res = await contabilidadService.especialistasAtenciones(mid, {
      desde: applied.desde, hasta: applied.hasta,
      consultorioId: applied.consultorioId ?? undefined,
      incAsistencial: applied.incAsistencial, incSisol: applied.incSisol, incSeguro: applied.incSeguro,
      tamanio: 0,
    });
    return res.filas;
  }, [applied]);

  const loadReferenciasPage = useCallback(async (mid: number, pagina: number): Promise<EspecialistaReferenciasResponse> => {
    const key = `${mid}|${pagina}`;
    const hit = referenciasCache.current.get(key);
    if (hit) return hit;
    const res = await contabilidadService.especialistasReferencias(mid, {
      desde: applied.desde, hasta: applied.hasta,
      incAsistencial: applied.incAsistencial, incSisol: applied.incSisol, incSeguro: applied.incSeguro,
      pagina, tamanio: 50,
    });
    referenciasCache.current.set(key, res);
    return res;
  }, [applied]);

  const loadReferenciasAll = useCallback(async (mid: number) => {
    const res = await contabilidadService.especialistasReferencias(mid, {
      desde: applied.desde, hasta: applied.hasta,
      incAsistencial: applied.incAsistencial, incSisol: applied.incSisol, incSeguro: applied.incSeguro,
      tamanio: 0,
    });
    return res.filas;
  }, [applied]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-emerald-600" /> Especialistas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Actividad de los especialistas por rango de atención: atenciones, referencias y referencias efectivas.</p>
        </div>
        <button
          onClick={onExportResumen}
          disabled={exportingResumen}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[#217346] hover:bg-[#1a5c38] disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> {exportingResumen ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Especialidad</label>
          <select
            value={consultorioId == null ? '' : String(consultorioId)}
            onChange={(e) => onEspecialidadChange(e.target.value === '' ? null : Number(e.target.value))}
            disabled={loadingFiltros}
            className={`${selCls} w-64`}
          >
            <option value="">(todas)</option>
            {especialidades.map((e) => (
              <option key={e.ConsultorioId} value={e.ConsultorioId}>{e.Especialidad}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Especialista</label>
          <select
            value={medicoId == null ? '' : String(medicoId)}
            onChange={(e) => setMedicoId(e.target.value === '' ? null : Number(e.target.value))}
            disabled={loadingFiltros}
            className={`${selCls} w-72`}
          >
            <option value="">(todos)</option>
            {especialistaOptions.map((m) => (
              <option key={m.MedicoId} value={m.MedicoId}>{m.Medico} ({m.UserName})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={selCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={selCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Universo de ventas</label>
          <div className="flex items-center gap-3 h-[38px]">
            <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none">
              <input type="checkbox" checked={incAsistencial} onChange={(e) => setIncAsistencial(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              Asistencial
            </label>
            <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none">
              <input type="checkbox" checked={incSisol} onChange={(e) => setIncSisol(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              SISOL
            </label>
            <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none">
              <input type="checkbox" checked={incSeguro} onChange={(e) => setIncSeguro(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              Seguro
            </label>
          </div>
        </div>
        <button
          onClick={buscar}
          disabled={ningunUniverso}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold ${ningunUniverso ? 'bg-emerald-600/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          <Search className="h-4 w-4" /> Buscar
        </button>
        {ningunUniverso && (
          <p className="w-full text-xs text-rose-500">Seleccione al menos un universo de ventas (Asistencial, SISOL o Seguro).</p>
        )}
      </div>

      {/* bandeja */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2">Especialidad</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Médico</th>
              <th className="px-3 py-2">Colegiatura</th>
              <th className="px-3 py-2 text-right"># Atenciones</th>
              <th className="px-3 py-2 text-right">
                <span className="inline-flex items-center gap-1" title="Las referencias no se filtran por especialidad (el consultorio registrado es el destino).">
                  # Referencias <Info className="h-3.5 w-3.5 text-slate-400" />
                </span>
              </th>
              <th className="px-3 py-2 text-right"># Ref. efectivas</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loadingResumen && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">Cargando...</td></tr>}
            {!loadingResumen && filas.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">Sin especialistas para el filtro seleccionado</td></tr>}
            {!loadingResumen && filas.map((r) => {
              const pct = r.NumReferencias > 0 ? (r.NumReferenciasEfectivas / r.NumReferencias) * 100 : null;
              return (
                <tr key={r.MedicoId} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-3 py-2">{especialidadLabel(r)}</td>
                  <td className="px-3 py-2 text-slate-500">{r.UserName}</td>
                  <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{r.Medico}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{r.Colegiatura}</td>
                  <td className="px-3 py-2 text-right">{r.NumAtenciones}</td>
                  <td className="px-3 py-2 text-right">{r.NumReferencias}</td>
                  <td className="px-3 py-2 text-right">
                    {r.NumReferenciasEfectivas}
                    {pct != null && <span className="ml-1 text-xs text-slate-400">({pct.toFixed(1)}%)</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Ver Atenciones"
                        disabled={r.NumAtenciones === 0}
                        onClick={() => setOpenAtenciones(r)}
                        className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <ClipboardList className="h-4 w-4 text-emerald-600" />
                      </button>
                      <button
                        title="Ver Referencias"
                        disabled={r.NumReferencias === 0}
                        onClick={() => setOpenReferencias(r)}
                        className="p-1.5 rounded hover:bg-sky-100 dark:hover:bg-sky-900/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Share2 className="h-4 w-4 text-sky-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* paginacion server-side (25) */}
      <div className="flex items-center justify-between mt-3 text-sm text-slate-500 dark:text-slate-400">
        <span>{total} especialistas</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1 || loadingResumen} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span>Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages || loadingResumen} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* modales lazy (key por medico -> estado fresco por apertura; el cache del page hace el reabrir instantaneo) */}
      {openAtenciones && (
        <ModalAtenciones
          key={`at-${openAtenciones.MedicoId}`}
          medico={openAtenciones}
          filtrosExport={filtrosExport}
          loadPage={loadAtencionesPage}
          loadAll={loadAtencionesAll}
          onClose={() => setOpenAtenciones(null)}
        />
      )}
      {openReferencias && (
        <ModalReferencias
          key={`re-${openReferencias.MedicoId}`}
          medico={openReferencias}
          filtrosExport={filtrosExport}
          loadPage={loadReferenciasPage}
          loadAll={loadReferenciasAll}
          onClose={() => setOpenReferencias(null)}
        />
      )}
    </div>
  );
};

export default Especialistas;
