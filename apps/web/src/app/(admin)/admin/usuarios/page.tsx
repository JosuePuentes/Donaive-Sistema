'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { branchesApi } from '@/lib/branches-api';

interface Role {
  id: string;
  code: string;
  name: string;
}

interface BranchOption {
  id: string;
  code: string;
  name: string;
}

interface UserRow {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  branchId?: string | null;
  branch?: { id: string; code: string; name: string } | null;
  roles: Array<{ role: { code: string; name: string } }>;
}

const ROLE_OPTIONS = ['ADMIN', 'ADMIN_OPERATOR', 'CASHIER'] as const;

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    branchId: '',
    roles: ['CASHIER'] as string[],
  });

  function load() {
    apiFetch<UserRow[]>('/users').then(setUsers).catch(() => {});
    apiFetch<Role[]>('/users/roles').then(setRoles).catch(() => {});
    branchesApi.listActive().then(setBranches).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({
      email: '',
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      branchId: branches.find((b) => b.code === 'MAIN')?.id ?? branches[0]?.id ?? '',
      roles: ['CASHIER'],
    });
    setShowForm(true);
  }

  function openEdit(u: UserRow) {
    setEditingId(u.id);
    setForm({
      email: u.email,
      username: u.username,
      password: '',
      firstName: u.firstName,
      lastName: u.lastName,
      branchId: u.branchId ?? u.branch?.id ?? '',
      roles: u.roles.map((r) => r.role.code),
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/users/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            branchId: form.branchId,
            roles: form.roles,
            ...(form.password ? { password: form.password } : {}),
          }),
        });
      } else {
        await apiFetch('/users', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      setEditingId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar usuario');
    } finally {
      setSaving(false);
    }
  }

  function toggleRole(code: string) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(code) ? f.roles.filter((r) => r !== code) : [...f.roles, code],
    }));
  }

  const roleCodes = roles.length ? roles.map((r) => r.code) : [...ROLE_OPTIONS];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios y permisos</h1>
          <p className="text-sm text-zinc-500">
            Los permisos se asignan por rol (ADMIN, operador, cajero). Edite roles de cada usuario.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
        >
          + Nuevo usuario
        </button>
      </header>

      <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th className="text-left p-3">Usuario</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Sucursal</th>
              <th className="text-left p-3">Roles / permisos</th>
              <th className="text-center p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[var(--border)]">
                <td className="p-3 font-mono text-xs">{u.username}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  {u.firstName} {u.lastName}
                </td>
                <td className="p-3 text-sm text-slate-600">
                  {u.branch?.name ?? '—'}
                </td>
                <td className="p-3">
                  {u.roles.map((r) => r.role.name).join(', ')}
                </td>
                <td className="p-3 text-center">
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="text-indigo-600 hover:underline text-xs font-medium"
                  >
                    Editar roles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-[var(--background)] border rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-bold">
              {editingId ? 'Editar usuario y roles' : 'Nuevo usuario'}
            </h2>
            {!editingId && (
              <>
                <Field label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
                <Field label="Usuario *" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required />
              </>
            )}
            {editingId && (
              <p className="text-sm text-zinc-500">
                {form.email} · {form.username}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre *" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
              <Field label="Apellido *" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
            </div>
            <div>
              <label className="text-sm font-medium">Sucursal *</label>
              <select
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                required
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-white"
              >
                <option value="">Seleccione sucursal</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <Field
              label={editingId ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              required={!editingId}
            />
            <div>
              <p className="text-sm font-medium mb-2">Roles (definen permisos en el sistema)</p>
              <div className="flex flex-wrap gap-2">
                {roleCodes.map((code) => (
                  <label key={code} className="flex items-center gap-1.5 text-sm border rounded-lg px-2 py-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.roles.includes(code)}
                      onChange={() => toggleRole(code)}
                    />
                    {roles.find((r) => r.code === code)?.name ?? code}
                  </label>
                ))}
              </div>
              {form.roles.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Seleccione al menos un rol</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || form.roles.length === 0 || !form.branchId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full mt-1 px-3 py-2 border rounded-lg"
      />
    </div>
  );
}
