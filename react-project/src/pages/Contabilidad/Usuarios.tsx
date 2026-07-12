import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Pencil, X, ShieldCheck, Link2, Search, Check } from 'lucide-react';
import contabilidadService from '../../services/contabilidad/ContabilidadService';
import { useContaAuth } from '../../context/ContaAuthContext';
import type { Usuario, Rol, LegacyUsuarioBusqueda } from '../../services/contabilidad/contaTypes';

const Usuarios: React.FC = () => {
  const { hasRole } = useContaAuth();
  const [rows, setRows] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ Username: '', Password: '', NombreCompleto: '', Roles: [] as string[], Activo: true });

  // Cableado de usuarios del sistema legacy
  const [linkOpen, setLinkOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<LegacyUsuarioBusqueda[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<LegacyUsuarioBusqueda | null>(null);
  const [linkRoles, setLinkRoles] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([contabilidadService.usuarios(), contabilidadService.roles()]);
      setRows(u); setRoles(r);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Busqueda con debounce (minimo 3 caracteres)
  useEffect(() => {
    if (!linkOpen) return;
    const q = search.trim();
    if (q.length < 3) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { setResults(await contabilidadService.legacyBuscar(q)); }
      catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [search, linkOpen]);

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
      if (edit && edit.v_AuthOrigen === 'LEGACY') {
        // Usuario del sistema: solo roles y activo (nombre y credenciales vienen del legacy)
        await contabilidadService.vinculoActualizar({ IdUsuario: edit.i_IdUsuario, Roles: form.Roles.join(','), Activo: form.Activo });
      } else if (edit) {
        await contabilidadService.usuarioActualizar({ IdUsuario: edit.i_IdUsuario, NombreCompleto: form.NombreCompleto, Activo: form.Activo, Roles: form.Roles.join(',') });
      } else {
        await contabilidadService.usuarioCrear({ Username: form.Username, Password: form.Password, NombreCompleto: form.NombreCompleto, Roles: form.Roles.join(',') });
      }
      toast.success('Guardado'); setOpen(false); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  const openLink = () => { setSelected(null); setLinkRoles([]); setSearch(''); setResults([]); setLinkOpen(true); };
  const toggleLinkRole = (code: string) => setLinkRoles((rs) => rs.includes(code) ? rs.filter((r) => r !== code) : [...rs, code]);
  const doVincular = async () => {
    if (!selected) return;
    if (linkRoles.length === 0) { toast.error('Seleccione al menos un rol'); return; }
    try {
      await contabilidadService.vincular({ SystemUserId: selected.i_SystemUserId, Username: selected.v_UserName, Nombre: selected.Nombre, Roles: linkRoles.join(',') });
      toast.success(`Vinculado: ${selected.v_UserName}`); setLinkOpen(false); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Usuarios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de usuarios y roles del módulo (solo SA). Los usuarios del sistema entran con su misma clave del desktop.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openLink} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold"><Link2 className="h-4 w-4" /> Vincular usuario del sistema</button>
          <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus className="h-4 w-4" /> Nuevo usuario local</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Activo</th>
              <th className="px-3 py-2">Último acceso</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.i_IdUsuario} className="border-b border-slate-100 dark:border-slate-700/50">
                <td className="px-3 py-1.5 font-medium">{u.v_AuthOrigen === 'LEGACY' ? (u.v_UsernameLegacy || u.v_Username) : u.v_Username}</td>
                <td className="px-3 py-1.5">{u.v_NombreCompleto}</td>
                <td className="px-3 py-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.v_AuthOrigen === 'LEGACY' ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{u.v_AuthOrigen === 'LEGACY' ? 'Sistema' : 'Local'}</span>
                </td>
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

      {/* Modal crear/editar usuario */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{edit ? (edit.v_AuthOrigen === 'LEGACY' ? `Vínculo: ${edit.v_UsernameLegacy || edit.v_Username}` : `Editar ${edit.v_Username}`) : 'Nuevo usuario local'}</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {!edit && <F label="Usuario"><input value={form.Username} onChange={(e) => setForm({ ...form, Username: e.target.value })} className={inp} /></F>}
              {!edit && <F label="Contraseña"><input type="password" value={form.Password} onChange={(e) => setForm({ ...form, Password: e.target.value })} className={inp} /></F>}
              {edit?.v_AuthOrigen === 'LEGACY'
                ? <p className="text-xs text-slate-500 dark:text-slate-400">Usuario del sistema (autentica con su clave del desktop). Solo se editan roles y estado.</p>
                : <F label="Nombre completo"><input value={form.NombreCompleto} onChange={(e) => setForm({ ...form, NombreCompleto: e.target.value })} className={inp} /></F>}
              <F label="Roles">
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <button key={r.i_IdRol} onClick={() => toggleRole(r.v_Nombre)} className={`px-3 py-1.5 rounded-lg text-sm border ${form.Roles.includes(r.v_Nombre) ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>{r.v_Nombre}</button>
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

      {/* Modal cablear usuario del sistema legacy */}
      {linkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setLinkOpen(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Vincular usuario del sistema</h3>
              <button onClick={() => setLinkOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input autoFocus value={search} onChange={(e) => { setSearch(e.target.value); setSelected(null); }} placeholder="Buscar por usuario o nombre (mín. 3 caracteres)" className={inp + ' pl-9'} />
              </div>
              <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700/50">
                {searching && <p className="px-3 py-3 text-sm text-slate-400">Buscando…</p>}
                {!searching && search.trim().length >= 3 && results.length === 0 && <p className="px-3 py-3 text-sm text-slate-400">Sin resultados</p>}
                {!searching && search.trim().length < 3 && <p className="px-3 py-3 text-sm text-slate-400">Escriba al menos 3 caracteres</p>}
                {results.map((r) => (
                  <button key={r.i_SystemUserId} disabled={r.YaVinculado} onClick={() => setSelected(r)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm ${r.YaVinculado ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'} ${selected?.i_SystemUserId === r.i_SystemUserId ? 'bg-violet-50 dark:bg-violet-900/30' : ''}`}>
                    <span>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{r.v_UserName}</span>
                      <span className="text-slate-500 dark:text-slate-400"> · {r.Nombre}</span>
                    </span>
                    {r.YaVinculado
                      ? <span className="text-xs text-slate-400">ya vinculado</span>
                      : selected?.i_SystemUserId === r.i_SystemUserId ? <Check className="h-4 w-4 text-violet-600" /> : null}
                  </button>
                ))}
              </div>
              {selected && (
                <div className="pt-1">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Rol en el BI para <b>{selected.v_UserName}</b></label>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((r) => (
                      <button key={r.i_IdRol} onClick={() => toggleLinkRole(r.v_Nombre)} className={`px-3 py-1.5 rounded-lg text-sm border ${linkRoles.includes(r.v_Nombre) ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>{r.v_Nombre}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setLinkOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Cerrar</button>
              <button onClick={doVincular} disabled={!selected} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold">Vincular</button>
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
