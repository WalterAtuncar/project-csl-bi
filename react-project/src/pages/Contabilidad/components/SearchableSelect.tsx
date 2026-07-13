import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface SelectOption {
  value: number;
  label: string;
}

interface Props {
  value: number | null;
  options: SelectOption[];
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Clases del trigger (reusar el selCls de la pantalla para que luzca igual que los <select>). */
  className?: string;
}

// Normaliza para buscar sin distinguir may/min ni tildes.
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Select con buscador. Muestra SIEMPRE todos los elementos; la lista se limita a ~5 ítems
 * de alto y el resto queda scrolleable. Pensado para catálogos largos (p.ej. Tipo de gasto).
 * El panel se posiciona absoluto (el Modal de conta no tiene overflow-hidden, no se recorta).
 */
const SearchableSelect: React.FC<Props> = ({ value, options, onChange, placeholder = 'Seleccione...', disabled, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return options;
    return options.filter((o) => norm(o.label).includes(q));
  }, [options, query]);

  // Cerrar al hacer click fuera.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Al abrir: limpiar búsqueda, foco al input, resaltar el seleccionado (o el primero).
  useEffect(() => {
    if (!open) return;
    setQuery('');
    const idx = selected ? options.findIndex((o) => o.value === selected.value) : 0;
    setHighlight(idx < 0 ? 0 : idx);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setHighlight(0); }, [query]);

  // Mantener visible el ítem resaltado dentro del área scrolleable.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const choose = (o: SelectOption) => { onChange(o.value); setOpen(false); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlight]) choose(filtered[highlight]); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${className} flex items-center justify-between gap-2 text-left ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400'}`} title={selected ? selected.label : undefined}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-xl overflow-hidden">
          <div className="p-1.5 border-b border-slate-100 dark:border-slate-600">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Buscar..."
                className="w-full pl-7 pr-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          {/* Altura de ~5 ítems (≈33px c/u); el resto scrollea. */}
          <ul ref={listRef} className="max-h-[168px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400 text-center">Sin resultados</li>
            ) : (
              filtered.map((o, i) => (
                <li key={o.value}>
                  <button
                    type="button"
                    title={o.label}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(o)}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between gap-2
                      ${i === highlight ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}
                      ${o.value === value ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-slate-700 dark:text-slate-200'}`}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
