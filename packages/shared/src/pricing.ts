import {
  BASE_CURRENCY,
  roundCurrency,
  toDualCurrency,
  type MonetaryAmount,
} from './currency';

export interface ProductPricingInput {
  costUsd: number;
  marginPercent: number;
}

export interface ProductPricingResult {
  costUsd: number;
  marginPercent: number;
  salePriceUsd: number;
  salePriceVes: number;
  marginAmountUsd: number;
  grossProfitPercent: number;
}

export interface LineItemPricingInput {
  unitPriceUsd: number;
  quantity: number;
  discountUsd?: number;
  exchangeRate: number;
}

export interface LineItemPricingResult extends MonetaryAmount {
  unitPriceUsd: number;
  unitPriceVes: number;
  quantity: number;
  discountUsd: number;
  discountVes: number;
  subtotalUsd: number;
  subtotalVes: number;
}

/**
 * Calcula el precio de venta en USD a partir del costo y margen.
 * Fórmula: PrecioVenta = Costo × (1 + Margen% / 100)
 */
export function calculateSalePriceUsd(
  costUsd: number,
  marginPercent: number,
): number {
  if (costUsd < 0) {
    throw new Error('El costo no puede ser negativo');
  }
  return roundCurrency(costUsd * (1 + marginPercent / 100), BASE_CURRENCY);
}

/**
 * Calcula precio bimonetario completo de un producto.
 * Este es el núcleo del motor de precios del sistema.
 */
export function calculateProductPricing(
  input: ProductPricingInput,
  exchangeRate: number,
): ProductPricingResult {
  if (exchangeRate <= 0) {
    throw new Error('La tasa BCV debe ser mayor a cero');
  }

  const salePriceUsd = calculateSalePriceUsd(input.costUsd, input.marginPercent);
  const dual = toDualCurrency(salePriceUsd, exchangeRate);
  const marginAmountUsd = roundCurrency(
    salePriceUsd - input.costUsd,
    BASE_CURRENCY,
  );

  const grossProfitPercent =
    salePriceUsd > 0
      ? roundCurrency((marginAmountUsd / salePriceUsd) * 100, BASE_CURRENCY)
      : 0;

  return {
    costUsd: input.costUsd,
    marginPercent: input.marginPercent,
    salePriceUsd: dual.usd,
    salePriceVes: dual.ves,
    marginAmountUsd,
    grossProfitPercent,
  };
}

/**
 * Calcula totales de línea de documento (factura/compra) en ambas monedas.
 * Congela precios al exchangeRate de la transacción.
 */
export function calculateLineItemPricing(
  input: LineItemPricingInput,
): LineItemPricingResult {
  const { unitPriceUsd, quantity, discountUsd = 0, exchangeRate } = input;

  if (quantity <= 0) {
    throw new Error('La cantidad debe ser mayor a cero');
  }
  if (exchangeRate <= 0) {
    throw new Error('La tasa BCV debe ser mayor a cero');
  }

  const subtotalUsd = roundCurrency(
    unitPriceUsd * quantity - discountUsd,
    BASE_CURRENCY,
  );
  const dual = toDualCurrency(subtotalUsd, exchangeRate);
  const unitDual = toDualCurrency(unitPriceUsd, exchangeRate);
  const discountDual = toDualCurrency(discountUsd, exchangeRate);

  return {
    unitPriceUsd: unitDual.usd,
    unitPriceVes: unitDual.ves,
    quantity,
    discountUsd: discountDual.usd,
    discountVes: discountDual.ves,
    subtotalUsd: dual.usd,
    subtotalVes: dual.ves,
    usd: dual.usd,
    ves: dual.ves,
    exchangeRate,
  };
}

/**
 * Costo promedio ponderado en USD (para entradas de compra).
 * Fórmula: ((StockActual × CostoActual) + (CantEntrada × CostoEntrada)) / (StockActual + CantEntrada)
 */
export function calculateWeightedAverageCost(
  currentStock: number,
  currentCostUsd: number,
  incomingQuantity: number,
  incomingCostUsd: number,
): number {
  const totalStock = currentStock + incomingQuantity;

  if (totalStock === 0) {
    return 0;
  }

  if (currentStock === 0) {
    return roundCurrency(incomingCostUsd, BASE_CURRENCY);
  }

  const totalValue =
    currentStock * currentCostUsd + incomingQuantity * incomingCostUsd;

  return roundCurrency(totalValue / totalStock, BASE_CURRENCY);
}

/**
 * Utilidad bruta de una línea de venta
 */
export function calculateGrossProfit(
  unitSalePriceUsd: number,
  unitCostUsd: number,
  quantity: number,
): number {
  return roundCurrency(
    (unitSalePriceUsd - unitCostUsd) * quantity,
    BASE_CURRENCY,
  );
}
