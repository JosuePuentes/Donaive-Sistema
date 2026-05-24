/**
 * Motor Multimoneda — Constantes y tipos base
 * Moneda base: USD | Moneda transaccional: VES
 */

export const BASE_CURRENCY = 'USD' as const;
export const TRANSACTION_CURRENCY = 'VES' as const;

export type CurrencyCode = typeof BASE_CURRENCY | typeof TRANSACTION_CURRENCY;

export interface MonetaryAmount {
  usd: number;
  ves: number;
  exchangeRate: number;
}

export interface ExchangeRateSnapshot {
  rate: number;
  rateDate: Date;
  source: 'BCV' | 'MANUAL';
}

/** Convierte un monto USD a VES usando la tasa BCV */
export function usdToVes(amountUsd: number, exchangeRate: number): number {
  return roundCurrency(amountUsd * exchangeRate, TRANSACTION_CURRENCY);
}

/** Convierte un monto VES a USD usando la tasa BCV */
export function vesToUsd(amountVes: number, exchangeRate: number): number {
  if (exchangeRate === 0) {
    throw new Error('La tasa de cambio no puede ser cero');
  }
  return roundCurrency(amountVes / exchangeRate, BASE_CURRENCY);
}

/** Redondeo bancario según moneda */
export function roundCurrency(amount: number, currency: CurrencyCode): number {
  const decimals = currency === BASE_CURRENCY ? 4 : 2;
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

/** Genera un par bimonetario con la misma tasa congelada */
export function toDualCurrency(
  amountUsd: number,
  exchangeRate: number,
): MonetaryAmount {
  return {
    usd: roundCurrency(amountUsd, BASE_CURRENCY),
    ves: usdToVes(amountUsd, exchangeRate),
    exchangeRate,
  };
}

/** Suma montos bimonetarios (deben compartir la misma tasa) */
export function sumDualCurrency(
  amounts: MonetaryAmount[],
): MonetaryAmount {
  if (amounts.length === 0) {
    return { usd: 0, ves: 0, exchangeRate: 0 };
  }

  const exchangeRate = amounts[0].exchangeRate;
  const inconsistentRate = amounts.some((a) => a.exchangeRate !== exchangeRate);
  if (inconsistentRate) {
    throw new Error(
      'No se pueden sumar montos con tasas de cambio diferentes. Use conversión previa.',
    );
  }

  const totalUsd = amounts.reduce((sum, a) => sum + a.usd, 0);
  return toDualCurrency(totalUsd, exchangeRate);
}
