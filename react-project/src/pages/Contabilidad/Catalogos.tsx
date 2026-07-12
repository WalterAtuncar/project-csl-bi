import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, X, Save } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import { useContaAuth } from '../../context/ContaAuthContext';
import type {
  CentroCosto, TipoGasto, Entidad, CuentaBancaria, SisolParticipacion, ConfigRow,
} from '../../services/contabilidad/contaTypes';

type Tab = 'centros' | 'tipos' | 'entidades' | 'cuentas' | 'sisol' | 'config';
const TABS: { key: Tab; label: string }[] = [
  { key: 'centros', label: 'Centros de costo' },
  { key: 'tipos', label: 'Tipos de gasto' },
  { key: 'entidades', label: 'Entidades' },
  { key: 'cuentas', label: 'Cuentas bancarias' },
  { key: 'sisol', label: '% SISOL' },
  { key: 'config', label: 'Config / Semáforo' },
];

const Catalogos: React.FC = () => {
  const { canWrite } = useContaAuth();
  const [tab, setTab] = useState<Tab>('centros');

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Catálogos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configuración de centros de costo, tipos de gasto, entidades, cuentas, % SISOL y semáforo.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === t.key ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'centros' && <CentrosTab canWrite={canWrite} />}
      {tab === 'tipos' && <TiposTab canWrite={canWrite} />}
      {tab === 'entidades' && <EntidadesTab canWrite={canWrite} />}
      {tab === 'cuentas' && <CuentasTab canWrite={canWrite} />}
      {tab === 'sisol' && <SisolTab canWrite={canWrite} />}
      {tab === 'config' && <ConfigTab canWrite={canWrite} />}
    </div>
  );
};

// ---- Centros de costo ----
const CentrosTab: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
  const [rows, setRows] = useState<CentroCosto[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<CentroCosto | null>(null);
  const [form, setForm] = useState({ IdPadre: '', Codigo: '', Nombre: '', Descripcion: '', IdTipoCaja: '' });
  const load = useCallback(async () => { try { setRows(await contabilidadService.centrosCosto(false)); } catch (e) { toast.error(String(e)); } }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEdit(null); setForm({ IdPadre: '', Codigo: '', Nombre: '', Descripcion: '', IdTipoCaja: '' }); setOpen(true); };
  const openEdit = (r: CentroCosto) => { setEdit(r); setForm({ IdPadre: String(r.i_IdPadre ?? ''), Codigo: r.v_Codigo, Nombre: r.v_Nombre, Descripcion: r.v_Descripcion || '', IdTipoCaja: String(r.i_IdTipoCaja ?? '') }); setOpen(true); };
  const save = async () => {
    try {
      if (edit) await contabilidadService.centroCostoActualizar({ IdCentroCosto: edit.i_IdCentroCosto, Nombre: form.Nombre, Descripcion: form.Descripcion, IdTipoCaja: form.IdTipoCaja ? Number(form.IdTipoCaja) : null, Activo: true });
      else await contabilidadService.centroCostoCrear({ IdPadre: form.IdPadre ? Number(form.IdPadre) : null, Codigo: form.Codigo, Nombre: form.Nombre, Descripcion: form.Descripcion, IdTipoCaja: form.IdTipoCaja ? Number(form.IdTipoCaja) : null });
      toast.success('Guardado'); setOpen(false); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };
  return (
    <Panel title="Centros de costo" canWrite={canWrite} onNew={openNew}>
      <Table head={['Código', 'Nombre', 'Unidad (tipo caja)', 'Activo', '']}>
        {rows.map((r) => (
          <tr key={r.i_IdCentroCosto} className="border-b border-slate-100 dark:border-slate-700/50">
            <td className={`px-3 py-1.5 ${r.i_IdPadre ? 'pl-6 text-slate-500' : 'font-medium'}`}>{r.v_Codigo}</td>
            <td className="px-3 py-1.5">{r.v_Nombre}</td>
            <td className="px-3 py-1.5 text-slate-500">{r.v_NombreTipoCaja || '—'}</td>
            <td className="px-3 py-1.5">{r.b_Activo ? 'Sí' : 'No'}</td>
            <td className="px-3 py-1.5 text-right">{canWrite && <IconBtn onClick={() => openEdit(r)} />}</td>
          </tr>
        ))}
      </Table>
      {open && (
        <Modal title={edit ? 'Editar centro' : 'Nuevo centro'} onClose={() => setOpen(false)} onSave={save}>
          {!edit && <Field label="Centro padre (opcional)"><select value={form.IdPadre} onChange={(e) => setForm({ ...form, IdPadre: e.target.value })} className={inp}><option value="">Ninguno (raíz)</option>{rows.map((r) => <option key={r.i_IdCentroCosto} value={r.i_IdCentroCosto}>{r.v_Nombre}</option>)}</select></Field>}
          {!edit && <Field label="Código"><input value={form.Codigo} onChange={(e) => setForm({ ...form, Codigo: e.target.value })} className={inp} /></Field>}
          <Field label="Nombre"><input value={form.Nombre} onChange={(e) => setForm({ ...form, Nombre: e.target.value })} className={inp} /></Field>
          <Field label="Descripción"><input value={form.Descripcion} onChange={(e) => setForm({ ...form, Descripcion: e.target.value })} className={inp} /></Field>
          <Field label="Cablear a unidad (i_IdTipoCaja, opcional)"><input type="number" value={form.IdTipoCaja} onChange={(e) => setForm({ ...form, IdTipoCaja: e.target.value })} className={inp} placeholder="1-6, vacío = sin unidad" /></Field>
        </Modal>
      )}
    </Panel>
  );
};

// ---- Tipos de gasto ----
const TiposTab: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
  const [rows, setRows] = useState<TipoGasto[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<TipoGasto | null>(null);
  const [form, setForm] = useState({ IdPadre: '', Codigo: '', Nombre: '', SeccionFlujo: '' });
  const load = useCallback(async () => { try { setRows(await contabilidadService.tiposGasto(false)); } catch (e) { toast.error(String(e)); } }, []);
  useEffect(() => { load(); }, [load]);
  const openNew = () => { setEdit(null); setForm({ IdPadre: '', Codigo: '', Nombre: '', SeccionFlujo: '' }); setOpen(true); };
  const openEdit = (r: TipoGasto) => { setEdit(r); setForm({ IdPadre: String(r.i_IdPadre ?? ''), Codigo: r.v_Codigo, Nombre: r.v_Nombre, SeccionFlujo: r.v_SeccionFlujo || '' }); setOpen(true); };
  const save = async () => {
    try {
      if (edit) await contabilidadService.tipoGastoActualizar({ IdTipoGasto: edit.i_IdTipoGasto, Nombre: form.Nombre, SeccionFlujo: form.SeccionFlujo || null, Activo: true });
      else await contabilidadService.tipoGastoCrear({ IdPadre: form.IdPadre ? Number(form.IdPadre) : null, Codigo: form.Codigo, Nombre: form.Nombre, SeccionFlujo: form.SeccionFlujo || null });
      toast.success('Guardado'); setOpen(false); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };
  return (
    <Panel title="Tipos de gasto" canWrite={canWrite} onNew={openNew}>
      <Table head={['Código', 'Nombre', 'Sección flujo', 'Activo', '']}>
        {rows.map((r) => (
          <tr key={r.i_IdTipoGasto} className="border-b border-slate-100 dark:border-slate-700/50">
            <td className={`px-3 py-1.5 ${r.i_IdPadre ? 'pl-6 text-slate-500' : 'font-medium'}`}>{r.v_Codigo}</td>
            <td className="px-3 py-1.5">{r.v_Nombre}</td>
            <td className="px-3 py-1.5 text-slate-500">{r.v_SeccionFlujo || r.SeccionPadre || '—'}</td>
            <td className="px-3 py-1.5">{r.b_Activo ? 'Sí' : 'No'}</td>
            <td className="px-3 py-1.5 text-right">{canWrite && <IconBtn onClick={() => openEdit(r)} />}</td>
          </tr>
        ))}
      </Table>
      {open && (
        <Modal title={edit ? 'Editar tipo' : 'Nuevo tipo'} onClose={() => setOpen(false)} onSave={save}>
          {!edit && <Field label="Tipo padre (opcional)"><select value={form.IdPadre} onChange={(e) => setForm({ ...form, IdPadre: e.target.value })} className={inp}><option value="">Ninguno (raíz)</option>{rows.filter((r) => !r.i_IdPadre).map((r) => <option key={r.i_IdTipoGasto} value={r.i_IdTipoGasto}>{r.v_Nombre}</option>)}</select></Field>}
          {!edit && <Field label="Código"><input value={form.Codigo} onChange={(e) => setForm({ ...form, Codigo: e.target.value })} className={inp} /></Field>}
          <Field label="Nombre"><input value={form.Nombre} onChange={(e) => setForm({ ...form, Nombre: e.target.value })} className={inp} /></Field>
          <Field label="Sección de flujo (solo raíces)"><input value={form.SeccionFlujo} onChange={(e) => setForm({ ...form, SeccionFlujo: e.target.value })} className={inp} placeholder="PERSONAL, ADMIN, MEDICO..." /></Field>
        </Modal>
      )}
    </Panel>
  );
};

// ---- Entidades ----
const EntidadesTab: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
  const [rows, setRows] = useState<Entidad[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Entidad | null>(null);
  const [form, setForm] = useState({ Nombre: '', Tipo: '' });
  const load = useCallback(async () => { try { setRows(await contabilidadService.entidades(false)); } catch (e) { toast.error(String(e)); } }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    try {
      if (edit) await contabilidadService.entidadActualizar({ IdEntidad: edit.i_IdEntidad, Nombre: form.Nombre, Tipo: form.Tipo, Activo: true });
      else await contabilidadService.entidadCrear({ Nombre: form.Nombre, Tipo: form.Tipo });
      toast.success('Guardado'); setOpen(false); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };
  return (
    <Panel title="Entidades" canWrite={canWrite} onNew={() => { setEdit(null); setForm({ Nombre: '', Tipo: '' }); setOpen(true); }}>
      <Table head={['Nombre', 'Tipo', 'Activo', '']}>
        {rows.map((r) => (
          <tr key={r.i_IdEntidad} className="border-b border-slate-100 dark:border-slate-700/50">
            <td className="px-3 py-1.5 font-medium">{r.v_Nombre}</td>
            <td className="px-3 py-1.5 text-slate-500">{r.v_Tipo}</td>
            <td className="px-3 py-1.5">{r.b_Activo ? 'Sí' : 'No'}</td>
            <td className="px-3 py-1.5 text-right">{canWrite && <IconBtn onClick={() => { setEdit(r); setForm({ Nombre: r.v_Nombre, Tipo: r.v_Tipo }); setOpen(true); }} />}</td>
          </tr>
        ))}
      </Table>
      {open && (
        <Modal title={edit ? 'Editar entidad' : 'Nueva entidad'} onClose={() => setOpen(false)} onSave={save}>
          <Field label="Nombre"><input value={form.Nombre} onChange={(e) => setForm({ ...form, Nombre: e.target.value })} className={inp} /></Field>
          <Field label="Tipo"><input value={form.Tipo} onChange={(e) => setForm({ ...form, Tipo: e.target.value })} className={inp} placeholder="HOSPITAL, CLINICA, OTRO" /></Field>
        </Modal>
      )}
    </Panel>
  );
};

// ---- Cuentas bancarias ----
const CuentasTab: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
  const [rows, setRows] = useState<CuentaBancaria[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<CuentaBancaria | null>(null);
  const [form, setForm] = useState({ Banco: '', NroCuenta: '', Moneda: 'PEN' });
  const load = useCallback(async () => { try { setRows(await contabilidadService.cuentasBancarias(false)); } catch (e) { toast.error(String(e)); } }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    try {
      if (edit) await contabilidadService.cuentaActualizar({ IdCuentaBancaria: edit.i_IdCuentaBancaria, Banco: form.Banco, NroCuenta: form.NroCuenta, Moneda: form.Moneda, Activo: true });
      else await contabilidadService.cuentaCrear({ Banco: form.Banco, NroCuenta: form.NroCuenta, Moneda: form.Moneda });
      toast.success('Guardado'); setOpen(false); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };
  return (
    <Panel title="Cuentas bancarias" canWrite={canWrite} onNew={() => { setEdit(null); setForm({ Banco: '', NroCuenta: '', Moneda: 'PEN' }); setOpen(true); }}>
      <Table head={['Banco', 'Nro. cuenta', 'Moneda', 'Activo', '']}>
        {rows.map((r) => (
          <tr key={r.i_IdCuentaBancaria} className="border-b border-slate-100 dark:border-slate-700/50">
            <td className="px-3 py-1.5 font-medium">{r.v_Banco}</td>
            <td className="px-3 py-1.5">{r.v_NroCuenta}</td>
            <td className="px-3 py-1.5">{r.v_Moneda}</td>
            <td className="px-3 py-1.5">{r.b_Activo ? 'Sí' : 'No'}</td>
            <td className="px-3 py-1.5 text-right">{canWrite && <IconBtn onClick={() => { setEdit(r); setForm({ Banco: r.v_Banco, NroCuenta: r.v_NroCuenta, Moneda: r.v_Moneda }); setOpen(true); }} />}</td>
          </tr>
        ))}
      </Table>
      {open && (
        <Modal title={edit ? 'Editar cuenta' : 'Nueva cuenta'} onClose={() => setOpen(false)} onSave={save}>
          <Field label="Banco"><input value={form.Banco} onChange={(e) => setForm({ ...form, Banco: e.target.value })} className={inp} /></Field>
          <Field label="Nro. cuenta"><input value={form.NroCuenta} onChange={(e) => setForm({ ...form, NroCuenta: e.target.value })} className={inp} /></Field>
          <Field label="Moneda"><select value={form.Moneda} onChange={(e) => setForm({ ...form, Moneda: e.target.value })} className={inp}><option>PEN</option><option>USD</option></select></Field>
        </Modal>
      )}
    </Panel>
  );
};

// ---- % SISOL ----
const SisolTab: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
  const [rows, setRows] = useState<SisolParticipacion[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ PorcClinica: 70, VigenciaDesde: new Date().toISOString().slice(0, 10) });
  const load = useCallback(async () => { try { setRows(await contabilidadService.sisolParticipacionList()); } catch (e) { toast.error(String(e)); } }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    try {
      await contabilidadService.sisolParticipacionCrear({ PorcClinica: form.PorcClinica, PorcHospital: 100 - form.PorcClinica, VigenciaDesde: form.VigenciaDesde });
      toast.success('Vigencia agregada'); setOpen(false); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };
  return (
    <Panel title="Participación SISOL (historial de vigencias)" canWrite={canWrite} onNew={() => setOpen(true)}>
      <Table head={['% Clínica', '% Hospital', 'Vigente desde', 'Vigente hasta']}>
        {rows.map((r) => (
          <tr key={r.i_IdParticipacion} className="border-b border-slate-100 dark:border-slate-700/50">
            <td className="px-3 py-1.5 font-medium">{r.d_PorcClinica}%</td>
            <td className="px-3 py-1.5">{r.d_PorcHospital}%</td>
            <td className="px-3 py-1.5">{r.t_VigenciaDesde?.slice(0, 10)}</td>
            <td className="px-3 py-1.5 text-slate-500">{r.t_VigenciaHasta?.slice(0, 10) || 'Vigente'}</td>
          </tr>
        ))}
      </Table>
      {open && (
        <Modal title="Nueva vigencia" onClose={() => setOpen(false)} onSave={save}>
          <Field label="% Clínica"><input type="number" step="0.01" value={form.PorcClinica} onChange={(e) => setForm({ ...form, PorcClinica: Number(e.target.value) })} className={inp} /></Field>
          <Field label="% Hospital (auto)"><input disabled value={100 - form.PorcClinica} className={inp} /></Field>
          <Field label="Vigente desde"><input type="date" value={form.VigenciaDesde} onChange={(e) => setForm({ ...form, VigenciaDesde: e.target.value })} className={inp} /></Field>
          <p className="text-xs text-slate-400">La vigencia anterior se cierra automáticamente el día previo.</p>
        </Modal>
      )}
    </Panel>
  );
};

// ---- Config ----
const ConfigTab: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const load = useCallback(async () => { try { const r = await contabilidadService.configList(); setRows(r); setDraft(Object.fromEntries(r.map((x) => [x.v_Clave, x.v_Valor]))); } catch (e) { toast.error(String(e)); } }, []);
  useEffect(() => { load(); }, [load]);
  const save = async (clave: string) => { try { await contabilidadService.configActualizar(clave, draft[clave]); toast.success('Guardado'); load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); } };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Parámetros (semáforo de rentabilidad, etc.)</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.v_Clave} className="border-b border-slate-100 dark:border-slate-700/50">
              <td className="px-2 py-2 font-mono text-xs">{r.v_Clave}</td>
              <td className="px-2 py-2 text-slate-500">{r.v_Descripcion}</td>
              <td className="px-2 py-2 w-32"><input disabled={!canWrite} value={draft[r.v_Clave] ?? ''} onChange={(e) => setDraft({ ...draft, [r.v_Clave]: e.target.value })} className={inp} /></td>
              <td className="px-2 py-2 w-10">{canWrite && <button onClick={() => save(r.v_Clave)} className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40"><Save className="h-4 w-4 text-emerald-600" /></button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---- shared UI ----
const Panel: React.FC<{ title: string; canWrite: boolean; onNew: () => void; children: React.ReactNode }> = ({ title, canWrite, onNew, children }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      {canWrite && <button onClick={onNew} className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"><Plus className="h-4 w-4" /> Nuevo</button>}
    </div>
    <div className="overflow-x-auto">{children}</div>
  </div>
);
const Table: React.FC<{ head: string[]; children: React.ReactNode }> = ({ head, children }) => (
  <table className="w-full text-sm">
    <thead><tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">{head.map((h, i) => <th key={i} className="px-3 py-2">{h}</th>)}</tr></thead>
    <tbody>{children}</tbody>
  </table>
);
const IconBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><Pencil className="h-4 w-4 text-slate-500" /></button>
);
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-3"><label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>{children}</div>
);
const Modal: React.FC<{ title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }> = ({ title, onClose, onSave, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5 text-slate-400" /></button>
      </div>
      <div className="p-5">{children}</div>
      <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Cerrar</button>
        <button onClick={onSave} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Guardar</button>
      </div>
    </div>
  </div>
);

const inp = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60';

export default Catalogos;
