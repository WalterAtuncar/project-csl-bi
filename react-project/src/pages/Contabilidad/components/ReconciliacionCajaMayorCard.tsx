import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheck, CheckCircle2, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, History,
} from 'lucide-react';
import contabilidadService from '../../../services/contabilidad/ContabilidadService';
import type { ReconEstadoResponse, ReconLogRow } from '../../../services/contabilidad/contaTypes';
import { useContaAuth } from '../../../context/ContaAuthContext';

// Indicador del estado de la RECONCILIACIÓN DE LA CAJA MAYOR LEGACY (dbo.cajamayor_*), mantenida por
// el BackgroundService del API conta (PLAN_RECONCILIACION_CIERRE_DIARIO — RESULTADOS FASE 2/3).
// IMPORTANTE: es una tubería DISTINTA de la Caja Diaria del módulo conta; el rótulo lo deja claro.
// Vive con el JWT conta (usa contabilidadService / useContaAuth).

const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Timestamps: t_Inicio del log llega en hora local (reloj SQL = Lima, sin 'Z'); ProximoHorarioUtc
// llega en UTC (con 'Z'). new Date() interpreta cada caso según lleve o no zona, y toLocale* siempre
// imprime en la zona del navegador -> un mismo helper sirve para ambos.
const fmtHora = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};
const fmtFechaHora = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const fmtFecha = (iso?: string | null): string => (iso ? String(iso).slice(0, 10) : '—');

// Color por resultado de la corrida (v_Resultado del log).
const resultadoTone = (r?: string): string => {
  switch ((r || '').toUpperCase()) {
    case 'OK': return 'text-emerald-600 dark:text-emerald-400';
    case 'OK_SIN_CAMBIOS': return 'text-slate-500 dark:text-slate-400';
    case 'DERIVA_DETECTADA': return 'text-amber-600 dark:text-amber-400';
    case 'ERROR': return 'text-rose-600 dark:text-rose-400';
    case 'SKIPPED_LOCK': return 'text-slate-400 dark:text-slate-500';
    default: return 'text-slate-600 dark:text-slate-300';
  }
};

// Badge de estado por día (máquina de estados §3 del plan).
const estadoBadge = (estado?: string): string => {
  switch ((estado || '').toUpperCase()) {
    case 'CERRADO': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    case 'RECONCILIADO': return 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800';
    case 'REABIERTO_AUTO': return 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800';
    case 'PENDIENTE': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    default: return 'bg-slate-50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
  }
};

const esObservacion = (modo?: string) => (modo || '').toUpperCase().startsWith('OBSERV');

// Resumen legible de la corrida para el toast (v_Detalle es JSON-like en texto plano).
const resumenCorrida = (fila?: ReconLogRow): string => {
  if (!fila) return '';
  if (!fila.v_Detalle) return '';
  try {
    const d = JSON.parse(fila.v_Detalle) as Record<string, unknown>;
    const partes: string[] = [];
    if (d.diasTocados != null) partes.push(`${d.diasTocados} día(s)`);
    if (d.diasCurados != null && Number(d.diasCurados) > 0) partes.push(`${d.diasCurados} curado(s)`);
    return partes.join(' · ');
  } catch {
    return '';
  }
};

const ReconciliacionCajaMayorCard: React.FC = () => {
  const { canWrite } = useContaAuth();
  const [estado, setEstado] = useState<ReconEstadoResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [reconciliando, setReconciliando] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(false);
    try {
      const data = await contabilidadService.reconciliacionEstado(25, 35);
      setEstado(data);
    } catch {
      // Silencioso en el montaje (no bloquear la pantalla si el API es viejo / endpoint ausente).
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const reconciliarAhora = async () => {
    setReconciliando(true);
    try {
      const corrida = await contabilidadService.reconciliarCaja({});
      const tick = corrida.Corrida?.find((r) => r.v_Accion === 'TICK') ?? corrida.Corrida?.[corrida.Corrida.length - 1];
      const detalle = resumenCorrida(tick);
      const cola = detalle ? ` · ${detalle}` : '';
      if (esObservacion(corrida.Modo)) {
        toast(`Reconciliación en OBSERVACIÓN: ${tick?.v_Resultado ?? 'OK'}${cola} (sin escrituras)`);
      } else {
        toast.success(`Reconciliación (Escritura): ${tick?.v_Resultado ?? 'OK'}${cola}`);
      }
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo reconciliar la caja mayor');
    } finally {
      setReconciliando(false);
    }
  };

  const config = estado?.Config;
  const ultima = estado?.Corridas?.[0];
  const dias = useMemo(() => (estado?.Dias ?? []).slice(0, 8), [estado]);

  // Estado de error/no disponible: card compacta y discreta, con reintento (no alarma al usuario).
  if (error && !estado) {
    return (
      <div className="mb-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4 text-slate-400" /> Reconciliación caja mayor: estado no disponible
        </span>
        <button
          type="button"
          onClick={cargar}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Título + rótulo aclaratorio (NO confundir con la Caja Diaria conta) */}
        <div className="flex items-center gap-2 mr-auto">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reconciliación caja mayor</div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              Cierres de caja mayor reconciliados automáticamente. Tubería distinta de la Caja Diaria.
            </div>
          </div>
        </div>

        {cargando && !estado ? (
          <span className="text-xs text-slate-400">Cargando estado…</span>
        ) : (
          <>
            {/* Enabled */}
            <span className={`text-[11px] font-medium px-2 py-1 rounded-full border ${config?.Enabled
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
              {config?.Enabled ? 'Activo' : 'Apagado'}
            </span>

            {/* Modo */}
            <span className={`text-[11px] font-medium px-2 py-1 rounded-full border ${esObservacion(config?.Modo)
              ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              : 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800'}`}>
              {esObservacion(config?.Modo) ? 'Observación' : 'Escritura'}
            </span>

            {/* Última corrida */}
            <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <History className="h-3.5 w-3.5" />
              Última: {ultima ? fmtFechaHora(ultima.t_Inicio) : '—'}
              {ultima && (
                <span className={`font-semibold ${resultadoTone(ultima.v_Resultado)}`}>{ultima.v_Resultado}</span>
              )}
            </span>

            {/* Próxima corrida (solo si Enabled) */}
            {config?.Enabled && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                Próxima: {config.ProximoHorarioUtc ? fmtHora(config.ProximoHorarioUtc) : '—'}
              </span>
            )}

            {/* Reconciliar ahora: operador completo (SA + CONTABILIDAD) */}
            {canWrite && (
              <button
                type="button"
                onClick={reconciliarAhora}
                disabled={reconciliando}
                title={esObservacion(config?.Modo)
                  ? 'La configuración está en Observación: la corrida no escribirá en la caja mayor'
                  : 'Ejecuta una corrida de reconciliación ahora'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-xs font-semibold"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reconciliando ? 'animate-spin' : ''}`} />
                {reconciliando ? 'Reconciliando…' : 'Reconciliar ahora'}
              </button>
            )}

            {/* Toggle mini-lista de días */}
            {dias.length > 0 && (
              <button
                type="button"
                onClick={() => setDetalleAbierto((v) => !v)}
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Días {detalleAbierto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </>
        )}
      </div>

      {/* Mini-lista de los últimos días con su estado y totales */}
      {detalleAbierto && dias.length > 0 && (
        <div className="px-4 pb-3 border-t border-slate-100 dark:border-slate-700/60">
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="text-left text-slate-400 dark:text-slate-500">
                <th className="py-1 pr-2 font-medium">Día</th>
                <th className="py-1 pr-2 font-medium">Estado</th>
                <th className="py-1 pr-2 font-medium text-right">Ingresos</th>
                <th className="py-1 pr-2 font-medium text-right">Egresos</th>
                <th className="py-1 font-medium text-right">Últ. corrida</th>
              </tr>
            </thead>
            <tbody>
              {dias.map((d) => (
                <tr key={d.d_Fecha} className="border-t border-slate-50 dark:border-slate-700/40">
                  <td className="py-1 pr-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtFecha(d.d_Fecha)}</td>
                  <td className="py-1 pr-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${estadoBadge(d.v_Estado)}`}>
                      {d.v_Estado}{d.n_Version > 1 ? ` v${d.n_Version}` : ''}
                    </span>
                  </td>
                  <td className="py-1 pr-2 text-right text-sky-600 dark:text-sky-400 tabular-nums">
                    {d.d_TotalIngresos ? money(d.d_TotalIngresos) : '—'}
                  </td>
                  <td className="py-1 pr-2 text-right text-rose-500 tabular-nums">
                    {d.d_TotalEgresos ? money(d.d_TotalEgresos) : '—'}
                  </td>
                  <td className="py-1 text-right text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    {fmtHora(d.t_UltimaReconciliacion)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ultima && (ultima.v_Resultado || '').toUpperCase() === 'DERIVA_DETECTADA' && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" /> La última corrida detectó deriva y recerró día(s) automáticamente.
            </div>
          )}
          {ultima && (ultima.v_Resultado || '').toUpperCase() === 'OK' && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Última corrida OK.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReconciliacionCajaMayorCard;
