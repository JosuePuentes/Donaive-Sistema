'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Banknote, CheckCircle2 } from 'lucide-react';
import {
  buildChangeAmount,
  computePosPaymentSummary,
  remainingInCurrency,
  roundCurrency,
  BASE_CURRENCY,
  sumPaymentsUsd,
  type CurrencyCode,
  type PosChangeInput,
  type PosPaymentInput,
} from '@flp/shared';
import { formatCurrency } from '@/lib/format-currency';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/cn';

export interface PosPaymentMethod {
  id: string;
  code: string;
  name: string;
  currency: string;
  type: string;
}

interface PosPaymentModalProps {
  open: boolean;
  totalUsd: number;
  totalVes: number;
  tasaBcv: number;
  paymentMethods: PosPaymentMethod[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    payments: PosPaymentInput[];
    change?: PosChangeInput;
  }) => void;
}

export function PosPaymentModal({
  open,
  totalUsd,
  totalVes,
  tasaBcv,
  paymentMethods,
  loading = false,
  onClose,
  onConfirm,
}: PosPaymentModalProps) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [changeCurrency, setChangeCurrency] = useState<CurrencyCode>('USD');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setAmounts({});
      setChangeCurrency('USD');
      setError('');
    }
  }, [open]);

  const cashMethods = useMemo(
    () => paymentMethods.filter((m) => m.type === 'CASH_USD' || m.type === 'CASH_VES'),
    [paymentMethods],
  );

  const payments = useMemo((): PosPaymentInput[] => {
    return paymentMethods
      .map((method) => {
        const raw = parseFloat(amounts[method.id] ?? '0');
        if (!raw || raw <= 0) return null;
        return {
          paymentMethodId: method.id,
          amount: raw,
          currency: method.currency as CurrencyCode,
        };
      })
      .filter((p): p is PosPaymentInput => p !== null);
  }, [amounts, paymentMethods]);

  const summary = useMemo(
    () => computePosPaymentSummary(totalUsd, payments, tasaBcv),
    [totalUsd, payments, tasaBcv],
  );

  const changeMethod = useMemo(
    () => cashMethods.find((m) => m.currency === changeCurrency) ?? cashMethods[0],
    [cashMethods, changeCurrency],
  );

  const changeAmount = useMemo(() => {
    if (summary.overpaymentUsd <= 0 || !changeMethod) return 0;
    return buildChangeAmount(summary.overpaymentUsd, changeCurrency, tasaBcv);
  }, [summary.overpaymentUsd, changeCurrency, tasaBcv, changeMethod]);

  if (!open) return null;

  function setAmount(methodId: string, value: string) {
    setAmounts((prev) => ({ ...prev, [methodId]: value }));
  }

  function fillExact(method: PosPaymentMethod) {
    const otherPayments = payments.filter((p) => p.paymentMethodId !== method.id);
    const paidWithoutThis = sumPaymentsUsd(otherPayments, tasaBcv);
    const remainingForMethod = roundCurrency(
      Math.max(0, totalUsd - paidWithoutThis),
      BASE_CURRENCY,
    );
    if (remainingForMethod <= 0) return;
    const amountInCurrency = remainingInCurrency(
      remainingForMethod,
      method.currency as CurrencyCode,
      tasaBcv,
    );
    setAmount(method.id, amountInCurrency.toFixed(2));
  }

  function handleConfirm() {
    setError('');

    if (!summary.isFullyPaid) {
      setError(`Faltan ${formatCurrency(summary.remainingUsd)} por cubrir la factura`);
      return;
    }

    let change: PosChangeInput | undefined;
    if (summary.overpaymentUsd > 0) {
      if (!changeMethod) {
        setError('No hay método de efectivo configurado para entregar vuelto');
        return;
      }
      change = {
        paymentMethodId: changeMethod.id,
        currency: changeCurrency,
        amount: changeAmount,
      };
    }

    onConfirm({ payments, change });
  }

  const isExact = summary.remainingUsd <= 0 && summary.overpaymentUsd <= 0;
  const hasChange = summary.overpaymentUsd > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-slate-900/40"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-900/20 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Cobro mixto</h2>
            <p className="text-sm text-slate-500 mt-0.5">Registre los pagos del cliente</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid lg:grid-cols-[1fr_320px] gap-0 min-h-0">
            <div className="p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Métodos de pago
              </p>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{method.name}</p>
                        <p className="text-xs text-slate-500">{method.currency}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fillExact(method)}
                        disabled={summary.remainingUsd <= 0}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all duration-200"
                      >
                        Monto exacto
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amounts[method.id] ?? ''}
                      onChange={(e) => setAmount(method.id, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-2xl font-bold tracking-tight text-slate-800 tabular-nums text-right focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all duration-200"
                    />
                  </div>
                ))}
              </div>

              {hasChange && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Vuelto en efectivo
                  </p>
                  <div className="flex gap-2">
                    {(['USD', 'VES'] as CurrencyCode[]).map((cur) => {
                      const available = cashMethods.some((m) => m.currency === cur);
                      if (!available) return null;
                      return (
                        <button
                          key={cur}
                          type="button"
                          onClick={() => setChangeCurrency(cur)}
                          className={cn(
                            'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200',
                            changeCurrency === cur
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                          )}
                        >
                          {cur === 'USD' ? 'USD' : 'Bolívares'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {error ? <Alert variant="danger">{error}</Alert> : null}
            </div>

            <div className="p-6 bg-slate-50/80 space-y-4 lg:sticky lg:top-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Estado del cobro
              </p>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Total factura
                </p>
                <p className="text-2xl font-bold tabular-nums text-slate-900 mt-1">
                  {formatCurrency(totalUsd)}
                </p>
                <p className="text-sm text-slate-500 tabular-nums mt-0.5">
                  {formatCurrency(totalVes, 'VES')}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Total pagado
                </p>
                <p className="text-xl font-bold tabular-nums text-slate-800 mt-1">
                  {formatCurrency(summary.totalPaidUsd)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Tasa {tasaBcv.toLocaleString('es-VE')} Bs/USD
                </p>
              </div>

              <div
                className={cn(
                  'rounded-xl border p-4 transition-all duration-200',
                  summary.remainingUsd > 0
                    ? 'border-amber-200 bg-amber-50'
                    : isExact
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-white',
                )}
              >
                <p
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider',
                    summary.remainingUsd > 0 ? 'text-amber-700' : 'text-emerald-700',
                  )}
                >
                  {summary.remainingUsd > 0 ? 'Resta por pagar' : 'Estado'}
                </p>
                {summary.remainingUsd > 0 ? (
                  <p className="text-3xl font-bold tabular-nums text-amber-800 mt-2">
                    {formatCurrency(summary.remainingUsd)}
                  </p>
                ) : isExact ? (
                  <div className="flex items-center gap-2 mt-2 text-emerald-700">
                    <CheckCircle2 className="h-6 w-6 shrink-0" />
                    <p className="text-lg font-bold">Pago exacto</p>
                  </div>
                ) : null}
              </div>

              {hasChange && (
                <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-800 mb-2">
                    <Banknote className="h-5 w-5" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      Vuelto a entregar
                    </p>
                  </div>
                  <p className="text-3xl font-bold tabular-nums text-emerald-700">
                    {formatCurrency(changeAmount, changeCurrency)}
                  </p>
                  <p className="text-xs text-emerald-600 mt-2 tabular-nums">
                    Equivalente {formatCurrency(summary.overpaymentUsd)} USD
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-slate-100 bg-white">
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={loading} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={handleConfirm}
            disabled={loading || !summary.isFullyPaid || payments.length === 0}
            className="flex-[2]"
          >
            {loading ? 'Procesando...' : 'Confirmar cobro'}
          </Button>
        </div>
      </div>
    </div>
  );
}
