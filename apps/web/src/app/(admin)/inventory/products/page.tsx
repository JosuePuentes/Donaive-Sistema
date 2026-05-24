'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { productsApi } from '@/lib/inventory-api';
import { formatCurrency } from '@/lib/format-currency';
import type { Product, ProductCategory } from '@/types/inventory';
import { PRODUCT_UNITS } from '@/types/inventory';

const emptyForm = {
  sku: '',
  barcode: '',
  name: '',
  description: '',
  categoryId: '',
  unit: 'UNIT',
  costUsd: 0,
  marginPercent: 30,
  minStock: 0,
  maxStock: '',
  allowNegativeStock: false,
  initialStock: 0,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [prodRes, cats] = await Promise.all([
        productsApi.list({ search, lowStock: lowStockOnly, limit: 50 }),
        productsApi.categories(),
      ]);
      setProducts(prodRes.data);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [search, lowStockOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await productsApi.create({
        sku: form.sku,
        barcode: form.barcode || undefined,
        name: form.name,
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
        unit: form.unit,
        costUsd: Number(form.costUsd),
        marginPercent: Number(form.marginPercent),
        minStock: Number(form.minStock),
        maxStock: form.maxStock ? Number(form.maxStock) : undefined,
        allowNegativeStock: form.allowNegativeStock,
        initialStock: Number(form.initialStock),
      });
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear producto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-zinc-500">Catálogo e inventario inicial</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium"
        >
          + Nuevo producto
        </button>
      </header>

      <div className="flex gap-3 flex-wrap">
        <input
          placeholder="Buscar por nombre, SKU o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] flex-1 min-w-48"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Solo stock bajo
        </label>
      </div>

      {error && (
        <p className="text-red-500 text-sm">
          {error}. <Link href="/login" className="underline">Iniciar sesión</Link>
        </p>
      )}

      {loading ? (
        <p className="text-zinc-500">Cargando...</p>
      ) : (
        <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="text-left p-3">SKU</th>
                <th className="text-left p-3">Producto</th>
                <th className="text-right p-3">Stock</th>
                <th className="text-right p-3">Costo USD</th>
                <th className="text-right p-3">Precio USD</th>
                <th className="text-right p-3">Precio Bs</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">Kardex</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="p-3 font-mono text-xs">{p.sku}</td>
                  <td className="p-3">
                    <p className="font-medium">{p.name}</p>
                    {p.category && (
                      <p className="text-xs text-zinc-500">{p.category.name}</p>
                    )}
                  </td>
                  <td className={`p-3 text-right font-medium ${p.isBelowMinStock ? 'text-red-500' : ''}`}>
                    {p.stock}
                  </td>
                  <td className="p-3 text-right">{formatCurrency(p.costUsd)}</td>
                  <td className="p-3 text-right">{formatCurrency(p.salePriceUsd)}</td>
                  <td className="p-3 text-right text-[var(--primary)] font-medium">
                    {p.salePriceVes != null
                      ? formatCurrency(p.salePriceVes, 'VES')
                      : '—'}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <Link href={`/inventory/kardex?productId=${p.id}`} className="text-[var(--primary)] hover:underline text-xs">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500">
                    No hay productos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreate}
            className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"
          >
            <h2 className="text-lg font-bold">Nuevo Producto</h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU *" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} required />
              <Field label="Código de barras" value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })} />
            </div>
            <Field label="Nombre *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Categoría</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Unidad</label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                >
                  {PRODUCT_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Costo USD *" type="number" value={String(form.costUsd)} onChange={(v) => setForm({ ...form, costUsd: Number(v) })} required />
              <Field label="Margen % *" type="number" value={String(form.marginPercent)} onChange={(v) => setForm({ ...form, marginPercent: Number(v) })} required />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Stock mínimo" type="number" value={String(form.minStock)} onChange={(v) => setForm({ ...form, minStock: Number(v) })} />
              <Field label="Stock máximo" type="number" value={form.maxStock} onChange={(v) => setForm({ ...form, maxStock: v })} />
              <Field label="Stock inicial" type="number" value={String(form.initialStock)} onChange={(v) => setForm({ ...form, initialStock: Number(v) })} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowNegativeStock}
                onChange={(e) => setForm({ ...form, allowNegativeStock: e.target.checked })}
              />
              Permitir stock negativo
            </label>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Guardando...' : 'Crear producto'}
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
        step={type === 'number' ? 'any' : undefined}
        className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
      />
    </div>
  );
}
