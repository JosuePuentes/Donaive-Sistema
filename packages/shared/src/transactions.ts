import { toDualCurrency, type MonetaryAmount } from './currency';

export interface FrozenTransactionTotals {
  tasaBcvMomento: number;
  subtotalUsd: number;
  subtotalVes: number;
  taxUsd: number;
  taxVes: number;
  discountUsd: number;
  discountVes: number;
  totalUsd: number;
  totalVes: number;
}

export interface TransactionLineInput {
  unitPriceUsd: number;
  quantity: number;
  discountUsd?: number;
}

export interface FrozenTransactionLine {
  unitPriceUsd: number;
  unitPriceVes: number;
  quantity: number;
  discountUsd: number;
  discountVes: number;
  totalUsd: number;
  totalVes: number;
  tasaBcvMomento: number;
}

/**
 * Congela una línea de transacción (compra/venta) con la tasa BCV del momento.
 * Regla de Oro: los montos VES quedan estáticos para auditoría histórica.
 */
export function freezeTransactionLine(
  input: TransactionLineInput,
  tasaBcvMomento: number,
): FrozenTransactionLine {
  if (tasaBcvMomento <= 0) {
    throw new Error('La tasa BCV del momento debe ser mayor a cero');
  }

  const discountUsd = input.discountUsd ?? 0;
  const subtotalUsd = input.unitPriceUsd * input.quantity - discountUsd;
  const dual = toDualCurrency(subtotalUsd, tasaBcvMomento);
  const unitDual = toDualCurrency(input.unitPriceUsd, tasaBcvMomento);
  const discountDual = toDualCurrency(discountUsd, tasaBcvMomento);

  return {
    unitPriceUsd: unitDual.usd,
    unitPriceVes: unitDual.ves,
    quantity: input.quantity,
    discountUsd: discountDual.usd,
    discountVes: discountDual.ves,
    totalUsd: dual.usd,
    totalVes: dual.ves,
    tasaBcvMomento,
  };
}

/**
 * Congela totales de documento (factura/compra) con tasa BCV del momento.
 */
export function freezeTransactionTotals(
  lines: FrozenTransactionLine[],
  tasaBcvMomento: number,
  options?: { taxUsd?: number; discountUsd?: number },
): FrozenTransactionTotals {
  const taxUsd = options?.taxUsd ?? 0;
  const discountUsd = options?.discountUsd ?? 0;

  const subtotalUsd = lines.reduce((sum, l) => sum + l.totalUsd, 0);
  const subtotalDual = toDualCurrency(subtotalUsd, tasaBcvMomento);
  const taxDual = toDualCurrency(taxUsd, tasaBcvMomento);
  const discountDual = toDualCurrency(discountUsd, tasaBcvMomento);
  const totalUsd = subtotalUsd + taxUsd - discountUsd;
  const totalDual = toDualCurrency(totalUsd, tasaBcvMomento);

  return {
    tasaBcvMomento,
    subtotalUsd: subtotalDual.usd,
    subtotalVes: subtotalDual.ves,
    taxUsd: taxDual.usd,
    taxVes: taxDual.ves,
    discountUsd: discountDual.usd,
    discountVes: discountDual.ves,
    totalUsd: totalDual.usd,
    totalVes: totalDual.ves,
  };
}

export type { MonetaryAmount };
