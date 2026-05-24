import {
  BASE_CURRENCY,
  TRANSACTION_CURRENCY,
  type CurrencyCode,
  roundCurrency,
  usdToVes,
  vesToUsd,
} from './currency';

export interface PosPaymentInput {
  paymentMethodId: string;
  amount: number;
  currency: CurrencyCode;
}

export interface PosChangeInput {
  paymentMethodId: string;
  currency: CurrencyCode;
  amount: number;
}

export interface PosPaymentSummary {
  totalPaidUsd: number;
  remainingUsd: number;
  overpaymentUsd: number;
  isFullyPaid: boolean;
  changeUsd: number;
}

const PAYMENT_TOLERANCE_USD = 0.0001;

export function convertPaymentToUsd(
  amount: number,
  currency: CurrencyCode,
  tasaBcv: number,
): number {
  if (amount === 0) return 0;
  return currency === BASE_CURRENCY
    ? roundCurrency(amount, BASE_CURRENCY)
    : vesToUsd(amount, tasaBcv);
}

export function sumPaymentsUsd(
  payments: PosPaymentInput[],
  tasaBcv: number,
): number {
  return roundCurrency(
    payments.reduce(
      (sum, payment) =>
        sum + convertPaymentToUsd(payment.amount, payment.currency, tasaBcv),
      0,
    ),
    BASE_CURRENCY,
  );
}

export function computePosPaymentSummary(
  totalUsd: number,
  payments: PosPaymentInput[],
  tasaBcv: number,
): PosPaymentSummary {
  const totalPaidUsd = sumPaymentsUsd(
    payments.filter((p) => p.amount > 0),
    tasaBcv,
  );
  const remainingUsd = roundCurrency(
    Math.max(0, totalUsd - totalPaidUsd),
    BASE_CURRENCY,
  );
  const overpaymentUsd = roundCurrency(
    Math.max(0, totalPaidUsd - totalUsd),
    BASE_CURRENCY,
  );

  return {
    totalPaidUsd,
    remainingUsd,
    overpaymentUsd,
    isFullyPaid: totalPaidUsd + PAYMENT_TOLERANCE_USD >= totalUsd,
    changeUsd: overpaymentUsd,
  };
}

export function buildChangeAmount(
  overpaymentUsd: number,
  currency: CurrencyCode,
  tasaBcv: number,
): number {
  if (overpaymentUsd <= 0) return 0;
  return currency === BASE_CURRENCY
    ? overpaymentUsd
    : usdToVes(overpaymentUsd, tasaBcv);
}

export function remainingInCurrency(
  remainingUsd: number,
  currency: CurrencyCode,
  tasaBcv: number,
): number {
  if (remainingUsd <= 0) return 0;
  return currency === BASE_CURRENCY
    ? remainingUsd
    : usdToVes(remainingUsd, tasaBcv);
}

export function validatePosPayments(
  totalUsd: number,
  payments: PosPaymentInput[],
  tasaBcv: number,
  change?: PosChangeInput | null,
): { valid: true } | { valid: false; message: string } {
  const activePayments = payments.filter((p) => p.amount > 0);

  if (activePayments.length === 0) {
    return { valid: false, message: 'Debe registrar al menos un pago' };
  }

  for (const payment of activePayments) {
    if (payment.amount <= 0) {
      return { valid: false, message: 'Los montos de pago deben ser mayores a cero' };
    }
    if (!['USD', 'VES'].includes(payment.currency)) {
      return { valid: false, message: 'Moneda de pago no válida' };
    }
  }

  const summary = computePosPaymentSummary(totalUsd, activePayments, tasaBcv);

  if (!summary.isFullyPaid) {
    return {
      valid: false,
      message: `Pago insuficiente. Restan ${summary.remainingUsd.toFixed(4)} USD por cubrir`,
    };
  }

  if (summary.overpaymentUsd > PAYMENT_TOLERANCE_USD) {
    if (!change || change.amount <= 0) {
      return { valid: false, message: 'Debe indicar el vuelto a entregar' };
    }
    const changeUsd = convertPaymentToUsd(change.amount, change.currency, tasaBcv);
    if (Math.abs(changeUsd - summary.overpaymentUsd) > 0.01) {
      return {
        valid: false,
        message: `El vuelto (${changeUsd.toFixed(2)} USD) no coincide con el sobrepago (${summary.overpaymentUsd.toFixed(2)} USD)`,
      };
    }
  } else if (change && change.amount > 0) {
    return { valid: false, message: 'No hay sobrepago; no debe indicar vuelto' };
  }

  return { valid: true };
}

export { PAYMENT_TOLERANCE_USD, TRANSACTION_CURRENCY };
