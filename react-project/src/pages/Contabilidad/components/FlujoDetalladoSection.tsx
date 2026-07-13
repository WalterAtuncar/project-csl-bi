import React, { useMemo } from 'react';
import type { FlujoDetallado, FlujoMesRow } from '../../../services/contabilidad/contaTypes';
import { MESES, money, rowClass, cellBg } from './flujoShared';
import type { Row, RowKind } from './flujoShared';

interface Props {
  detalle: FlujoDetallado | null;
  resumen: FlujoMesRow[];   // del consolidado ya cargado (D1: unica fuente de totales/saldos)
  filtroActivo: boolean;
  loading: boolean;
}

// Unidades de ingreso en orden fijo (D8). Se emparejan por i_IdTipoCaja (dbo.tipocaja):
// 1 asistencial, 2 ocupacional, 5 seguros (solo credito, D3), 6 farmacia, 3 sisol.
const ING_UNITS: { id: number | null; label: string; soloCredito?: boolean }[] = [
  { id: 1, label: 'ASISTENCIAL' },
  { id: 2, label: 'OCUPACIONAL' },
  { id: 5, label: 'SEGUROS', soloCredito: true },
  { id: 6, label: 'FARMACIA' },
  { id: 3, label: 'SISOL' },
];

// Egresos de personal: unidades (por v_NombreTipoCaja) × 6 conceptos fijos (esqueleto UI; D6).
const PERS_UNITS: { unidad: string; label: string }[] = [
  { unidad: 'ATENCION_ASISTENCIAL', label: 'ASISTENCIAL' },
  { unidad: 'ATENCION_OCUPACIONAL', label: 'OCUPACIONAL' },
  { unidad: 'FARMACIA', label: 'FARMACIA' },
  { unidad: 'SISOL', label: 'SISOL' },
];
const CONCEPTOS = ['REMUNERACIONES', 'GRATIFICACIONES', 'CTS', 'UTILIDADES', 'BENEFICIOS SOCIALES', 'PERSONAL ADICIONAL'];

// Etiquetas de seccion (nodos raiz del catalogo conta.tipo_gasto). Las HOJAS salen del catalogo
// del backend (extensibles, D2); solo estos encabezados estructurales son fijos.
const SECCION_LABEL: Record<string, string> = {
  ADMIN: 'GASTOS ADMINISTRATIVOS',
  MEDICO: 'GASTOS MÉDICOS',
  TRIBUTOS: 'TRIBUTOS CORRIENTES + AFP',
  RENTA: 'IMPUESTO A LA RENTA + PARTICIPACIONES',
  INVERSION: 'EGRESOS DE INVERSIÓN',
  FINANCIAMIENTO: 'EGRESOS DE FINANCIAMIENTO',
  OTROS_EGRESOS: 'OTROS EGRESOS',
  OTROS_INGRESOS: 'OTROS INGRESOS',
};

const emptyMonths = () => new Array(12).fill(0) as number[];
const sumArr = (a: number[]) => a.reduce((s, x) => s + x, 0);
const prettyUnidad = (u: string) => u.replace(/^ATENCION[_ ]/i, '');
const indentClass = (lvl: number) => (['', 'pl-6', 'pl-9', 'pl-12'][lvl] ?? 'pl-12');

const FlujoDetalladoSection: React.FC<Props> = ({ detalle, resumen, filtroActivo, loading }) => {
  const rows = useMemo<Row[]>(() => {
    if (!detalle) return [];
    const ing = detalle.Ingresos ?? [];
    const personal = detalle.Personal ?? [];
    const egresos = detalle.Egresos ?? [];
    const catalogo = detalle.Catalogo ?? [];

    const out: Row[] = [];
    const push = (label: string, values: number[], kind: RowKind, indentLevel = 0, totalOverride?: number) =>
      out.push({ label, values, total: totalOverride ?? sumArr(values), kind, indentLevel });

    // Cola/saldos: unica fuente = Resumen del consolidado (D1).
    const byMes = new Map<number, FlujoMesRow>();
    resumen.forEach((r) => byMes.set(r.Mes, r));
    const val = (sel: (r: FlujoMesRow) => number) =>
      Array.from({ length: 12 }, (_, i) => sel(byMes.get(i + 1) || ({} as FlujoMesRow)) || 0);

    // ---------- INGRESOS OPERATIVOS (unidad × forma de pago + cobranzas credito) ----------
    // Formas de pago (contado) presentes, en el orden del catalogo grupo 46 (= i_IdFormaPago).
    const formaMap = new Map<number, string>();
    ing.forEach((x) => { if (!x.EsCredito && x.i_IdFormaPago != null && !formaMap.has(x.i_IdFormaPago)) formaMap.set(x.i_IdFormaPago, x.FormaPago); });
    const formas = [...formaMap.entries()].sort((a, b) => a[0] - b[0]).map(([id, nombre]) => ({ id, nombre }));

    const ingContado = (idTipoCaja: number | null, formaId: number) => {
      const m = emptyMonths();
      ing.forEach((x) => { if (!x.EsCredito && x.i_IdTipoCaja === idTipoCaja && x.i_IdFormaPago === formaId && x.Mes >= 1 && x.Mes <= 12) m[x.Mes - 1] += x.Monto; });
      return m;
    };
    const ingCredito = (idTipoCaja: number | null) => {
      const m = emptyMonths();
      ing.forEach((x) => { if (x.EsCredito && x.i_IdTipoCaja === idTipoCaja && x.Mes >= 1 && x.Mes <= 12) m[x.Mes - 1] += x.Monto; });
      return m;
    };

    push('INGRESOS OPERATIVOS', emptyMonths(), 'header');
    // Unidades fijas (D8) + extras (MTC/SEGUROS extra/SIN UNIDAD) solo si tienen movimiento.
    // i_IdTipoCaja NULL cuenta como bloque extra 'SIN UNIDAD'.
    const fixedIds = new Set<number | null>(ING_UNITS.map((u) => u.id));
    const extraIds: (number | null)[] = [];
    ing.forEach((x) => { if (!fixedIds.has(x.i_IdTipoCaja) && !extraIds.includes(x.i_IdTipoCaja)) extraIds.push(x.i_IdTipoCaja); });
    const extraUnits = extraIds
      .sort((a, b) => (a ?? 1e9) - (b ?? 1e9))
      .map((id) => {
        const nom = ing.find((x) => x.i_IdTipoCaja === id)?.Unidad ?? 'SIN UNIDAD';
        return { id, label: prettyUnidad(nom), extra: true as const };
      });

    for (const u of [...ING_UNITS, ...extraUnits]) {
      const creditoM = ingCredito(u.id);
      const anyCredito = sumArr(creditoM) !== 0;
      if ('soloCredito' in u && u.soloCredito) {
        if (!anyCredito) continue;           // SEGUROS solo aparece si hay credito (desaparece con credito OFF)
        push(u.label, emptyMonths(), 'header', 1);
        push(`COBRANZAS CRÉDITO ${u.label}`, creditoM, 'detail', 2);
        continue;
      }
      const contadoRows = formas.map((f) => ({ nombre: f.nombre, m: ingContado(u.id, f.id) }));
      const anyContado = contadoRows.some((r) => sumArr(r.m) !== 0);
      if ('extra' in u && u.extra && !anyContado && !anyCredito) continue;  // extras solo si != 0
      push(u.label, emptyMonths(), 'header', 1);
      contadoRows.forEach((r) => push(r.nombre, r.m, 'detail', 2));
      if (anyCredito) push(`COBRANZAS CRÉDITO ${u.label}`, creditoM, 'detail', 2);
    }
    // TOTAL INGRESOS OPERATIVOS = Σ de todos los ingresos (== fila TOTAL INGRESOS del consolidado, G1).
    const totIng = emptyMonths();
    ing.forEach((x) => { if (x.Mes >= 1 && x.Mes <= 12) totIng[x.Mes - 1] += x.Monto; });
    push('TOTAL INGRESOS OPERATIVOS', totIng, 'total');

    // ---------- EGRESOS OPERATIVOS ----------
    push('EGRESOS OPERATIVOS', emptyMonths(), 'header');

    // Egresos de personal: unidad × concepto (merge con Personal[]; hoy vacio -> todo '—').
    const persMonths = (unidad: string, concepto: string) => {
      const m = emptyMonths();
      personal.forEach((x) => { if (x.Unidad === unidad && x.Concepto === concepto && x.Mes >= 1 && x.Mes <= 12) m[x.Mes - 1] += x.Monto; });
      return m;
    };
    push('EGRESOS DE PERSONAL', emptyMonths(), 'header', 1);
    const persFixed = new Set(PERS_UNITS.map((u) => u.unidad));
    const persExtra: string[] = [];
    personal.forEach((x) => { if (!persFixed.has(x.Unidad) && !persExtra.includes(x.Unidad)) persExtra.push(x.Unidad); });
    const persUnits = [
      ...PERS_UNITS,
      ...persExtra.sort().map((unidad) => ({ unidad, label: prettyUnidad(unidad), extra: true as const })),
    ];
    for (const u of persUnits) {
      const conceptRows = CONCEPTOS.map((c) => ({ c, m: persMonths(u.unidad, c) }));
      if ('extra' in u && u.extra && !conceptRows.some((r) => sumArr(r.m) !== 0)) continue;  // ADMINISTRACION solo si != 0 (D6)
      push(u.label, emptyMonths(), 'header', 2);
      conceptRows.forEach((r) => push(r.c, r.m, 'detail', 3));
    }

    // Egresos por seccion × hoja. Cada seccion: hojas del catalogo (orden del seed) + hojas
    // presentes en Egresos que no esten en el catalogo (p.ej. MED-LEG legacy).
    const egMonths = (codigoHoja: string) => {
      const m = emptyMonths();
      egresos.forEach((x) => { if (x.CodigoHoja === codigoHoja && x.Mes >= 1 && x.Mes <= 12) m[x.Mes - 1] += x.Monto; });
      return m;
    };
    const hojasDeSeccion = (seccion: string) => {
      const cat = catalogo.filter((c) => c.Seccion === seccion).sort((a, b) => a.Orden - b.Orden)
        .map((c) => ({ CodigoHoja: c.CodigoHoja, Hoja: c.Hoja }));
      const catCodes = new Set(cat.map((c) => c.CodigoHoja));
      const seen = new Set<string>();
      const extras: { CodigoHoja: string; Hoja: string }[] = [];
      egresos.forEach((x) => {
        if (x.Seccion === seccion && !catCodes.has(x.CodigoHoja) && !seen.has(x.CodigoHoja)) {
          seen.add(x.CodigoHoja);
          extras.push({ CodigoHoja: x.CodigoHoja, Hoja: x.Hoja });
        }
      });
      return [...cat, ...extras];
    };
    const pushSeccion = (seccion: string, headerLevel = 1, hojaLevel = 2) => {
      push(SECCION_LABEL[seccion] ?? seccion, emptyMonths(), 'header', headerLevel);
      hojasDeSeccion(seccion).forEach((h) => push(h.Hoja, egMonths(h.CodigoHoja), 'detail', hojaLevel));
    };
    // Secciones operativas (dentro de EGRESOS OPERATIVOS).
    ['ADMIN', 'MEDICO', 'TRIBUTOS', 'RENTA'].forEach((s) => pushSeccion(s, 1, 2));

    // TOTAL EGRESOS OPERATIVOS y toda la cola: del Resumen del consolidado (D1).
    push('TOTAL EGRESOS OPERATIVOS', val((r) => r.TotalEgresosOp), 'total');
    push('FLUJO DE CAJA OPERATIVO', val((r) => r.FlujoOperativo), 'total');
    pushSeccion('INVERSION', 1, 2);
    push('CAJA OPERATIVA + INVERSIÓN', val((r) => r.CajaOpInversion), 'total');
    pushSeccion('FINANCIAMIENTO', 1, 2);
    push('CAJA OPERATIVA + FINANCIAMIENTO', val((r) => r.CajaOpFinanciamiento), 'total');
    pushSeccion('OTROS_EGRESOS', 1, 2);
    pushSeccion('OTROS_INGRESOS', 1, 2);
    push('SALDO DE CAJA', val((r) => r.SaldoDeCaja), 'total');
    const saldoIni = val((r) => r.SaldoInicial);
    const saldoFin = val((r) => r.SaldoFinal);
    push('SALDO INICIAL', saldoIni, 'saldo', 0, saldoIni[0]);
    push('SALDO FINAL', saldoFin, 'saldo', 0, saldoFin[11]);

    return out;
  }, [detalle, resumen]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Flujo de Caja Detallado</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mismo universo que el consolidado, abierto por unidad × forma de pago (ingresos), unidad × concepto (personal) y rubro hoja (egresos).
          </p>
        </div>
        {filtroActivo && (
          <span className="text-[11px] px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Ingresos reflejan el filtro; egresos y saldos son totales.
          </span>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400 border-b-2 border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2 text-left sticky left-0 bg-white dark:bg-slate-800 z-10 min-w-[260px]">Concepto</th>
              {MESES.map((m) => <th key={m} className="px-2 py-2 text-right whitespace-nowrap">{m}</th>)}
              <th className="px-3 py-2 text-right font-bold bg-slate-50 dark:bg-slate-700/40">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={14} className="px-3 py-8 text-center text-slate-400">Cargando...</td></tr>}
            {!loading && !detalle && <tr><td colSpan={14} className="px-3 py-8 text-center text-slate-400">Sin datos</td></tr>}
            {!loading && detalle && rows.map((r, idx) => {
              // D5: saldos atenuados (no reflejan el filtro); egresos rotulados "totales (sin filtro)".
              const dimmed = filtroActivo && r.label.startsWith('SALDO');
              const esEgresoTotal = filtroActivo && r.label === 'EGRESOS OPERATIVOS';
              const lvl = r.indentLevel ?? 0;
              return (
                <tr key={idx} className={`${rowClass(r.kind)} ${dimmed ? 'opacity-50' : ''}`}>
                  <td className={`px-3 py-1.5 text-left sticky left-0 z-10 ${cellBg(r.kind)} ${indentClass(lvl)}`}>
                    {r.label}
                    {dimmed && <span className="ml-2 text-[10px] font-normal normal-case text-slate-400">no refleja el filtro</span>}
                    {esEgresoTotal && <span className="ml-2 text-[10px] font-normal text-amber-500">totales (sin filtro)</span>}
                  </td>
                  {r.values.map((v, i) => (
                    <td key={i} className="px-2 py-1.5 text-right tabular-nums">{r.kind === 'header' ? '' : money(v)}</td>
                  ))}
                  <td className={`px-3 py-1.5 text-right font-bold tabular-nums ${cellBg(r.kind)}`}>{r.kind === 'header' ? '' : money(r.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Todas las hojas del catálogo se listan aunque valgan 0 ('—'). La cola (flujo operativo, cajas, saldos) se reusa del consolidado.
        {filtroActivo && ' Con filtro activo, los egresos y los saldos se muestran totales (no reflejan el filtro por medio de pago).'}
      </p>
    </div>
  );
};

export default FlujoDetalladoSection;
