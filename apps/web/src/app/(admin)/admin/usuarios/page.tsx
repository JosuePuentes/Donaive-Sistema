'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

interface Role {
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
  roles: Array<{ role: { code: string; name: string } }>;
}

const ROLE_OPTIONS = ['ADMIN', 'ADMIN_OPERATOR', 'CASHIER'] as const;

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    roles: ['CASHIER'] as string[],
  });

  function load() {
    apiFetch<UserRow[]>('/users').then(setUsers).catch(() => {});
    apiFetch<Role[]>('/users/roles').then(setRoles).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({
        email: '',
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        roles: ['CASHIER'],
      });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear usuario');
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

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-zinc-500">Crear cuentas y asignar permisos por rol</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
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
              <th className="text-left p-3">Roles</th>
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
                <td className="p-3">
                  {u.roles.map((r) => r.role.name).join(', ')}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-zinc-500">
                  No hay usuarios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreate}
            className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-bold">Nuevo usuario</h2>
            <Field label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <Field label="Usuario *" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required />
            <Field label="Contraseña *" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre *" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
              <Field label="Apellido *" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Roles</p>
              <div className="flex flex-wrap gap-2">
                {(roles.length ? roles.map((r) => r.code) : ROLE_OPTIONS).map((code) => (
                  <label key={code} className="flex items-center gap-1.5 text-sm border rounded-lg px-2 py-1">
                    <input
                      type="checkbox"
                      checked={form.roles.includes(code)}
                      onChange={() => toggleRole(code)}
                    />
                    {code}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
                {saving ? 'Guardando...' : 'Crear'}
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
        className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg"
      />
    </div>
  );
}
