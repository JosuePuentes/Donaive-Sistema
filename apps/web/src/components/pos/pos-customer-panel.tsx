'use client';

import { useEffect, useState } from 'react';
import { User, UserPlus, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { customerDisplayName } from '@/lib/customer-display';

export interface PosCustomer {
  id: string;
  rif: string | null;
  businessName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string;
}

interface PosCustomerPanelProps {
  customer: PosCustomer | null;
  onSelect: (customer: PosCustomer | null) => void;
}

export function PosCustomerPanel({ customer, onSelect }: PosCustomerPanelProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PosCustomer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    rif: '',
    businessName: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      apiFetch<PosCustomer[]>(`/customers?search=${encodeURIComponent(search)}`)
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone.trim()) {
      alert('El teléfono es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const created = await apiFetch<PosCustomer>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          rif: form.rif || undefined,
          businessName: form.businessName || undefined,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          phone: form.phone.trim(),
        }),
      });
      onSelect(created);
      setShowForm(false);
      setForm({ rif: '', businessName: '', firstName: '', lastName: '', phone: '' });
      setSearch('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear cliente');
    } finally {
      setSaving(false);
    }
  }

  if (customer) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3 py-2">
        <User className="h-4 w-4 text-indigo-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{customerDisplayName(customer)}</p>
          <p className="text-xs text-slate-500">{customer.phone}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="p-1 text-slate-400 hover:text-rose-500"
          aria-label="Quitar cliente"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          placeholder="Buscar cliente (teléfono, RIF, nombre)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(true)}>
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>
      {results.length > 0 && (
        <ul className="border border-slate-200 rounded-lg bg-white max-h-32 overflow-y-auto">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(c);
                  setSearch('');
                  setResults([]);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0"
              >
                <span className="font-medium">{customerDisplayName(c)}</span>
                <span className="text-slate-400 ml-2">{c.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {showForm && (
        <form
          onSubmit={createCustomer}
          className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 text-sm"
        >
          <p className="font-semibold text-slate-800">Nuevo cliente</p>
          <input
            placeholder="Teléfono *"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Nombre"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="px-2 py-1.5 border border-slate-200 rounded-lg"
            />
            <input
              placeholder="Apellido"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="px-2 py-1.5 border border-slate-200 rounded-lg"
            />
          </div>
          <input
            placeholder="RIF (opcional)"
            value={form.rif}
            onChange={(e) => setForm({ ...form, rif: e.target.value })}
            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
