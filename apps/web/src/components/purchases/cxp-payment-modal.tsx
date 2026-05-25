'use client';

import { useEffect, useMemo, useState } from 'react';
import { computeCxpAbonoApplied } from '@flp/shared';
import { banksApi, cxpApi } from '@/lib/purchases-api';
import { pricingApi } from '@/lib/purchases-api';
import { formatCurrency } from '@/lib/format-currency';
import type { CxpPendiente, PaymentMethodTreasury } from '@/types/purchases';

interface CxpPaymentModalProps {
  open: boolean;
  items: CxpPendiente[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CxpPaymentModal({ open, items, onClose, onSuccess }: CxpPaymentModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodTreasury[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [tasaAbono, setTasaAbono] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setAmounts({});
    setError('');
    Promise.all([banksApi.paymentMethods(), pricingApi.currentRate()])
      .then(([methods, rate]) => {
        const active = methods.filter((m) => m.bankAccountId);
        setPaymentMethods(active);
        if (active.length > 0) setPaymentMethodId(active[0].id);
        setTasaAbono(rate.tasaBcvMomento);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar métodos de pago'));
  }, [open]);

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethodId);
  const paymentCurrency = (selectedMethod?.currency ?? 'USD') as 'USD' | 'VES';
  const saldoDisponible = selectedMethod ? Number(selectedMethod.balance) : 0;

  const lineas = useMemo(() => {
    return items
      .map((item) => {
        const raw = parseFloat(amounts[item.id] ?? '0');
        if (!raw || raw <= 0) return null;
        return {
          accountPayableId: item.id,
          amount: raw,
          currency: paymentCurrency,
        };
      })
      .filter(Boolean) as Array<{ accountPayableId: string; amount: number; currency: 'USD' | 'VES' }>;
  }, [amounts, items, paymentCurrency]);

  const totalAbono = useMemo(
    () => lineas.reduce((s, l) => s + l.amount, 0),
    [lineas],
  );

  const preview = useMemo(() => {
    if (tasaAbono <= 0) return [];
    return items
      .map((item) => {
        const raw = parseFloat(amounts[item.id] ?? '0');
        if (!raw || raw <= 0) return null;
        try {
          const applied = computeCxpAbonoApplied(
            { amount: raw, currency: paymentCurrency },
            tasaAbono,
          );
          return { item, applied };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{
      item: CxpPendiente;
      applied: ReturnType<typeof computeCxpAbonoApplied>;
    }>;
  }, [amounts, items, paymentCurrency, tasaAbono]);

  if (!open) return null;

  function fillSaldo(item: CxpPendiente) {
    const amount =
      paymentCurrency === 'USD' ? item.saldoPendienteUsd : item.saldoPendienteVes;
    setAmounts((prev) => ({ ...prev, [item.id]: amount.toFixed(2) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (lineas.length === 0) {
      setError('Indique al menos un monto de abono');
      return;
    }
    if (!paymentMethodId) {
      setError('Seleccione el método de pago');
      return;
    }
    if (totalAbono > saldoDisponible + 0.0001) {
      setError(
        `Saldo insuficiente en ${selectedMethod?.name}. Disponible: ${formatCurrency(saldoDisponible, paymentCurrency)}`,
      );
      return;
    }

    setLoading(true);
    try {
      await cxpApi.abonar({ paymentMethodId, lineas });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar abono');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--background)] rounded-2xl border border-[var(--border)] shadow-2xl"
      >
        <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] px-6 py-4 flex justify-between">
          <div>
            <h2 className="text-xl font-bold">Registrar Abono a Proveedor</h2>
            <p className="text-sm text-zinc-500">Tasa BCV del abono: {tasaAbono.toLocaleString('es-VE')} Bs/USD</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Método de pago *</label>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--muted)]"
            >
              {paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — disponible {formatCurrency(Number(m.balance), m.currency as 'USD' | 'VES')}
                </option>
              ))}
            </select>
            {selectedMethod ? (
              <p className="text-xs text-zinc-500 mt-1">
                Cuenta: {selectedMethod.bankAccount?.accountName ?? '—'} · Los abonos se registran en{' '}
                {paymentCurrency}. Saldo después del abono:{' '}
                {formatCurrency(Math.max(0, saldoDisponible - totalAbono), paymentCurrency)}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="border border-[var(--border)] rounded-xl p-3 bg-[var(--muted)]">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{item.supplier.businessName}</span>
                  <span className="font-mono text-xs">{item.purchase.supplierInvoiceNumber}</span>
                </div>
                <p className="text-xs text-zinc-500 mb-2">
                  Saldo: {formatCurrency(item.saldoPendienteUsd)} / {formatCurrency(item.saldoPendienteVes, 'VES')}
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step={paymentCurrency === 'USD' ? '0.0001' : '0.01'}
                    min="0"
                    placeholder={`Monto ${paymentCurrency}`}
                    value={amounts[item.id] ?? ''}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-right font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => fillSaldo(item)}
                    className="px-3 py-2 text-xs border border-[var(--border)] rounded-lg whitespace-nowrap"
                  >
                    Saldo completo
                  </button>
                </div>
                {preview.find((p) => p.item.id === item.id) && (
                  <p className="text-xs text-[var(--primary)] mt-1">
                    Amortiza {formatCurrency(preview.find((p) => p.item.id === item.id)!.applied.amountAppliedUsd)} al saldo USD
                  </p>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-[var(--border)] rounded-lg">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || lineas.length === 0}
              className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Confirmar abono'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
