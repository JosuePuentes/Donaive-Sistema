'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { purchasesApi } from '@/lib/purchases-api';
import { formatCurrency } from '@/lib/format-currency';

interface PurchaseDetail {
  id: string;
  number: string;
  status: string;
  purchaseDate: string;
  supplierInvoiceNumber: string;
  supplierControlNumber: string;
  totalUsd: number;
  totalVes: number;
  isCredit: boolean;
  supplier?: { businessName: string; rif: string };
  details?: Array<{
    id: string;
    quantity: number;
    unitCostUsd: number;
    totalUsd: number;
    product?: { sku: string; name: string; unit?: string };
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    currency: string;
    amountUsd: number;
    reference: string | null;
    paidAt: string;
    paymentMethod?: { name: string; code: string };
    bankAccount?: { accountName: string; currency: string };
  }>;
  accountPayable?: {
    status: string;
    dueDate: string;
    balanceUsd: number;
    balanceVes: number;
    supplierPayments?: Array<{
      id: string;
      amountPaid: number;
      currency: string;
      amountAppliedUsd: number;
      paidAt: string;
      reference: string | null;
      paymentMethod?: { name: string; code: string };
      bankAccount?: { accountName: string; currency: string };
      createdBy?: { firstName: string; lastName: string } | null;
    }>;
  } | null;
}

export default function PurchaseDetailPage() {
  const params = useParams<{ id: string }>();
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params.id) return;
    purchasesApi
      .get(params.id)
      .then((data) => setPurchase(data as PurchaseDetail))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar compra'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="text-zinc-500">Cargando compra...</p>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!purchase) return <p className="text-zinc-500">Compra no encontrada</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/compras" className="text-sm text-[var(--primary)] underline">
          ← Compras
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold">{purchase.number}</h1>
        <p className="text-sm text-zinc-500">
          {purchase.supplier?.businessName} · {purchase.supplier?.rif}
        </p>
      </header>

      <section className="grid sm:grid-cols-2 gap-4">
        <div className="border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase">Factura proveedor</p>
          <p className="font-medium">{purchase.supplierInvoiceNumber}</p>
          <p className="text-sm text-zinc-500">{purchase.supplierControlNumber}</p>
        </div>
        <div className="border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase">Totales</p>
          <p className="font-bold">{formatCurrency(Number(purchase.totalUsd))}</p>
          <p className="text-sm">{formatCurrency(Number(purchase.totalVes), 'VES')}</p>
          <p className="text-xs mt-1">{purchase.isCredit ? 'Crédito' : 'Contado'} · {purchase.status}</p>
        </div>
      </section>

      <section className="border border-[var(--border)] rounded-xl overflow-x-auto">
        <h2 className="font-semibold p-4 border-b border-[var(--border)]">Líneas recibidas</h2>
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th className="text-left p-3">Producto</th>
              <th className="text-right p-3">Cant.</th>
              <th className="text-right p-3">Costo USD</th>
              <th className="text-right p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {purchase.details?.map((d) => (
              <tr key={d.id} className="border-t border-[var(--border)]">
                <td className="p-3">
                  {d.product?.name}
                  <span className="block text-xs text-zinc-500 font-mono">{d.product?.sku}</span>
                </td>
                <td className="p-3 text-right">{Number(d.quantity)}</td>
                <td className="p-3 text-right">{formatCurrency(Number(d.unitCostUsd))}</td>
                <td className="p-3 text-right">{formatCurrency(Number(d.totalUsd))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {purchase.payments && purchase.payments.length > 0 && (
        <section className="border border-[var(--border)] rounded-xl p-4">
          <h2 className="font-semibold mb-3">Pagos registrados</h2>
          <ul className="space-y-2 text-sm">
            {purchase.payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-2">
                <span>
                  {p.paymentMethod?.name} · {p.reference}
                  {p.bankAccount ? ` (${p.bankAccount.accountName})` : ''}
                </span>
                <span className="font-medium">
                  {formatCurrency(Number(p.amount), p.currency as 'USD' | 'VES')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {purchase.accountPayable && (
        <section className="border border-[var(--border)] rounded-xl p-4">
          <h2 className="font-semibold mb-1">Cuenta por pagar</h2>
          <p className="text-sm text-zinc-500 mb-3">
            Vence: {new Date(purchase.accountPayable.dueDate).toLocaleDateString('es-VE')} · Saldo:{' '}
            {formatCurrency(Number(purchase.accountPayable.balanceUsd))} /{' '}
            {formatCurrency(Number(purchase.accountPayable.balanceVes), 'VES')} ·{' '}
            {purchase.accountPayable.status}
          </p>
          {purchase.accountPayable.supplierPayments &&
            purchase.accountPayable.supplierPayments.length > 0 && (
              <>
                <h3 className="text-sm font-medium mb-2">Historial de abonos</h3>
                <ul className="space-y-2 text-sm">
                  {purchase.accountPayable.supplierPayments.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2 border-t border-[var(--border)] pt-2">
                      <span>
                        {new Date(p.paidAt).toLocaleString('es-VE')} · {p.paymentMethod?.name}
                        {p.createdBy
                          ? ` · ${p.createdBy.firstName} ${p.createdBy.lastName}`
                          : ''}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(Number(p.amountPaid), p.currency as 'USD' | 'VES')} (
                        {formatCurrency(Number(p.amountAppliedUsd))} USD)
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
        </section>
      )}
    </div>
  );
}
