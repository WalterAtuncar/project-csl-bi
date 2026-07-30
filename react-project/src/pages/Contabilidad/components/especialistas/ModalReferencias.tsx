import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { X, Download, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import type { EspecialistaReferencia, EspecialistaReferenciasResponse, EspecialistaResumen } from '../../../../services/contabilidad/contaTypes';
import { moneyPEN } from '../../../../utils/money';
import { exportReferencias, type EspExcelFiltros } from './excelEspecialistas';

const PAGE_SIZE = 50;

// YYYY-MM-DD / ISO datetime -> dd/mm/yyyy por SPLIT (nunca new Date('YYYY-MM-DD'): corre el dia en Lima).
const fmtFecha = (iso: string | null): string => {
  const [y, m, d] = (iso || '').slice(0, 10).split('-');
  if (!y || !m || !d) return iso || '—';
  return `${d}/${m}/${y}`;
};
const monto = (n: number | null): string => (n == null ? '—' : moneyPEN(n));

interface Props {
  medico: EspecialistaResumen;
  filtrosExport: EspExcelFiltros;
  // Carga paginada CON CACHE (el cache vive en el page, invalidado en cada Buscar; reabrir NO re-llama).
  loadPage: (medicoId: number, pagina: number) => Promise<EspecialistaReferenciasResponse>;
  // Dataset completo (tamanio=0) para el export; el server capea a 20k -> 400 {message} legible.
  loadAll: (medicoId: number) => Promise<EspecialistaReferencia[]>;
  onClose: () => void;
}

const ModalReferencias: React.FC<Props> = ({ medico, filtrosExport, loadPage, loadAll, onClose }) => {
  const [pagina, setPagina] = useState(1);
  const [filas, setFilas] = useState<EspecialistaReferencia[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loadPage(medico.MedicoId, pagina)
      .then((res) => { if (!alive) return; setFilas(res.filas); setTotal(res.total); })
      .catch((e) => { if (!alive) return; setError(e instanceof Error ? e.message : 'Error al cargar las referencias'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pagina, loadPage, medico.MedicoId]);

  const onExport = async () => {
    setExporting(true);
    try {
      const all = await loadAll(medico.MedicoId);
      if (all.length === 0) { toast('No hay referencias para exportar'); return; }
      exportReferencias(all, { UserName: medico.UserName, Medico: medico.Medico }, filtrosExport);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-[85vw] h-[60vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Share2 className="h-5 w-5 text-sky-600" /> Referencias · {medico.Medico}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {medico.UserName} · {fmtFecha(filtrosExport.desde)} a {fmtFecha(filtrosExport.hasta)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[#217346] hover:bg-[#1a5c38] disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> {exporting ? 'Exportando...' : 'Exportar Excel'}
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5 text-slate-400" /></button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col p-5">
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Consultorio destino</th>
                  <th className="px-3 py-2">Componentes referidos</th>
                  <th className="px-3 py-2">Médico ejecutor</th>
                  <th className="px-3 py-2 text-center">¿Efectiva?</th>
                  <th className="px-3 py-2">Nro Comprobante</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Cargando...</td></tr>}
                {!loading && error && <tr><td colSpan={7} className="px-3 py-8 text-center text-rose-500">{error}</td></tr>}
                {!loading && !error && filas.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Sin referencias en el rango</td></tr>}
                {!loading && !error && filas.map((r) => (
                  <tr key={r.ServiceId} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtFecha(r.FechaAtencion)}</td>
                    <td className="px-3 py-2">{r.ConsultorioDestino ?? '—'}</td>
                    <td className="px-3 py-2 max-w-xs truncate" title={r.ComponentesReferidos ?? ''}>{r.ComponentesReferidos ?? '—'}</td>
                    <td className="px-3 py-2 max-w-xs truncate" title={r.MedicoEjecutor ?? ''}>{r.MedicoEjecutor ?? '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${r.Efectiva ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                        {r.Efectiva ? 'SÍ' : 'NO'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.NroComprobante ?? '—'}
                      {r.TipoComprobante && <span className="ml-1 text-[10px] text-slate-400">{r.TipoComprobante}</span>}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{monto(r.MontoComprobante)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="shrink-0 flex items-center justify-between mt-3 text-sm text-slate-500 dark:text-slate-400">
            <span>{total} referencias</span>
            <div className="flex items-center gap-2">
              <button disabled={pagina <= 1 || loading} onClick={() => setPagina((p) => p - 1)} className="p-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <span>Página {pagina} de {totalPaginas}</span>
              <button disabled={pagina >= totalPaginas || loading} onClick={() => setPagina((p) => p + 1)} className="p-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalReferencias;
