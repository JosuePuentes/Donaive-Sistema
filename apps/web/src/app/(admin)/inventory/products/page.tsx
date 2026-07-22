'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { productsApi } from '@/lib/inventory-api';
import { ApiError, formatApiError } from '@/lib/api-error';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 50;
  const [searchDebounced, setSearchDebounced] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    originalRows: number;
    mergedRows: number;
    toCreate: number;
    toUpdate: number;
    rows: Array<{
      sku: string;
      name: string;
      action: 'CREATE' | 'UPDATE';
      stockToAdd: number;
      currentStock: number;
      stockAfter: number;
      currentName: string | null;
    }>;
  } | null>(null);
  const [pendingImportRows, setPendingImportRows] = useState<
    import('@/lib/product-import-parser').ProductImportRow[]
  >([]);

  const previewSalePrice =
    Number(form.costUsd) > 0
      ? Math.round(Number(form.costUsd) * (1 + Number(form.marginPercent) / 100) * 10000) / 10000
      : 0;

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, lowStockOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [prodRes, cats] = await Promise.all([
        productsApi.list({
          page,
          limit: PAGE_SIZE,
          ...(searchDebounced ? { search: searchDebounced } : {}),
          ...(lowStockOnly ? { lowStock: true } : {}),
        }),
        productsApi.categories(),
      ]);
      setProducts(prodRes.data);
      setTotalCount(prodRes.meta.total);
      setTotalPages(prodRes.meta.totalPages);
      setCategories(cats);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(formatApiError(err, 'Error al cargar productos'));
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, lowStockOnly, page]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      sku: p.sku,
      barcode: p.barcode ?? '',
      name: p.name,
      brand: p.brand ?? '',
      description: p.description ?? '',
      categoryId: p.categoryId ?? '',
      unit: p.unit,
      costUsd: p.costUsd,
      marginPercent: p.marginPercent,
      minStock: p.minStock,
      maxStock: p.maxStock != null ? String(p.maxStock) : '',
      allowNegativeStock: p.allowNegativeStock,
      initialStock: 0,
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
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
      };
      if (editingId) {
        await productsApi.update(editingId, payload);
      } else {
        await productsApi.create({
          ...payload,
          initialStock: Number(form.initialStock),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar producto');
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
          <p className="text-sm text-zinc-500">
            {loading ? 'Cargando...' : `${totalCount} producto${totalCount !== 1 ? 's' : ''} en catálogo`}
          </p>
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
                setImportPreview(null);
                try {
                  const { parseProductImportFile } = await import('@/lib/product-import-parser');
                  const rows = await parseProductImportFile(file);
                  if (rows.length === 0) {
                    throw new Error(
                      'No se leyeron productos. Use Excel (.xlsx) o CSV con encabezados: codigo, descripcion, marca, costo, utilidad, stock',
                    );
                  }
                  const preview = await productsApi.previewImport(rows);
                  setPendingImportRows(rows);
                  setImportPreview(preview);
                } catch (err) {
                  setImportResult(err instanceof Error ? err.message : 'Error al leer archivo');
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
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium"
          >
            + Nuevo producto
          </button>
        </div>
      </header>

      {importing && <p className="text-sm text-indigo-600">Importando productos...</p>}
      {importResult && <p className="text-sm text-slate-600">{importResult}</p>}
      <p className="text-xs text-zinc-500">
        Excel (.xlsx) o CSV. Columnas: codigo, descripcion, marca, costo, utilidad, stock. Costo con coma o punto:{' '}
        <strong>2,50</strong> o <strong>2.50</strong> o <strong>1.500,50</strong>. Utilidad: <strong>30</strong> o <strong>30%</strong>.
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 space-y-2">
          <p>{error}</p>
          {error.includes('Sesión expirada') && (
            <Link href="/login" className="inline-block font-medium underline">
              Ir a iniciar sesión
            </Link>
          )}
        </div>
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
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/50">
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
                  <td className="p-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="text-[var(--primary)] hover:underline text-xs font-medium mr-3"
                    >
                      Editar
                    </button>
                    <Link href={`/inventory/kardex?productId=${p.id}`} className="text-zinc-500 hover:underline text-xs">
                      Kardex
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-zinc-500">
            Página {page} de {totalPages} · {totalCount} productos
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border rounded-lg disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 border rounded-lg disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {importPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
          <div className="bg-[var(--background)] border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold">Vista previa de importación</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Filas en archivo: {importPreview.originalRows} → Códigos únicos:{' '}
                {importPreview.mergedRows} ({importPreview.toCreate} nuevos,{' '}
                {importPreview.toUpdate} actualizaciones). Mismo código = mismo producto; el stock se suma.
              </p>
            </div>
            <div className="overflow-auto flex-1 p-4">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)] sticky top-0">
                  <tr>
                    <th className="text-left p-2">Código</th>
                    <th className="text-left p-2">Acción</th>
                    <th className="text-left p-2">Descripción (archivo)</th>
                    <th className="text-left p-2">Nombre actual</th>
                    <th className="text-right p-2">Stock +</th>
                    <th className="text-right p-2">Stock final</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.map((r) => (
                    <tr key={r.sku} className="border-t">
                      <td className="p-2 font-mono text-xs">{r.sku}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            r.action === 'CREATE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.action === 'CREATE' ? 'Nuevo' : 'Actualizar'}
                        </span>
                      </td>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 text-zinc-500">{r.currentName ?? '—'}</td>
                      <td className="p-2 text-right">+{r.stockToAdd}</td>
                      <td className="p-2 text-right font-medium">{r.stockAfter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setImportPreview(null);
                  setPendingImportRows([]);
                }}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={async () => {
                  setImporting(true);
                  try {
                    const res = await productsApi.importBulk(pendingImportRows);
                    setImportPreview(null);
                    setPendingImportRows([]);
                    setImportResult(
                      `Importados: ${res.ok}/${res.total}. Fallidos: ${res.failed}`,
                    );
                    setSearch('');
                    await load();
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Error');
                  } finally {
                    setImporting(false);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {importing ? 'Importando...' : 'Confirmar importación'}
              </button>
            </div>
          </div>
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
            onSubmit={handleSave}
            className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"
          >
            <h2 className="text-lg font-bold">{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Código (SKU) *"
                value={form.sku}
                onChange={(v) => setForm({ ...form, sku: v })}
                required
                disabled={!!editingId}
              />
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

            <div className={`grid gap-3 ${editingId ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <Field label="Stock mínimo" type="number" value={String(form.minStock)} onChange={(v) => setForm({ ...form, minStock: Number(v) })} />
              <Field label="Stock máximo" type="number" value={form.maxStock} onChange={(v) => setForm({ ...form, maxStock: v })} />
              {!editingId && (
                <Field label="Stock inicial" type="number" value={String(form.initialStock)} onChange={(v) => setForm({ ...form, initialStock: Number(v) })} />
              )}
            </div>
            {editingId && (
              <p className="text-xs text-zinc-500">
                Para cambiar existencias use Kardex o Ajustes de inventario.
              </p>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowNegativeStock}
                onChange={(e) => setForm({ ...form, allowNegativeStock: e.target.checked })}
              />
              Permitir stock negativo
            </label>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear producto'}
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
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        step={type === 'number' ? 'any' : undefined}
        className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] disabled:opacity-60"
      />
    </div>
  );
}
