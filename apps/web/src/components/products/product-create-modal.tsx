'use client';

import { useEffect, useState } from 'react';
import { productsApi } from '@/lib/inventory-api';
import { formatCurrency } from '@/lib/format-currency';
import type { Product, ProductCategory } from '@/types/inventory';
import { PRODUCT_UNITS } from '@/types/inventory';

const emptyForm = {
  sku: '',
  barcode: '',
  name: '',
  brand: '',
  unit: 'UNIT',
  costUsd: 0,
  marginPercent: 30,
  initialStock: 0,
};

export function ProductCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (product: Product) => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setCategoryId('');
    setError('');
    productsApi.categories().then(setCategories).catch(() => setCategories([]));
  }, [open]);

  if (!open) return null;

  const previewSalePrice =
    Number(form.costUsd) > 0
      ? Math.round(Number(form.costUsd) * (1 + Number(form.marginPercent) / 100) * 10000) / 10000
      : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const product = await productsApi.create({
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        categoryId: categoryId || undefined,
        unit: form.unit,
        costUsd: Number(form.costUsd),
        marginPercent: Number(form.marginPercent),
        initialStock: Number(form.initialStock),
      });
      onCreated(product);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear producto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[80]">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <h2 className="text-lg font-bold text-slate-900">Nuevo producto</h2>
        <p className="text-sm text-slate-500">
          Créelo aquí y quedará disponible de inmediato en compras y POS.
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Código (SKU) *" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} required />
          <Field label="Código de barras" value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })} />
        </div>
        <Field label="Descripción *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <Field label="Marca" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Categoría</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Unidad</label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              {PRODUCT_UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Costo USD *" type="number" value={String(form.costUsd)} onChange={(v) => setForm({ ...form, costUsd: Number(v) })} required />
          <Field label="Utilidad % *" type="number" value={String(form.marginPercent)} onChange={(v) => setForm({ ...form, marginPercent: Number(v) })} required />
          <Field label="Stock inicial" type="number" value={String(form.initialStock)} onChange={(v) => setForm({ ...form, initialStock: Number(v) })} />
        </div>

        {previewSalePrice > 0 && (
          <p className="text-sm rounded-lg bg-indigo-50 text-indigo-800 px-3 py-2">
            Precio venta estimado: <strong>{formatCurrency(previewSalePrice)}</strong>
          </p>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm disabled:opacity-50">
            {saving ? 'Creando...' : 'Crear y usar'}
          </button>
        </div>
      </form>
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
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        step={type === 'number' ? 'any' : undefined}
        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
      />
    </div>
  );
}
