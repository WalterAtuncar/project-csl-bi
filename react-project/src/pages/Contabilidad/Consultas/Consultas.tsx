// /conta/consultas — Consulta a la BD en LENGUAJE NATURAL (NL2SQL). PLAN_NLQ_CONTA §5 (F6).
// Todo el pipeline de IA vive server-side en el API conta (5090); AQUI el front SOLO habla con
// ContabilidadService (conta_token): sin SDK de IA en el navegador, sin key en el front, sin el cliente
// del API legacy. Roles (D9): la ven SA/CONTABILIDAD/GERENTE; guardar/borrar solo SA/CONTABILIDAD (canWrite).
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Sparkles, Send, Loader2, ChevronDown, ChevronRight, Code2, Database,
  AlertTriangle, Save, Gauge, Cpu,
} from 'lucide-react';
import contabilidadService from '../../../services/contabilidad/ContabilidadService';
import { useContaAuth } from '../../../context/ContaAuthContext';
import type {
  NlqCelda, NlqChartTipo, NlqColumna, NlqGuardada, NlqRespuesta,
} from '../../../services/contabilidad/contaTypes';
import NlqResultTable from './NlqResultTable';
import NlqChart from './NlqChart';
import GuardarConsultaDialog from './GuardarConsultaDialog';
import GuardadasPanel from './GuardadasPanel';

// Estado normalizado del panel de resultado (unifica lo que devuelve preguntar y ejecutar-guardada).
interface Resultado {
  columnas: NlqColumna[];
  filas: NlqCelda[][];
  chartTipo: NlqChartTipo;
  origen: 'pregunta' | 'guardada';
  sql?: string;
  confianza?: number;
  fuente?: string;
  tokens?: number;
  advertencia?: string | null;
  titulo?: string; // nombre de la guardada
}

const FUENTE_LABEL: Record<string, string> = {
  generado: 'Generado por IA', cache_sem: 'Caché semántico', cache_guardada: 'Consulta guardada',
};

const statusDe = (e: unknown): number | undefined => (e as { status?: number } | undefined)?.status;

const fmtTokens = (n: number): string =>
  n <= 0 ? '0 tokens' : n >= 1000 ? `${(n / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })}k tokens` : `${n} tokens`;

const confianzaCls = (c: number): string =>
  c >= 0.8 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : c >= 0.5 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
      : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';

const Consultas: React.FC = () => {
  const { canWrite } = useContaAuth();

  const [pregunta, setPregunta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [respError, setRespError] = useState<{ mensaje: string; sql: string } | null>(null);
  const [sqlAbierto, setSqlAbierto] = useState(false);
  const [dialogo, setDialogo] = useState(false);
  const [moduloNoDisponible, setModuloNoDisponible] = useState(false);

  const [guardadas, setGuardadas] = useState<NlqGuardada[]>([]);
  const [loadingGuardadas, setLoadingGuardadas] = useState(true);
  const [ejecutandoId, setEjecutandoId] = useState<number | null>(null);

  // Mapeo de errores HTTP a UX (el interceptor adjunta .status al Error): 404 = modulo apagado,
  // 429 = throttle/presupuesto (mensaje amable), resto = message del API (incl. 400 pregunta invalida).
  const manejarError = useCallback((e: unknown) => {
    const st = statusDe(e);
    if (st === 404) { setModuloNoDisponible(true); return; }
    if (st === 429) { toast.error('Límite de consultas alcanzado. Intenta de nuevo en unos minutos.'); return; }
    toast.error(e instanceof Error ? e.message : 'Ocurrió un error al procesar la consulta');
  }, []);

  const loadGuardadas = useCallback(async () => {
    setLoadingGuardadas(true);
    try {
      setGuardadas(await contabilidadService.nlqListarGuardadas());
    } catch (e) {
      if (statusDe(e) === 404) setModuloNoDisponible(true);
      // otros errores al montar: panel vacio, sin toast intrusivo.
    } finally {
      setLoadingGuardadas(false);
    }
  }, []);

  useEffect(() => { loadGuardadas(); }, [loadGuardadas]);

  const ask = useCallback(async () => {
    const q = pregunta.trim();
    if (!q) { toast.error('Escribe una pregunta'); return; }
    setCargando(true);
    setResultado(null);
    setRespError(null);
    setSqlAbierto(false);
    try {
      const r: NlqRespuesta = await contabilidadService.nlqPreguntar(q);
      if (r.Error) {
        // Validador rechazo / confianza baja: se muestra el error legible + SQL para diagnostico, sin filas.
        setRespError({ mensaje: r.Error, sql: r.Sql ?? '' });
        setSqlAbierto(true);
      } else {
        setResultado({
          columnas: r.Columnas ?? [],
          filas: r.Filas ?? [],
          chartTipo: r.ChartSugerido ?? 'tabla',
          origen: 'pregunta',
          sql: r.Sql,
          confianza: r.Confianza,
          fuente: r.Fuente,
          tokens: (r.TokensIn ?? 0) + (r.TokensOut ?? 0),
          advertencia: r.Advertencia,
        });
      }
    } catch (e) {
      manejarError(e);
    } finally {
      setCargando(false);
    }
  }, [pregunta, manejarError]);

  const ejecutarGuardada = useCallback(async (g: NlqGuardada) => {
    setEjecutandoId(g.Id);
    setRespError(null);
    try {
      const d = await contabilidadService.nlqEjecutarGuardada(g.Id);
      setResultado({
        columnas: d.Columnas ?? [],
        filas: d.Filas ?? [],
        chartTipo: d.ChartTipo ?? g.ChartTipo ?? 'tabla',
        origen: 'guardada',
        titulo: g.Nombre,
        advertencia: g.DesactualizadaFlag
          ? 'Esta consulta puede estar desactualizada: el esquema de datos cambió desde que se guardó.'
          : null,
      });
    } catch (e) {
      manejarError(e);
    } finally {
      setEjecutandoId(null);
    }
  }, [manejarError]);

  const borrarGuardada = useCallback(async (g: NlqGuardada) => {
    if (!window.confirm(`¿Borrar la consulta guardada "${g.Nombre}"?`)) return;
    try {
      await contabilidadService.nlqBorrarGuardada(g.Id);
      toast.success('Consulta borrada');
      setGuardadas((prev) => prev.filter((x) => x.Id !== g.Id));
    } catch (e) {
      manejarError(e);
    }
  }, [manejarError]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter = consultar (Enter solo salta linea).
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ask(); }
  };

  // ---- Modulo apagado (flag Nlq:Enabled=false => 404) ----
  if (moduloNoDisponible) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-lg mt-10 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
          <Database className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Módulo no disponible</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            La consulta en lenguaje natural no está habilitada en este entorno. Contacta al administrador si
            crees que deberías tener acceso.
          </p>
        </div>
      </div>
    );
  }

  const puedeGuardar = !!resultado && resultado.origen === 'pregunta' && !!resultado.sql && canWrite;

  return (
    <div className="p-6">
      {/* Encabezado */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-sm">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Consulta en lenguaje natural</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pregunta por tus datos en español; la IA genera y ejecuta el SQL de solo lectura por ti.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* Columna principal */}
        <div className="space-y-4 min-w-0">
          {/* Caja de pregunta */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <textarea
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              onKeyDown={onKeyDown}
              rows={3}
              maxLength={1000}
              placeholder="Ej.: ventas por unidad de junio 2026, o el flujo de caja cobrado por mes este año"
              className="w-full resize-y rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">Ctrl + Enter para consultar</span>
              <button
                onClick={ask}
                disabled={cargando || !pregunta.trim()}
                className="px-4 py-2 rounded-lg text-sm bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60 flex items-center gap-2"
              >
                {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {cargando ? 'Generando…' : 'Consultar'}
              </button>
            </div>
          </div>

          {/* Estado de carga tolerante (Opus puede tardar) */}
          {cargando && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
              <Loader2 className="h-7 w-7 mx-auto animate-spin text-sky-500 mb-3" />
              <p className="text-sm text-slate-600 dark:text-slate-300">Generando la consulta…</p>
              <p className="text-xs text-slate-400 mt-1">Esto puede tardar unos segundos.</p>
            </div>
          )}

          {/* Error del pipeline (con SQL a la vista para diagnostico) */}
          {!cargando && respError && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4">
              <div className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{respError.mensaje}</span>
              </div>
              {respError.sql && <SqlBox sql={respError.sql} abierto={sqlAbierto} onToggle={() => setSqlAbierto((v) => !v)} />}
            </div>
          )}

          {/* Resultado */}
          {!cargando && resultado && (
            <div className="space-y-4">
              {/* Chips + acciones */}
              <div className="flex flex-wrap items-center gap-2">
                {resultado.origen === 'guardada' && resultado.titulo && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 font-medium">
                    {resultado.titulo}
                  </span>
                )}
                {typeof resultado.confianza === 'number' && (
                  <span className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${confianzaCls(resultado.confianza)}`}>
                    <Gauge className="h-3.5 w-3.5" /> Confianza {Math.round(resultado.confianza * 100)}%
                  </span>
                )}
                {resultado.fuente && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {FUENTE_LABEL[resultado.fuente] ?? resultado.fuente}
                  </span>
                )}
                {typeof resultado.tokens === 'number' && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5" /> {fmtTokens(resultado.tokens)}
                  </span>
                )}
                <div className="ml-auto">
                  {puedeGuardar && (
                    <button
                      onClick={() => setDialogo(true)}
                      className="px-3 py-1.5 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" /> Guardar
                    </button>
                  )}
                </div>
              </div>

              {/* Advertencia (drift / confianza baja / desactualizada) */}
              {resultado.advertencia && (
                <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{resultado.advertencia}</span>
                </div>
              )}

              {/* Grafico automatico (recharts) segun ChartSugerido; 'tabla' o data que no encaja -> null */}
              {resultado.chartTipo !== 'tabla' && resultado.filas.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <NlqChart columnas={resultado.columnas} filas={resultado.filas} tipo={resultado.chartTipo} />
                </div>
              )}

              {/* Tabla */}
              <NlqResultTable columnas={resultado.columnas} filas={resultado.filas} />

              {/* SQL colapsable (solo para consultas generadas; construye confianza / caza alucinaciones) */}
              {resultado.origen === 'pregunta' && resultado.sql && (
                <SqlBox sql={resultado.sql} abierto={sqlAbierto} onToggle={() => setSqlAbierto((v) => !v)} />
              )}
            </div>
          )}

          {/* Estado inicial vacio */}
          {!cargando && !resultado && !respError && (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
              <Sparkles className="h-8 w-8 mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Escribe una pregunta sobre ventas, caja o rentabilidad para empezar.
              </p>
            </div>
          )}
        </div>

        {/* Panel lateral de guardadas */}
        <GuardadasPanel
          guardadas={guardadas}
          loading={loadingGuardadas}
          canWrite={canWrite}
          ejecutandoId={ejecutandoId}
          onEjecutar={ejecutarGuardada}
          onBorrar={borrarGuardada}
        />
      </div>

      {dialogo && resultado?.sql && (
        <GuardarConsultaDialog
          sql={resultado.sql}
          chartSugerido={resultado.chartTipo}
          onClose={() => setDialogo(false)}
          onSaved={() => { setDialogo(false); loadGuardadas(); }}
        />
      )}
    </div>
  );
};

// Bloque colapsable con el SQL generado (plegado por defecto). Monospace, scroll horizontal.
const SqlBox: React.FC<{ sql: string; abierto: boolean; onToggle: () => void }> = ({ sql, abierto, onToggle }) => (
  <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60"
    >
      {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      <Code2 className="h-4 w-4" /> SQL generado
    </button>
    {abierto && (
      <pre className="px-3 py-3 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 overflow-x-auto whitespace-pre font-mono">
        {sql}
      </pre>
    )}
  </div>
);

export default Consultas;
