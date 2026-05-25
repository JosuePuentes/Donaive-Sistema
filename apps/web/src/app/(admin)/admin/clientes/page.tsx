'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { customerDisplayName } from '@/lib/customer-display';

interface Customer {
  id: string;
  rif: string | null;
  businessName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string;
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    rif: '',
    businessName: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const [searchDebounced, setSearchDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const q = searchDebounced ? `?search=${encodeURIComponent(searchDebounced)}` : '';
    apiFetch<Customer[]>(`/customers${q}`).then(setCustomers).catch(() => {});
  }, [searchDebounced]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
          rif: form.rif || undefined,
          businessName: form.businessName || undefined,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          phone: form.phone.trim(),
        }),
      });
      setShowForm(false);
      setForm({ rif: '', businessName: '', firstName: '', lastName: '', phone: '' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-zinc-500">Listado por nombre y apellido · teléfono obligatorio</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
        >
          + Nuevo cliente
        </button>
      </header>

      <input
        placeholder="Buscar..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="px-3 py-2 border border-[var(--border)] rounded-lg w-full max-w-md"
      />

      <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th className="text-left p-3">Nombre y apellido</th>
              <th className="text-left p-3">RIF</th>
              <th className="text-left p-3">Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-[var(--border)]">
                <td className="p-3 font-medium">{customerDisplayName(c)}</td>
                <td className="p-3">{c.rif ?? '—'}</td>
                <td className="p-3">{c.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreate}
            className="bg-[var(--background)] border rounded-xl p-6 w-full max-w-md space-y-3"
          >
            <h2 className="font-bold text-lg">Nuevo cliente</h2>
            <input
              placeholder="Teléfono *"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg"
            />
            <input
              placeholder="RIF"
              value={form.rif}
              onChange={(e) => setForm({ ...form, rif: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Nombre *"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="px-3 py-2 border rounded-lg"
                required
              />
              <input
                placeholder="Apellido *"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <input
              placeholder="Razón social (opcional)"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm text-zinc-500"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
