import React, { useEffect, useState } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import type { FormaPagoRow } from '../../../services/contabilidad/contaTypes';

// Filtro por medio de pago (vision de liquidez) para Caja Diaria y Flujo Consolidado.
// UX del card de filtros de FlujoCaja (checkbox-group + Todos + guard anti-vacio + Aplicar,
// NO recarga por clic) con el skin conta de Egresos (rounded-xl border slate / emerald).
// El "Incluir cobranzas de credito" es un control SEPARADO (D3): credito NO es un medio de pago.

interface Props {
  medios: FormaPagoRow[];                                        // catalogo dinamico
  seleccion: number[];                                           // ids aplicados actualmente
  incluirCredito: boolean;                                       // aplicado actualmente
  onAplicar: (seleccion: number[], incluirCredito: boolean) => void;
}

// Etiqueta amigable: "EFECTIVO SOLES" -> "Efectivo", resto capitalizado por palabra.
const etiqueta = (fp: string): string => {
  const up = fp.trim().toUpperCase();
  if (up === 'EFECTIVO SOLES') return 'Efectivo';
  return fp.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const MediosPagoFilterCard: React.FC<Props> = ({ medios, seleccion, incluirCredito, onAplicar }) => {
  const [abierto, setAbierto] = useState(false);
  // Estado BORRADOR: se edita sin recargar; solo "Aplicar" lo publica hacia la pantalla.
  const [draft, setDraft] = useState<number[]>(seleccion);
  const [draftCredito, setDraftCredito] = useState<boolean>(incluirCredito);

  // Re-sincroniza el borrador cuando cambia el filtro aplicado (p.ej. al cargar el catalogo).
  useEffect(() => { setDraft(seleccion); }, [seleccion]);
  useEffect(() => { setDraftCredito(incluirCredito); }, [incluirCredito]);

  const todosMarcados = medios.length > 0 && draft.length === medios.length;

  const toggleMedio = (id: number, checked: boolean) => {
    setDraft((prev) => {
      const next = checked ? [...prev, id] : prev.filter((x) => x !== id);
      return next.length === 0 ? prev : next; // guard anti-vacio (patron FlujoCaja)
    });
  };
  const toggleTodos = (checked: boolean) => {
    if (checked) setDraft(medios.map((m) => m.i_IdFormaPago));
    // desmarcar "Todos" dejaria 0 medios -> bloqueado por el guard anti-vacio
  };

  const sinCambios =
    draft.length === seleccion.length &&
    draft.every((x) => seleccion.includes(x)) &&
    draftCredito === incluirCredito;

  const aplicar = () => {
    if (draft.length === 0) return; // guard
    onAplicar(draft, draftCredito);
    setAbierto(false);
  };

  // Resumen del estado APLICADO (no del borrador) para la cabecera colapsada.
  const resumenMedios =
    medios.length > 0 && seleccion.length === medios.length ? 'todos' : `${seleccion.length} de ${medios.length}`;

  return (
    <div className="mb-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Filter className="h-4 w-4 text-emerald-600" /> Medios de pago
        </span>
        <span className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Medios: {resumenMedios} · Crédito: {incluirCredito ? 'sí' : 'no'}</span>
          {abierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {abierto && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700/60">
          {/* Todos */}
          <label className="flex items-center gap-2 py-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={todosMarcados}
              onChange={(e) => toggleTodos(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Todos</span>
          </label>

          {/* Grupo de medios */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 pl-1">
            {medios.length === 0 && (
              <span className="text-xs text-slate-400 py-1 col-span-full">Cargando medios…</span>
            )}
            {medios.map((m) => (
              <label key={m.i_IdFormaPago} className="flex items-center gap-2 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.includes(m.i_IdFormaPago)}
                  onChange={(e) => toggleMedio(m.i_IdFormaPago, e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{etiqueta(m.FormaPago)}</span>
              </label>
            ))}
          </div>

          {/* Credito: control SEPARADO visualmente (D3) */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draftCredito}
                onChange={(e) => setDraftCredito(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                <span className="text-sm text-slate-700 dark:text-slate-200">Incluir cobranzas de crédito</span>
                <span className="block text-[11px] text-slate-400">
                  Las cobranzas de ventas a crédito son dinero que SÍ entró a caja; apágalo para ver solo cobros de
                  ventas al contado.
                </span>
              </span>
            </label>
          </div>

          {/* Aplicar (no recarga por clic) */}
          <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            {draft.length === 0 && <span className="text-xs text-rose-500">Selecciona al menos un medio</span>}
            <button
              type="button"
              onClick={aplicar}
              disabled={draft.length === 0 || sinCambios}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediosPagoFilterCard;
