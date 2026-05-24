'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { inventoryApi, productsApi } from '@/lib/inventory-api';
import { formatCurrency } from '@/lib/format-currency';
import type { InventoryMovement, Product } from '@/types/inventory';
import { MOVEMENT_TYPE_LABELS } from '@/types/inventory';

function KardexContent() {
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get('productId') ?? '';

  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState(productIdParam);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    productsApi.list({ limit: 200, isActive: true }).then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = productId
        ? await inventoryApi.kardex(productId, { limit: 100 })
        : await inventoryApi.movements({ limit: 100 });
      setMovements(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar kardex');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kardex de Inventario</h1>
        <p className="text-sm text-zinc-500">Movimientos en tiempo real</p>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-48">
          <label className="text-sm font-medium">Producto</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
            ))}
          </select>
        </div>
        {selectedProduct && (
          <div className="text-sm bg-[var(--muted)] px-4 py-2 rounded-lg">
            Stock actual: <strong>{selectedProduct.stock}</strong>
          </div>
        )}
        <button
          onClick={loadMovements}
          className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-sm">
          {error}. <Link href="/login" className="underline">Iniciar sesión</Link>
        </p>
      )}

      {loading ? (
        <p className="text-zinc-500">Cargando movimientos...</p>
      ) : (
        <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Producto</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-right p-3">Cantidad</th>
                <th className="text-right p-3">Stock Ant.</th>
                <th className="text-right p-3">Stock Desp.</th>
                <th className="text-right p-3">Costo USD</th>
                <th className="text-left p-3">Referencia</th>
                <th className="text-left p-3">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t border-[var(--border)]">
                  <td className="p-3 text-xs whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString('es-VE')}
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{m.product.name}</p>
                    <p className="text-xs text-zinc-500">{m.product.sku}</p>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      m.movementType.includes('IN') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {MOVEMENT_TYPE_LABELS[m.movementType] ?? m.movementType}
                    </span>
                  </td>
                  <td className="p-3 text-right font-medium">{m.quantity}</td>
                  <td className="p-3 text-right text-zinc-500">{m.stockBefore}</td>
                  <td className="p-3 text-right font-medium">{m.stockAfter}</td>
                  <td className="p-3 text-right">{formatCurrency(m.unitCostUsd)}</td>
                  <td className="p-3 text-xs font-mono">{m.referenceNumber ?? '—'}</td>
                  <td className="p-3 text-xs">{m.createdBy.firstName} {m.createdBy.lastName}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-500">
                    Sin movimientos registrados
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

export default function KardexPage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Cargando...</p>}>
      <KardexContent />
    </Suspense>
  );
}
