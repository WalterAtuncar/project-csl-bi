// [SOFT-DELETE 2026-07-13] Pagina "Liquidacion SISOL" retirada del routing/menu: no fue solicitada.
// La ruta /conta/sisol redirige a /conta/catalogos. Se CONSERVA la configuracion de porcentajes en
// Catalogos -> tab "% SISOL". Este componente permanece en disco para restauracion futura.
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Calculator, CreditCard, Plus, Trash2, Building2, HeartPulse, RefreshCw } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import { useContaAuth } from '../../context/ContaAuthContext';
import type { SisolDetalle, SisolEspecialistaInput } from '../../services/contabilidad/contaTypes';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Sisol: React.FC = () => {
  const { canWrite } = useContaAuth();
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [det, setDet] = useState<SisolDetalle | null>(null);
  const [especialistas, setEspecialistas] = useState<SisolEspecialistaInput[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await contabilidadService.sisolGet(anio, mes);
      setDet(d);
      setEspecialistas(d.Especialistas.map((e) => ({ IdMedico: e.v_IdMedico, NombreMedico: e.v_NombreMedico, Porcentaje: e.d_Porcentaje })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando liquidacion');
    } finally { setLoading(false); }
  }, [anio, mes]);

  useEffect(() => { load(); }, [load]);

  const liq = det?.Liquidacion || null;
  const pagado = liq?.v_Estado === 'PAGADO';

  const calcular = async () => {
    try {
      await contabilidadService.sisolCalcular(anio, mes, especialistas.filter((e) => e.NombreMedico.trim()));
      toast.success('Liquidacion calculada');
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al calcular'); }
  };

  const pagar = async () => {
    if (!liq) return;
    const fecha = window.prompt('Fecha de pago (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!fecha) return;
    try {
      await contabilidadService.sisolPagar(liq.i_IdLiquidacion, fecha);
      toast.success('Liquidacion pagada. Egreso Hospital generado y enviado a Caja.');
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al pagar'); }
  };

  const addEsp = () => setEspecialistas([...especialistas, { IdMedico: '', NombreMedico: '', Porcentaje: 0 }]);
  const rmEsp = (i: number) => setEspecialistas(especialistas.filter((_, idx) => idx !== i));
  const setEsp = (i: number, patch: Partial<SisolEspecialistaInput>) =>
    setEspecialistas(especialistas.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const totalEsp = especialistas.reduce((s, e) => s + (liq ? (liq.d_ParticipacionClinica * (e.Porcentaje || 0)) / 100 : 0), 0);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Liquidación SISOL</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Reparto de la venta neta SISOL entre clínica y Hospital de la Solidaridad.</p>
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
          {canWrite && !pagado && (
            <button onClick={calcular} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
              <Calculator className="h-4 w-4" /> Calcular
            </button>
          )}
          {canWrite && liq && !pagado && (
            <button onClick={pagar} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold">
              <CreditCard className="h-4 w-4" /> Pagar Hospital
            </button>
          )}
        </div>
      </div>

      {pagado && (
        <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-4 py-2 text-sm">
          Liquidación PAGADA el {liq?.t_FechaPago?.slice(0, 10)}. El egreso de participación Hospital ya está en Caja.
        </div>
      )}

      {/* tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Card title="Venta neta SISOL" value={liq?.d_VentaNeta ?? 0} icon={<Calculator className="h-5 w-5" />} tone="slate" />
        <Card title={`Participación clínica (${liq?.d_PorcClinica ?? 70}%)`} value={liq?.d_ParticipacionClinica ?? 0} icon={<Building2 className="h-5 w-5" />} tone="emerald" />
        <Card title={`Participación Hospital (${liq ? 100 - liq.d_PorcClinica : 30}%)`} value={liq?.d_ParticipacionHospital ?? 0} icon={<HeartPulse className="h-5 w-5" />} tone="sky" />
      </div>

      {/* especialistas */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Especialistas (% sobre participación clínica)</h3>
          {canWrite && !pagado && (
            <button onClick={addEsp} className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700">
              <Plus className="h-4 w-4" /> Agregar
            </button>
          )}
        </div>
        {especialistas.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Sin especialistas. {canWrite && !pagado ? 'Agregue filas y presione Calcular.' : ''}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="px-2 py-2">Cód. médico</th>
                <th className="px-2 py-2">Nombre</th>
                <th className="px-2 py-2 text-right w-24">%</th>
                <th className="px-2 py-2 text-right w-32">Monto</th>
                {canWrite && !pagado && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {especialistas.map((e, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="px-2 py-1"><input disabled={!canWrite || pagado} value={e.IdMedico} onChange={(ev) => setEsp(i, { IdMedico: ev.target.value })} className={inp} placeholder="MED-001" /></td>
                  <td className="px-2 py-1"><input disabled={!canWrite || pagado} value={e.NombreMedico} onChange={(ev) => setEsp(i, { NombreMedico: ev.target.value })} className={inp} placeholder="Dr. ..." /></td>
                  <td className="px-2 py-1"><input type="number" step="0.01" disabled={!canWrite || pagado} value={e.Porcentaje} onChange={(ev) => setEsp(i, { Porcentaje: Number(ev.target.value) })} className={`${inp} text-right`} /></td>
                  <td className="px-2 py-1 text-right tabular-nums">{liq ? money((liq.d_ParticipacionClinica * (e.Porcentaje || 0)) / 100) : '—'}</td>
                  {canWrite && !pagado && <td className="px-2 py-1 text-center"><button onClick={() => rmEsp(i)} className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40"><Trash2 className="h-4 w-4 text-rose-500" /></button></td>}
                </tr>
              ))}
              {liq && (
                <tr className="font-semibold text-slate-800 dark:text-slate-100">
                  <td className="px-2 py-2" colSpan={3}>Total repartido a especialistas</td>
                  <td className="px-2 py-2 text-right">S/ {money(totalEsp)}</td>
                  {canWrite && !pagado && <td></td>}
                </tr>
              )}
            </tbody>
          </table>
        )}
        {loading && <p className="text-center text-slate-400 text-sm mt-2">Cargando...</p>}
        <p className="text-xs text-slate-400 mt-3">Los % se aplican sobre la participación de la clínica. Presione "Calcular" para guardar. Al "Pagar Hospital" se genera el egreso del {liq ? 100 - liq.d_PorcClinica : 30}% y fluye a Caja.</p>
      </div>
    </div>
  );
};

const toneMap: Record<string, string> = {
  slate: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600',
  sky: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600',
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
const inp = 'w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-70';

export default Sisol;
