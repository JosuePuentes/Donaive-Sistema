'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { purchasesApi } from '@/lib/purchases-api';
import { formatCurrency } from '@/lib/format-currency';
import type { Purchase } from '@/types/purchases';

export default function ComprasListContent() {
  const searchParams = useSearchParams();
  const created = searchParams.get('created');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    purchasesApi
      .list()
      .then(setPurchases)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar compras'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-zinc-500">Facturas de entrada y recepción de mercancía</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/inventory/products"
            className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium text-sm hover:bg-[var(--muted)]"
          >
            + Crear producto
          </Link>
          <Link
            href="/admin/compras/nueva"
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium text-sm"
          >
            + Nueva compra
          </Link>
        </div>
      </div>

      {created && (
        <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
          Compra {created} registrada correctamente. Inventario, costos y precios actualizados.
        </p>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {loading ? (
        <p className="text-zinc-500">Cargando compras...</p>
      ) : (
        <div className="border border-[var(--border)] rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="text-left p-3">Número</th>
                <th className="text-left p-3">Proveedor</th>
                <th className="text-left p-3">Factura / Control</th>
                <th className="text-left p-3">Fecha</th>
                <th className="text-right p-3">Total USD</th>
                <th className="text-right p-3">Total Bs</th>
                <th className="text-center p-3">Pago</th>
                <th className="text-center p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/50">
                  <td className="p-3 font-mono">
                    <Link href={`/admin/compras/${p.id}`} className="text-[var(--primary)] underline">
                      {p.number}
                    </Link>
                  </td>
                  <td className="p-3">{p.supplier?.businessName ?? '—'}</td>
                  <td className="p-3 text-xs">
                    {p.supplierInvoiceNumber}
                    <br />
                    <span className="text-zinc-500">{p.supplierControlNumber}</span>
                  </td>
                  <td className="p-3">{new Date(p.purchaseDate).toLocaleDateString('es-VE')}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(Number(p.totalUsd))}</td>
                  <td className="p-3 text-right">{formatCurrency(Number(p.totalVes), 'VES')}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${p.isCredit ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                      {p.isCredit ? 'Crédito' : 'Contado'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {p.accountPayable ? (
                      <span className="text-xs text-amber-700">CxP {p.accountPayable.status}</span>
                    ) : (
                      <span className="text-xs text-green-700">{p.status}</span>
                    )}
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500">
                    No hay compras registradas.{' '}
                    <Link href="/admin/compras/nueva" className="text-[var(--primary)] underline">
                      Crear la primera
                    </Link>
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
