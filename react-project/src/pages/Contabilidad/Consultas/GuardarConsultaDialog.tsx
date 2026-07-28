import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Save, Loader2 } from 'lucide-react';
import contabilidadService from '../../../services/contabilidad/ContabilidadService';
import type { NlqChartTipo } from '../../../services/contabilidad/contaTypes';

const TIPOS: { v: NlqChartTipo; label: string }[] = [
  { v: 'bar', label: 'Barras' },
  { v: 'line', label: 'Líneas' },
  { v: 'pie', label: 'Torta' },
  { v: 'scatter', label: 'Dispersión' },
  { v: 'kpi', label: 'Indicador (KPI)' },
  { v: 'tabla', label: 'Solo tabla' },
];

interface Props {
  sql: string;
  chartSugerido: NlqChartTipo;
  onClose: () => void;
  onSaved: () => void;
}

// Dialogo de "Guardar consulta" (nombre, descripcion, tipo de chart). Guarda el SQL generado para
// re-ejecutarlo sin gastar tokens. Solo se monta cuando canWrite (SA/CONTABILIDAD); el API igual valida 403.
const GuardarConsultaDialog: React.FC<Props> = ({ sql, chartSugerido, onClose, onSaved }) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [chartTipo, setChartTipo] = useState<NlqChartTipo>(chartSugerido);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setGuardando(true);
    try {
      await contabilidadService.nlqGuardar({ Nombre: nombre.trim(), Descripcion: descripcion.trim(), Sql: sql, ChartTipo: chartTipo });
      toast.success('Consulta guardada');
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar la consulta');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Save className="h-4 w-4 text-emerald-600" /> Guardar consulta
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Nombre *</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={120}
              autoFocus
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              placeholder="Ventas por unidad — junio"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Descripción</span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={500}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              placeholder="Opcional"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tipo de gráfico</span>
            <select
              value={chartTipo}
              onChange={(e) => setChartTipo(e.target.value as NlqChartTipo)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
            >
              {TIPOS.map((t) => (
                <option key={t.v} value={t.v}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="px-4 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuardarConsultaDialog;
