'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  calculateSalePriceUsd,
  calculateWeightedAverageCost,
  roundCurrency,
  usdToVes,
  BASE_CURRENCY,
  TRANSACTION_CURRENCY,
} from '@flp/shared';
import { productsApi } from '@/lib/inventory-api';
import { purchasesApi, suppliersApi, banksApi, pricingApi } from '@/lib/purchases-api';
import { formatCurrency } from '@/lib/format-currency';
import type { Supplier, BankAccount } from '@/types/purchases';
import type { Product } from '@/types/inventory';
import { consumePurchaseDraft } from '@/lib/purchase-draft';

interface LineDraft {
  key: string;
  productId: string;
  sku: string;
  name: string;
  currentStock: number;
  currentCostUsd: number;
  quantity: number;
  unitCostUsd: number;
  marginPercent: number;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function PurchaseForm() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [supplierControlNumber, setSupplierControlNumber] = useState('');
  const [tasaBcv, setTasaBcv] = useState(0);
  const [taxPercent, setTaxPercent] = useState(16);
  const [isCredit, setIsCredit] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fromSuggestion, setFromSuggestion] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [sups, accounts, rate] = await Promise.all([
          suppliersApi.list(),
          banksApi.accounts(),
          pricingApi.currentRate().catch(() => ({ tasaBcvMomento: 0, montoBs: 0 })),
        ]);
        setSuppliers(sups);
        setBankAccounts(accounts.filter((a) => a.isActive));
        setTasaBcv(rate.tasaBcvMomento);
        if (accounts.length > 0) setBankAccountId(accounts[0].id);

        const draft = consumePurchaseDraft();
        if (draft?.length) {
          setFromSuggestion(true);
          const enriched = await Promise.all(
            draft.map(async (d) => {
              try {
                const product = await productsApi.get(d.productId);
                return {
                  key: d.productId,
                  productId: d.productId,
                  sku: d.sku,
                  name: d.name,
                  currentStock: product.stock,
                  currentCostUsd: d.costUsd,
                  quantity: d.quantity,
                  unitCostUsd: d.costUsd,
                  marginPercent: d.marginPercent ?? product.marginPercent,
                };
              } catch {
                return {
                  key: d.productId,
                  productId: d.productId,
                  sku: d.sku,
                  name: d.name,
                  currentStock: 0,
                  currentCostUsd: d.costUsd,
                  quantity: d.quantity,
                  unitCostUsd: d.costUsd,
                  marginPercent: d.marginPercent ?? 0,
                };
              }
            }),
          );
          setLines(enriched);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (productSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await productsApi.list({ search: productSearch, limit: 8, isActive: true });
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const totals = useMemo(() => {
    const subtotalUsd = roundCurrency(
      lines.reduce((s, l) => s + l.quantity * l.unitCostUsd, 0),
      BASE_CURRENCY,
    );
    const taxUsd = roundCurrency(subtotalUsd * (taxPercent / 100), BASE_CURRENCY);
    const totalUsd = roundCurrency(subtotalUsd + taxUsd, BASE_CURRENCY);
    const totalVes = tasaBcv > 0 ? usdToVes(totalUsd, tasaBcv) : 0;
    return { subtotalUsd, taxUsd, totalUsd, totalVes };
  }, [lines, taxPercent, tasaBcv]);

  function addProduct(product: Product) {
    if (lines.some((l) => l.productId === product.id)) {
      alert('El producto ya está en la tabla');
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        key: product.id,
        productId: product.id,
        sku: product.sku,
        name: product.name,
        currentStock: product.stock,
        currentCostUsd: product.costUsd,
        quantity: 1,
        unitCostUsd: product.costUsd,
        marginPercent: product.marginPercent,
      },
    ]);
    setProductSearch('');
    setSearchResults([]);
  }

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function lineProjection(line: LineDraft) {
    const newCost = calculateWeightedAverageCost(
      line.currentStock,
      line.currentCostUsd,
      line.quantity,
      line.unitCostUsd,
    );
    const salePrice = calculateSalePriceUsd(newCost, line.marginPercent);
    return { newCost, salePrice, lineTotal: line.quantity * line.unitCostUsd };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!supplierId) {
      setError('Seleccione un proveedor');
      return;
    }
    if (!supplierInvoiceNumber.trim() || !supplierControlNumber.trim()) {
      setError('Indique número de factura y número de control del proveedor');
      return;
    }
    if (lines.length === 0) {
      setError('Agregue al menos un producto');
      return;
    }
    if (isCredit && !dueDate) {
      setError('Indique fecha de vencimiento para compra a crédito');
      return;
    }
    if (!isCredit && !bankAccountId) {
      setError('Seleccione cuenta bancaria para pago al contado');
      return;
    }
    if (tasaBcv <= 0) {
      setError('La tasa BCV debe ser mayor a cero');
      return;
    }

    setSaving(true);
    try {
      const purchase = await purchasesApi.create({
        supplierId,
        purchaseDate,
        supplierInvoiceNumber: supplierInvoiceNumber.trim(),
        supplierControlNumber: supplierControlNumber.trim(),
        tasaBcvMomento: tasaBcv,
        taxPercent,
        isCredit,
        dueDate: isCredit ? dueDate : undefined,
        bankAccountId: isCredit ? undefined : bankAccountId,
        notes: notes || undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitCostUsd: l.unitCostUsd,
          marginPercent: l.marginPercent,
        })),
      });
      router.push(`/admin/compras?created=${purchase.number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar compra');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-zinc-500">Cargando formulario de compra...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Nueva Compra</h1>
        <p className="text-sm text-zinc-500">
          Recepción de mercancía con actualización automática de inventario, costos y precios
        </p>
      </div>

      {fromSuggestion && (
        <p className="text-indigo-800 text-sm bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          Líneas importadas desde el motor de recomendaciones de compra. Revise cantidades y proveedor
          antes de guardar.
        </p>
      )}

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
      )}

      <section className="border border-[var(--border)] rounded-xl p-4 bg-[var(--muted)] space-y-4">
        <h2 className="font-semibold">Encabezado</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Proveedor *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
              required
            >
              <option value="">Seleccionar...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.businessName} ({s.rif})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Nº Factura proveedor *</label>
            <input
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
              placeholder="Ej: 00001234"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nº Control *</label>
            <input
              value={supplierControlNumber}
              onChange={(e) => setSupplierControlNumber(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
              placeholder="Ej: 00-00001234"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Fecha compra *</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tasa BCV (congelada) *</label>
            <input
              type="number"
              step="0.000001"
              min="0.000001"
              value={tasaBcv || ''}
              onChange={(e) => setTasaBcv(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] font-mono"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">IVA %</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={taxPercent}
              onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-sm font-medium">Condición de pago</label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsCredit(false)}
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  !isCredit ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)]'
                }`}
              >
                Contado
              </button>
              <button
                type="button"
                onClick={() => setIsCredit(true)}
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  isCredit ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)]'
                }`}
              >
                Crédito
              </button>
            </div>
          </div>
          {isCredit ? (
            <div>
              <label className="text-sm font-medium">Vencimiento crédito *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                required={isCredit}
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Cuenta de pago *</label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
              >
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName} ({a.accountNumber}) — {a.currency}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
          />
        </div>
      </section>

      <section className="border border-[var(--border)] rounded-xl p-4 space-y-4">
        <h2 className="font-semibold">Detalle de productos</h2>
        <div className="relative">
          <input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar por nombre, SKU o código de barras..."
            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--background)]"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 border border-[var(--border)] rounded-xl bg-[var(--background)] shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="w-full text-left px-4 py-2 hover:bg-[var(--muted)] border-b border-[var(--border)] last:border-0"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-zinc-500 ml-2">{p.sku}</span>
                  <span className="text-xs float-right">{formatCurrency(p.costUsd)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="text-left p-3">Producto</th>
                <th className="text-right p-3">Stock</th>
                <th className="text-right p-3">Cantidad</th>
                <th className="text-right p-3">Costo USD</th>
                <th className="text-right p-3">Margen %</th>
                <th className="text-right p-3">Nuevo costo</th>
                <th className="text-right p-3">Precio venta</th>
                <th className="text-right p-3">Subtotal</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const proj = lineProjection(line);
                return (
                  <tr key={line.key} className="border-t border-[var(--border)]">
                    <td className="p-3">
                      <p className="font-medium">{line.name}</p>
                      <p className="text-xs text-zinc-500">{line.sku}</p>
                    </td>
                    <td className="p-3 text-right text-zinc-500">{line.currentStock}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-[var(--border)] rounded text-right bg-[var(--background)]"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={line.unitCostUsd}
                        onChange={(e) => updateLine(line.key, { unitCostUsd: parseFloat(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 border border-[var(--border)] rounded text-right bg-[var(--background)] font-mono"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={line.marginPercent}
                        onChange={(e) => updateLine(line.key, { marginPercent: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-[var(--border)] rounded text-right bg-[var(--background)]"
                      />
                    </td>
                    <td className="p-3 text-right font-mono text-xs">{formatCurrency(proj.newCost)}</td>
                    <td className="p-3 text-right font-mono text-xs text-[var(--primary)]">
                      {formatCurrency(proj.salePrice)}
                    </td>
                    <td className="p-3 text-right font-medium">{formatCurrency(proj.lineTotal)}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-zinc-500">
                    Busque y agregue productos recibidos del proveedor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border border-[var(--border)] rounded-xl p-4 bg-[var(--muted)]">
        <div className="flex flex-wrap justify-end gap-6 text-sm">
          <div className="text-right">
            <p className="text-zinc-500">Subtotal</p>
            <p className="font-bold">{formatCurrency(totals.subtotalUsd)}</p>
            {tasaBcv > 0 && (
              <p className="text-xs text-zinc-500">{formatCurrency(usdToVes(totals.subtotalUsd, tasaBcv), TRANSACTION_CURRENCY)}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-zinc-500">IVA ({taxPercent}%)</p>
            <p className="font-bold">{formatCurrency(totals.taxUsd)}</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-500">Total general</p>
            <p className="font-bold text-lg">{formatCurrency(totals.totalUsd)}</p>
            {tasaBcv > 0 && (
              <p className="text-[var(--primary)] font-bold">{formatCurrency(totals.totalVes, TRANSACTION_CURRENCY)}</p>
            )}
          </div>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin/compras')}
          className="px-4 py-3 border border-[var(--border)] rounded-xl"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || lines.length === 0}
          className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-bold disabled:opacity-50"
        >
          {saving ? 'Procesando compra...' : 'Confirmar compra y actualizar inventario'}
        </button>
      </div>
    </form>
  );
}
