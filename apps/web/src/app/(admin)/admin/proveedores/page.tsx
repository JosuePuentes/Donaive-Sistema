'use client';

import { useCallback, useEffect, useState } from 'react';
import { suppliersApi } from '@/lib/purchases-api';
import type { Supplier, CreateSupplierInput } from '@/types/purchases';

const emptyForm: CreateSupplierInput = {
  rif: '',
  businessName: '',
  tradeName: '',
  address: '',
  phone: '',
  email: '',
  contactName: '',
};

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateSupplierInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSuppliers(await suppliersApi.list(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({
      rif: s.rif,
      businessName: s.businessName,
      tradeName: s.tradeName ?? '',
      address: s.address ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      contactName: s.contactName ?? '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await suppliersApi.update(editingId, {
          businessName: form.businessName,
          tradeName: form.tradeName || undefined,
          address: form.address || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          contactName: form.contactName || undefined,
        });
      } else {
        await suppliersApi.create({
          rif: form.rif,
          businessName: form.businessName,
          tradeName: form.tradeName || undefined,
          address: form.address || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          contactName: form.contactName || undefined,
        });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Supplier) {
    try {
      await suppliersApi.update(s.id, { isActive: !s.isActive });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-sm text-zinc-500">Gestión de proveedores para compras y cuentas por pagar</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium text-sm"
        >
          + Nuevo proveedor
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-[var(--border)] rounded-xl p-4 bg-[var(--muted)] space-y-3"
        >
          <h2 className="font-semibold">{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm">RIF *</label>
              <input
                value={form.rif}
                onChange={(e) => setForm({ ...form, rif: e.target.value })}
                disabled={!!editingId}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] disabled:opacity-60"
                required
              />
            </div>
            <div>
              <label className="text-sm">Razón social *</label>
              <input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                required
              />
            </div>
            <div>
              <label className="text-sm">Nombre comercial</label>
              <input
                value={form.tradeName}
                onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
              />
            </div>
            <div>
              <label className="text-sm">Teléfono</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Dirección</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
              />
            </div>
            <div>
              <label className="text-sm">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
              />
            </div>
            <div>
              <label className="text-sm">Contacto</label>
              <input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-zinc-500">Cargando proveedores...</p>
      ) : (
        <div className="border border-[var(--border)] rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="text-left p-3">RIF</th>
                <th className="text-left p-3">Razón social</th>
                <th className="text-left p-3">Teléfono</th>
                <th className="text-left p-3">Dirección</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="p-3 font-mono">{s.rif}</td>
                  <td className="p-3">{s.businessName}</td>
                  <td className="p-3">{s.phone ?? '—'}</td>
                  <td className="p-3 text-zinc-500 truncate max-w-[200px]">{s.address ?? '—'}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'}`}>
                      {s.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button type="button" onClick={() => openEdit(s)} className="text-xs text-[var(--primary)]">
                      Editar
                    </button>
                    <button type="button" onClick={() => toggleActive(s)} className="text-xs text-zinc-500">
                      {s.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    No hay proveedores registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
