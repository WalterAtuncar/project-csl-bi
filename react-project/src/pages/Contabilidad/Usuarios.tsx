import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Pencil, X, ShieldCheck } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import { useContaAuth } from '../../context/ContaAuthContext';
import type { Usuario, Rol } from '../../services/contabilidad/contaTypes';

const Usuarios: React.FC = () => {
  const { hasRole } = useContaAuth();
  const [rows, setRows] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ Username: '', Password: '', NombreCompleto: '', Roles: [] as string[], Activo: true });

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([contabilidadService.usuarios(), contabilidadService.roles()]);
      setRows(u); setRoles(r);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Guard: solo SA
  if (!hasRole('SA')) return <Navigate to="/conta/caja" replace />;

  const openNew = () => { setEdit(null); setForm({ Username: '', Password: '', NombreCompleto: '', Roles: [], Activo: true }); setOpen(true); };
  const openEdit = (u: Usuario) => {
    setEdit(u);
    setForm({ Username: u.v_Username, Password: '', NombreCompleto: u.v_NombreCompleto, Roles: (u.Roles || '').split(',').filter(Boolean), Activo: u.b_Activo });
    setOpen(true);
  };
  const toggleRole = (code: string) => setForm((f) => ({ ...f, Roles: f.Roles.includes(code) ? f.Roles.filter((r) => r !== code) : [...f.Roles, code] }));
  const save = async () => {
    try {
      if (edit) await contabilidadService.usuarioActualizar({ IdUsuario: edit.i_IdUsuario, NombreCompleto: form.NombreCompleto, Activo: form.Activo, Roles: form.Roles.join(',') });
      else await contabilidadService.usuarioCrear({ Username: form.Username, Password: form.Password, NombreCompleto: form.NombreCompleto, Roles: form.Roles.join(',') });
      toast.success('Guardado'); setOpen(false); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Usuarios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de usuarios y roles del módulo (solo SA).</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus className="h-4 w-4" /> Nuevo usuario</button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Activo</th>
              <th className="px-3 py-2">Último acceso</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.i_IdUsuario} className="border-b border-slate-100 dark:border-slate-700/50">
                <td className="px-3 py-1.5 font-medium">{u.v_Username}</td>
                <td className="px-3 py-1.5">{u.v_NombreCompleto}</td>
                <td className="px-3 py-1.5">
                  {(u.Roles || '').split(',').filter(Boolean).map((r) => (
                    <span key={r} className="inline-flex items-center gap-1 mr-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"><ShieldCheck className="h-3 w-3" />{r}</span>
                  ))}
                </td>
                <td className="px-3 py-1.5">{u.b_Activo ? 'Sí' : 'No'}</td>
                <td className="px-3 py-1.5 text-slate-500 text-xs">{u.t_UltimoLogin ? u.t_UltimoLogin.slice(0, 16).replace('T', ' ') : '—'}</td>
                <td className="px-3 py-1.5 text-right"><button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><Pencil className="h-4 w-4 text-slate-500" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{edit ? `Editar ${edit.v_Username}` : 'Nuevo usuario'}</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {!edit && <F label="Usuario"><input value={form.Username} onChange={(e) => setForm({ ...form, Username: e.target.value })} className={inp} /></F>}
              {!edit && <F label="Contraseña"><input type="password" value={form.Password} onChange={(e) => setForm({ ...form, Password: e.target.value })} className={inp} /></F>}
              <F label="Nombre completo"><input value={form.NombreCompleto} onChange={(e) => setForm({ ...form, NombreCompleto: e.target.value })} className={inp} /></F>
              <F label="Roles">
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <button key={r.i_IdRol} onClick={() => toggleRole(r.v_Codigo)} className={`px-3 py-1.5 rounded-lg text-sm border ${form.Roles.includes(r.v_Codigo) ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>{r.v_Nombre}</button>
                  ))}
                </div>
              </F>
              {edit && <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={form.Activo} onChange={(e) => setForm({ ...form, Activo: e.target.checked })} /> Activo</label>}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Cerrar</button>
              <button onClick={save} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const F: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div><label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>{children}</div>
);
const inp = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

export default Usuarios;
