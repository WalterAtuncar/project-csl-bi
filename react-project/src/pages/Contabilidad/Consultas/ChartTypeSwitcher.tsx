// Segmented control para intercambiar el tipo de grafico del resultado NLQ en vivo. Recibe SOLO los tipos
// compatibles con la forma del resultado (nlqFormat::tiposCompatibles); el activo se resalta (bg sky). Los
// iconos son de lucide-react (version 0.344 -> verificados en disco): cada boton lleva title (tooltip) con
// la etiqueta legible. NO persiste nada aca: el onChange decide (local para consulta sin guardar / PATCH
// para guardada; ver Consultas.tsx). Componente a nivel de modulo (no definido dentro de un render).
import React from 'react';
import {
  BarChart3, Layers, LineChart, AreaChart, PieChart, CircleDashed, Radar, ScatterChart, Gauge, Table,
  type LucideIcon,
} from 'lucide-react';
import type { NlqChartTipo } from '../../../services/contabilidad/contaTypes';

const META: Record<NlqChartTipo, { label: string; Icon: LucideIcon }> = {
  bar: { label: 'Barras', Icon: BarChart3 },
  stackedBar: { label: 'Barras apiladas', Icon: Layers },
  line: { label: 'Líneas', Icon: LineChart },
  area: { label: 'Área', Icon: AreaChart },
  pie: { label: 'Pastel', Icon: PieChart },
  donut: { label: 'Dona', Icon: CircleDashed },
  radar: { label: 'Radar', Icon: Radar },
  scatter: { label: 'Dispersión', Icon: ScatterChart },
  kpi: { label: 'Indicador', Icon: Gauge },
  tabla: { label: 'Tabla', Icon: Table },
};

interface Props {
  tipos: NlqChartTipo[];
  value: NlqChartTipo;
  onChange: (t: NlqChartTipo) => void;
  guardando?: boolean;
}

const ChartTypeSwitcher: React.FC<Props> = ({ tipos, value, onChange, guardando }) => (
  <div className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-1" role="group" aria-label="Tipo de gráfico">
    {tipos.map((t) => {
      const { label, Icon } = META[t];
      const activo = t === value;
      return (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          disabled={guardando}
          title={label}
          aria-label={label}
          aria-pressed={activo}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-60 ${
            activo
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      );
    })}
  </div>
);

export default ChartTypeSwitcher;
