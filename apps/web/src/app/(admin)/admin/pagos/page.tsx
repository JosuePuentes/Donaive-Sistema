'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { paymentsApi } from '@/lib/sales-api';
import { formatCurrency } from '@/lib/format-currency';
import type { DocumentPaymentHistory, SupplierAbonoHistory } from '@/lib/sales-api';

export default function PaymentsHistoryPage() {
  const [tab, setTab] = useState<'all' | 'sales' | 'purchases' | 'abonos'>('all');
  const [documentPayments, setDocumentPayments] = useState<DocumentPaymentHistory[]>([]);
  const [supplierAbonos, setSupplierAbonos] = useState<SupplierAbonoHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const type = tab === 'sales' ? 'sales' : tab === 'purchases' ? 'purchases' : undefined;

    Promise.all([
      tab === 'abonos' ? Promise.resolve([]) : paymentsApi.history(type),
      tab === 'all' || tab === 'abonos' ? paymentsApi.supplierAbonos() : Promise.resolve([]),
    ])
      .then(([docs, abonos]) => {
        setDocumentPayments(docs);
        setSupplierAbonos(abonos);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar historial'))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Historial de Pagos</h1>
        <p className="text-sm text-zinc-500">Movimientos documentales y abonos a proveedores</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'sales', 'purchases', 'abonos'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              tab === t
                ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                : 'border-[var(--border)]'
            }`}
          >
            {t === 'all' ? 'Todos' : t === 'sales' ? 'Ventas' : t === 'purchases' ? 'Compras' : 'Abonos CxP'}
          </button>
        ))}
      </div>

      {error ? <p className="text-red-600 text-sm">{error}</p> : null}
      {loading ? <p className="text-zinc-500">Cargando...</p> : null}

      {!loading && tab !== 'abonos' && (
        <section className="border border-[var(--border)] rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Referencia</th>
                <th className="text-left p-3">Método</th>
                <th className="text-right p-3">Monto</th>
                <th className="text-right p-3">USD</th>
              </tr>
            </thead>
            <tbody>
              {documentPayments.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="p-3">{new Date(p.paidAt).toLocaleString('es-VE')}</td>
                  <td className="p-3 text-xs">
                    {p.invoice ? (
                      <Link href="/sales" className="text-[var(--primary)] underline">
                        {p.invoice.number}
                      </Link>
                    ) : p.purchase ? (
                      <Link href={`/admin/compras/${p.purchase.id}`} className="text-[var(--primary)] underline">
                        {p.purchase.number}
                      </Link>
                    ) : (
                      p.reference
                    )}
                  </td>
                  <td className="p-3">{p.paymentMethod.name}</td>
                  <td className="p-3 text-right">
                    {formatCurrency(Number(p.amount), p.currency as 'USD' | 'VES')}
                  </td>
                  <td className="p-3 text-right">{formatCurrency(Number(p.amountUsd))}</td>
                </tr>
              ))}
              {documentPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    Sin movimientos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {!loading && (tab === 'all' || tab === 'abonos') && supplierAbonos.length > 0 && (
        <section className="border border-[var(--border)] rounded-xl overflow-x-auto">
          <h2 className="font-semibold p-4 border-b border-[var(--border)]">Abonos a proveedores</h2>
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Compra</th>
                <th className="text-left p-3">Proveedor</th>
                <th className="text-right p-3">Pagado</th>
                <th className="text-right p-3">Aplicado USD</th>
              </tr>
            </thead>
            <tbody>
              {supplierAbonos.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="p-3">{new Date(p.paidAt).toLocaleString('es-VE')}</td>
                  <td className="p-3 font-mono text-xs">{p.accountPayable.purchase.number}</td>
                  <td className="p-3">{p.accountPayable.purchase.supplier.businessName}</td>
                  <td className="p-3 text-right">
                    {formatCurrency(Number(p.amountPaid), p.currency as 'USD' | 'VES')}
                  </td>
                  <td className="p-3 text-right">{formatCurrency(Number(p.amountAppliedUsd))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Link href="/dashboard" className="text-sm text-[var(--primary)] underline">
        Volver a informes
      </Link>
    </div>
  );
}
