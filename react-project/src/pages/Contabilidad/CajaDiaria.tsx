import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import type { CajaDiaRow, CajaIngresoRow } from '../../services/contabilidad/contaTypes';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad = (n: number) => String(n).padStart(2, '0');

const CajaDiaria: React.FC = () => {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [dias, setDias] = useState<CajaDiaRow[]>([]);
  const [hoyIngresos, setHoyIngresos] = useState<CajaIngresoRow[]>([]);
  const [loading, setLoading] = useState(false);

  const hoyStr = `${anio}-${pad(mes)}-${pad(Math.min(now.getDate(), 28))}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const serie = await contabilidadService.cajaDiaria(anio, mes);
      setDias(serie);
      // tabla del dia: ultimo dia con movimiento (o el dia de hoy si el mes es el actual)
      const esMesActual = anio === now.getFullYear() && mes === now.getMonth() + 1;
      const diaObjetivo = esMesActual ? `${anio}-${pad(mes)}-${pad(now.getDate())}` : serie[serie.length - 1]?.Dia?.slice(0, 10);
      if (diaObjetivo) {
        const ing = await contabilidadService.cajaIngresos(diaObjetivo, diaObjetivo);
        setHoyIngresos(ing);
      } else {
        setHoyIngresos([]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando caja diaria');
    } finally {
      setLoading(false);
    }
  }, [anio, mes]);

  useEffect(() => { load(); }, [load]);

  const totalIngresos = useMemo(() => dias.reduce((s, d) => s + d.Ingresos, 0), [dias]);
  const totalEgresos = useMemo(() => dias.reduce((s, d) => s + d.Egresos, 0), [dias]);
  const saldoHoy = useMemo(() => (dias.length ? dias[dias.length - 1].SaldoAcumulado : 0), [dias]);

  const chartData = useMemo(() => dias.map((d) => ({
    dia: d.Dia.slice(8, 10),
    Saldo: Number(d.SaldoAcumulado),
    Ingresos: Number(d.Ingresos),
    Egresos: Number(d.Egresos),
  })), [dias]);

  const porFormaPago = useMemo(() => {
    const map = new Map<string, number>();
    hoyIngresos.forEach((i) => {
      const k = i.FormaPago || 'Sin forma de pago';
      map.set(k, (map.get(k) || 0) + i.Monto);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [hoyIngresos]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Caja Diaria</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Saldo de caja al día. Ingresos por cobranza menos egresos pagados.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={selCls}>
            {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={selCls}>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </div>
      </div>

      {/* tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Card title="Saldo al día" value={saldoHoy} icon={<Wallet className="h-5 w-5" />} tone="emerald" />
        <Card title={`Ingresos ${MESES[mes - 1]} (al día)`} value={totalIngresos} icon={<TrendingUp className="h-5 w-5" />} tone="sky" />
        <Card title={`Egresos ${MESES[mes - 1]} (al día)`} value={totalEgresos} icon={<TrendingDown className="h-5 w-5" />} tone="rose" />
      </div>

      {/* grafico saldo diario */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Saldo de caja acumulado</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} width={44} />
              <Tooltip formatter={(v: number) => `S/ ${money(v)}`} labelFormatter={(l) => `Día ${l}`} />
              <Area type="monotone" dataKey="Saldo" stroke="#10b981" strokeWidth={2} fill="url(#gSaldo)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* tabla del dia por forma de pago */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Cobranzas del día por forma de pago</h3>
          {porFormaPago.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sin cobranzas registradas ese día</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {porFormaPago.map(([fp, monto]) => (
                  <tr key={fp} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2 text-slate-700 dark:text-slate-200">{fp}</td>
                    <td className="py-2 text-right font-medium">S/ {money(monto)}</td>
                  </tr>
                ))}
                <tr className="font-semibold text-slate-800 dark:text-slate-100">
                  <td className="py-2">Total del día</td>
                  <td className="py-2 text-right text-emerald-600">S/ {money(porFormaPago.reduce((s, [, m]) => s + m, 0))}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* serie diaria */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-2">Día</th>
                <th className="px-3 py-2 text-right">Ingresos</th>
                <th className="px-3 py-2 text-right">Egresos</th>
                <th className="px-3 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">Cargando...</td></tr>}
              {!loading && dias.map((d) => (
                <tr key={d.Dia} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="px-3 py-1.5">{d.Dia.slice(0, 10)}</td>
                  <td className="px-3 py-1.5 text-right text-sky-600">{d.Ingresos ? money(d.Ingresos) : '—'}</td>
                  <td className="px-3 py-1.5 text-right text-rose-500">{d.Egresos ? money(d.Egresos) : '—'}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{money(d.SaldoAcumulado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const toneMap: Record<string, string> = {
  emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600',
  sky: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600',
  rose: 'bg-rose-50 dark:bg-rose-900/30 text-rose-500',
};

const Card: React.FC<{ title: string; value: number; icon: React.ReactNode; tone: string }> = ({ title, value, icon, tone }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
    <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>{icon}</div>
    <div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
      <div className="text-xl font-bold text-slate-800 dark:text-slate-100">S/ {money(value)}</div>
    </div>
  </div>
);

const selCls = 'px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

export default CajaDiaria;
