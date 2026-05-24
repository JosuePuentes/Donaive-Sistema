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
  brand: '',
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
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const previewSalePrice =
    Number(form.costUsd) > 0
      ? Math.round(Number(form.costUsd) * (1 + Number(form.marginPercent) / 100) * 10000) / 10000
      : 0;

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
        brand: form.brand || undefined,
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

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setSavingCategory(true);
    try {
      const cat = await productsApi.createCategory(
        categoryName.trim(),
        categoryDescription.trim() || undefined,
      );
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, categoryId: cat.id }));
      setShowCategoryForm(false);
      setCategoryName('');
      setCategoryDescription('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear categoría');
    } finally {
      setSavingCategory(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-zinc-500">Catálogo e inventario inicial</p>
        </div>
        <div className="flex gap-2">
          <label className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium cursor-pointer hover:bg-[var(--muted)]">
            Importar Excel/CSV
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImporting(true);
                setImportResult(null);
                try {
                  const text = await file.text();
                  const rows = parseImportFile(text);
                  if (rows.length === 0) throw new Error('Archivo vacío o formato incorrecto');
                  const res = await productsApi.importBulk(rows);
                  setImportResult(`Importados: ${res.ok}/${res.total}. Fallidos: ${res.failed}`);
                  await load();
                } catch (err) {
                  setImportResult(err instanceof Error ? err.message : 'Error en importación');
                } finally {
                  setImporting(false);
                  e.target.value = '';
                }
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => setShowCategoryForm(true)}
            className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--muted)]"
          >
            + Categoría
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium"
          >
            + Nuevo producto
          </button>
        </div>
      </header>

      {importing && <p className="text-sm text-indigo-600">Importando productos...</p>}
      {importResult && <p className="text-sm text-slate-600">{importResult}</p>}
      <p className="text-xs text-zinc-500">
        CSV: código, descripción, marca, costo, utilidad%, stock (columnas separadas por coma o punto y coma)
      </p>

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
                <th className="text-left p-3">Código</th>
                <th className="text-left p-3">Descripción</th>
                <th className="text-left p-3">Marca</th>
                <th className="text-right p-3">Costo USD</th>
                <th className="text-right p-3">Utilidad %</th>
                <th className="text-right p-3">Stock</th>
                <th className="text-right p-3">Precio USD</th>
                <th className="text-center p-3">Kardex</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="p-3 font-mono text-xs">{p.sku}</td>
                  <td className="p-3">
                    <p className="font-medium">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-zinc-500 line-clamp-1">{p.description}</p>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{p.brand || '—'}</td>
                  <td className="p-3 text-right">{formatCurrency(p.costUsd)}</td>
                  <td className="p-3 text-right">{p.marginPercent}%</td>
                  <td className={`p-3 text-right font-medium ${p.isBelowMinStock ? 'text-red-500' : ''}`}>
                    {p.stock}
                  </td>
                  <td className="p-3 text-right">{formatCurrency(p.salePriceUsd)}</td>
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

      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
          <form
            onSubmit={handleCreateCategory}
            className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-6 w-full max-w-sm space-y-4"
          >
            <h2 className="text-lg font-bold">Nueva categoría</h2>
            <Field
              label="Nombre *"
              value={categoryName}
              onChange={setCategoryName}
              required
            />
            <Field
              label="Descripción"
              value={categoryDescription}
              onChange={setCategoryDescription}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCategoryForm(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingCategory}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50"
              >
                {savingCategory ? 'Guardando...' : 'Crear categoría'}
              </button>
            </div>
          </form>
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
            <Field label="Descripción (nombre) *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="Marca" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
            <Field label="Detalle adicional" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">Categoría</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm(true)}
                    className="text-xs text-[var(--primary)] hover:underline"
                  >
                    + Nueva categoría
                  </button>
                </div>
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
              <Field label="Utilidad % *" type="number" value={String(form.marginPercent)} onChange={(v) => setForm({ ...form, marginPercent: Number(v) })} required />
            </div>
            {previewSalePrice > 0 && (
              <p className="text-sm rounded-lg bg-indigo-50 text-indigo-800 px-3 py-2">
                Precio de venta (lo que verá el POS):{' '}
                <strong>{formatCurrency(previewSalePrice)}</strong>
                <span className="text-indigo-600/80 text-xs ml-1">
                  = costo + {form.marginPercent}% utilidad
                </span>
              </p>
            )}

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

function parseImportFile(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const header = lines[0].toLowerCase().split(sep).map((h) => h.trim());
  const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));

  const iSku = idx(['codigo', 'código', 'sku']);
  const iName = idx(['descripcion', 'descripción', 'nombre', 'name']);
  const iBrand = idx(['marca', 'brand']);
  const iCost = idx(['costo', 'cost']);
  const iMargin = idx(['utilidad', 'margen', 'margin']);
  const iStock = idx(['stock', 'cantidad', 'qty']);

  return lines.slice(1).map((line) => {
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    const sku = cols[iSku >= 0 ? iSku : 0] ?? '';
    const name = cols[iName >= 0 ? iName : 1] ?? sku;
    return {
      sku,
      name,
      brand: iBrand >= 0 ? cols[iBrand] : undefined,
      costUsd: Number(cols[iCost >= 0 ? iCost : 3]?.replace(',', '.') || 0),
      marginPercent: Number(cols[iMargin >= 0 ? iMargin : 4]?.replace(',', '.') || 30),
      stock: Number(cols[iStock >= 0 ? iStock : 5]?.replace(',', '.') || 0),
    };
  }).filter((r) => r.sku && r.name);
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
