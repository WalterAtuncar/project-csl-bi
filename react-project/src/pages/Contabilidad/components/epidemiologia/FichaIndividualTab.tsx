// TAB 1 — Ficha Individual EPI. Grid paginada server-side (50) con las 25 columnas del formato DIRESA
// + exportación a Excel (llama /ficha/export, arma el .xlsx con SheetJS). Maneja el 413 ("acota el rango")
// y el empty-state informativo para el ámbito HOSPITALIZACION (sin diagnósticos en el repositorio de dx).
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import contabilidadService from '../../../../services/contabilidad/ContabilidadService';
import type { EpiFichaRow } from '../../../../services/contabilidad/contaTypes';
import type { EpiFiltro } from './FiltroEpidemiologiaCard';
import { exportarFichaEpi } from './excelFicha';
import { fmtFecha, nInt } from './epiHelpers';

const PAGE_SIZE = 50;

// Cabeceras para pantalla (legibles). El Excel usa las cabeceras EXACTAS del formato (ver excelFicha.ts).
const COLS: { key: keyof EpiFichaRow; label: string; className?: string }[] = [
  { key: 'CodigoUnico', label: 'Código Único', className: 'font-mono text-xs whitespace-nowrap' },
  { key: 'FechaAtencion', label: 'F. Atención', className: 'whitespace-nowrap' },
  { key: 'ApellidoPaterno', label: 'Ap. Paterno' },
  { key: 'ApellidoMaterno', label: 'Ap. Materno' },
  { key: 'Nombres', label: 'Nombres' },
  { key: 'Red', label: 'RED' },
  { key: 'TipoDocumento', label: 'Tipo Doc.' },
  { key: 'NumeroDocumento', label: 'N° Doc.', className: 'whitespace-nowrap' },
  { key: 'FechaNacimiento', label: 'F. Nac.', className: 'whitespace-nowrap' },
  { key: 'Sexo', label: 'Sexo' },
  { key: 'Nacionalidad', label: 'Nacionalidad' },
  { key: 'Etnia', label: 'Etnia' },
  { key: 'HistoriaClinica', label: 'N° H.C.', className: 'whitespace-nowrap' },
  { key: 'FechaHospitalizacion', label: 'F. Hosp.', className: 'whitespace-nowrap' },
  { key: 'Edad', label: 'Edad', className: 'text-right' },
  { key: 'Pais', label: 'País' },
  { key: 'Departamento', label: 'Departamento' },
  { key: 'Provincia', label: 'Provincia' },
  { key: 'Distrito', label: 'Distrito' },
  { key: 'Procedencia', label: 'Procedencia' },
  { key: 'DireccionExacta', label: 'Dirección exacta' },
  { key: 'Referencia', label: 'Referencia' },
  { key: 'Diagnostico', label: 'Diagnóstico', className: 'min-w-[280px]' },
  { key: 'InicioSintomas', label: 'Inicio de síntomas' },
  { key: 'InicioSintomasDup', label: 'Inicio de síntomas' },
];

const DATE_KEYS = new Set<keyof EpiFichaRow>(['FechaAtencion', 'FechaNacimiento', 'FechaHospitalizacion']);

const FichaIndividualTab: React.FC<{ filtro: EpiFiltro }> = ({ filtro }) => {
  const [items, setItems] = useState<EpiFichaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const esHospitalizacion = filtro.ambito === 'HOSPITALIZACION';

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await contabilidadService.epiFicha({
        desde: filtro.desde, hasta: filtro.hasta, ambito: filtro.ambito,
        soloConDx: filtro.soloConDx, incluirDescartados: filtro.incluirDescartados,
        page: p, pageSize: PAGE_SIZE,
      });
      setItems(res.items);
      setTotal(res.totalFilas);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cargar la ficha');
      setItems([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  // Al cambiar el filtro: siempre volver a la página 1 y recargar (un solo fetch).
  useEffect(() => { setPage(1); load(1); }, [load]);

  const goPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
    load(p);
  };

  const exportar = async () => {
    setExporting(true);
    try {
      const res = await contabilidadService.epiFichaExport({
        desde: filtro.desde, hasta: filtro.hasta, ambito: filtro.ambito,
        soloConDx: filtro.soloConDx, incluirDescartados: filtro.incluirDescartados,
      });
      if (!res.items.length) { toast('No hay filas para exportar en el rango.', { icon: 'ℹ️' }); return; }
      exportarFichaEpi(res.items, `${filtro.desde}_a_${filtro.hasta}`);
      toast.success(`Exportadas ${nInt(res.totalFilas)} filas`);
    } catch (e) {
      // El 413 llega normalizado como Error(message) con el texto "acota el rango".
      toast.error(e instanceof Error ? e.message : 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {loading ? 'Cargando…' : <><span className="font-semibold text-slate-700 dark:text-slate-200">{nInt(total)}</span> atenciones</>}
        </div>
        <button
          onClick={exportar}
          disabled={exporting || loading}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold ${exporting || loading ? 'bg-emerald-600/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          <Download className="h-4 w-4" /> {exporting ? 'Exportando…' : 'Exportar a Excel'}
        </button>
      </div>

      {esHospitalizacion && (
        <div className="mb-3 flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>El módulo de hospitalización no registra diagnósticos en el repositorio de dx: la columna «Diagnóstico» aparecerá vacía. Use «Todos» o «Asistencial» para el análisis diagnóstico.</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40">
              {COLS.map((c, i) => (
                <th key={i} className="px-3 py-2 whitespace-nowrap font-medium">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={COLS.length} className="px-3 py-10 text-center text-slate-400">Cargando atenciones…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={COLS.length} className="px-3 py-10 text-center text-slate-400">Sin atenciones para el filtro seleccionado</td></tr>}
            {!loading && items.map((r, ri) => (
              <tr key={`${r.CodigoUnico}-${ri}`} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 align-top">
                {COLS.map((c, ci) => {
                  const raw = r[c.key];
                  const val = DATE_KEYS.has(c.key) ? fmtFecha(raw as string | null) : (raw ?? '');
                  return (
                    <td key={ci} className={`px-3 py-2 text-slate-700 dark:text-slate-200 ${c.className ?? ''}`}>
                      {val === '' || val == null ? <span className="text-slate-300 dark:text-slate-600">—</span> : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm text-slate-500 dark:text-slate-400">
        <span>{nInt(total)} filas · página {page} de {totalPages}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1 || loading} onClick={() => goPage(page - 1)} className="p-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700"><ChevronLeft className="h-4 w-4" /></button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages || loading} onClick={() => goPage(page + 1)} className="p-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
};

export default FichaIndividualTab;
