import {
  BASE_CURRENCY,
  TRANSACTION_CURRENCY,
  type CurrencyCode,
  roundCurrency,
  usdToVes,
  vesToUsd,
} from './currency';

export interface CxpAbonoInput {
  amount: number;
  currency: CurrencyCode;
}

export interface CxpAbonoApplied {
  amountPaid: number;
  currency: CurrencyCode;
  amountAppliedUsd: number;
  amountAppliedVes: number;
}

const CXP_TOLERANCE_USD = 0.0001;

/** Calcula cuánto USD de deuda se amortiza con un abono en USD o VES */
export function computeCxpAbonoApplied(
  input: CxpAbonoInput,
  tasaBcvAbono: number,
): CxpAbonoApplied {
  if (input.amount <= 0) {
    throw new Error('El monto del abono debe ser mayor a cero');
  }
  if (tasaBcvAbono <= 0) {
    throw new Error('La tasa BCV del abono debe ser mayor a cero');
  }

  if (input.currency === BASE_CURRENCY) {
    const amountAppliedUsd = roundCurrency(input.amount, BASE_CURRENCY);
    return {
      amountPaid: amountAppliedUsd,
      currency: BASE_CURRENCY,
      amountAppliedUsd,
      amountAppliedVes: usdToVes(amountAppliedUsd, tasaBcvAbono),
    };
  }

  const amountAppliedUsd = vesToUsd(input.amount, tasaBcvAbono);
  return {
    amountPaid: roundCurrency(input.amount, TRANSACTION_CURRENCY),
    currency: TRANSACTION_CURRENCY,
    amountAppliedUsd,
    amountAppliedVes: roundCurrency(input.amount, TRANSACTION_CURRENCY),
  };
}

/** Calcula nuevos saldos tras abono (USD como fuente de verdad del saldo) */
export function computeCxpBalancesAfterAbono(
  currentBalanceUsd: number,
  currentBalanceVes: number,
  originalUsd: number,
  applied: CxpAbonoApplied,
  debtTasaBcvMomento: number,
): { balanceUsd: number; balanceVes: number; status: 'PENDING' | 'PARTIAL' | 'PAID' } {
  const newBalanceUsd = roundCurrency(currentBalanceUsd - applied.amountAppliedUsd, BASE_CURRENCY);

  if (newBalanceUsd < -CXP_TOLERANCE_USD) {
    throw new Error('El abono excede el saldo pendiente de la deuda');
  }

  const balanceUsd = Math.max(0, newBalanceUsd);
  let balanceVes: number;

  if (applied.currency === TRANSACTION_CURRENCY) {
    balanceVes = roundCurrency(Math.max(0, currentBalanceVes - applied.amountPaid), TRANSACTION_CURRENCY);
  } else {
    balanceVes = roundCurrency(
      Math.max(0, currentBalanceVes - usdToVes(applied.amountAppliedUsd, debtTasaBcvMomento)),
      TRANSACTION_CURRENCY,
    );
  }

  if (balanceUsd <= CXP_TOLERANCE_USD) {
    return { balanceUsd: 0, balanceVes: 0, status: 'PAID' };
  }

  if (balanceUsd < originalUsd - CXP_TOLERANCE_USD) {
    return { balanceUsd, balanceVes, status: 'PARTIAL' };
  }

  return { balanceUsd, balanceVes, status: 'PENDING' };
}

export { CXP_TOLERANCE_USD };
