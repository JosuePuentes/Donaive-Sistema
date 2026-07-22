'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { branchesApi, type Branch } from '@/lib/branches-api';

export default function SucursalesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    isDefault: false,
  });

  function load() {
    branchesApi.list().then(setBranches).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await branchesApi.create(form);
      setShowForm(false);
      setForm({ code: '', name: '', address: '', phone: '', isDefault: false });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear sucursal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sucursales</h1>
          <p className="text-sm text-slate-500 mt-1">
            Administre las ubicaciones. Cada usuario y operación queda asociada a su sucursal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva sucursal
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {branches.map((b) => (
          <div
            key={b.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-slate-900">{b.name}</h2>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {b.code}
                  </span>
                  {b.isDefault && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                      Principal
                    </span>
                  )}
                  {!b.isActive && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                      Inactiva
                    </span>
                  )}
                </div>
                {b.address && <p className="text-sm text-slate-500 mt-1">{b.address}</p>}
                {b.phone && <p className="text-sm text-slate-500">{b.phone}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <h2 className="text-lg font-bold text-slate-900">Nueva sucursal</h2>
            <Field label="Código *" value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} placeholder="SUC-02" required />
            <Field label="Nombre *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            <Field label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
              Marcar como sucursal principal
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl text-sm">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Guardando...' : 'Crear sucursal'}
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
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      />
    </div>
  );
}
