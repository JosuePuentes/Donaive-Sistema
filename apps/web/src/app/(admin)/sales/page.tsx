'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { salesApi } from '@/lib/sales-api';
import { formatCurrency } from '@/lib/format-currency';
import type { Sale } from '@/lib/sales-api';

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    salesApi
      .list()
      .then(setSales)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar ventas'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Historial de Ventas</h1>
        <p className="text-sm text-zinc-500">Facturas POS confirmadas y métodos de pago aplicados</p>
      </div>

      {error ? <p className="text-red-600 text-sm">{error}</p> : null}

      {loading ? (
        <p className="text-zinc-500">Cargando ventas...</p>
      ) : (
        <div className="space-y-4">
          {sales.map((sale) => (
            <article key={sale.id} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--background)]">
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <div>
                  <p className="font-mono font-semibold">{sale.number}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(sale.confirmedAt ?? sale.createdAt).toLocaleString('es-VE')}
                    {sale.cashRegisterSession ? ` · Caja ${sale.cashRegisterSession.sessionNumber}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(Number(sale.totalUsd))}</p>
                  <p className="text-sm text-zinc-500">{formatCurrency(Number(sale.totalVes), 'VES')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase text-zinc-500 mb-1">Productos</p>
                  <ul className="space-y-1">
                    {sale.details.map((d) => (
                      <li key={d.id}>
                        {d.product.name} × {Number(d.quantity)} — {formatCurrency(Number(d.totalUsd))}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase text-zinc-500 mb-1">Pagos</p>
                  <ul className="space-y-1">
                    {sale.payments.map((p) => (
                      <li key={p.id}>
                        {p.paymentMethod.name}:{' '}
                        {p.amount < 0 ? '−' : ''}
                        {formatCurrency(Math.abs(Number(p.amount)), p.currency as 'USD' | 'VES')}
                        {p.reference === 'VUELTO' ? ' (vuelto)' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
          {sales.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No hay ventas registradas.</p>
          ) : null}
        </div>
      )}

      <Link href="/dashboard" className="text-sm text-[var(--primary)] underline">
        Ver informes gerenciales
      </Link>
    </div>
  );
}
