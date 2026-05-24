import { roundCurrency, BASE_CURRENCY } from './currency';

export interface StockValidationInput {
  currentStock: number;
  requestedQuantity: number;
  allowNegativeStock: boolean;
}

export interface StockValidationResult {
  isValid: boolean;
  availableStock: number;
  stockAfter: number;
  errorMessage?: string;
}

/**
 * Valida si hay stock suficiente para una salida de inventario.
 * Respeta la configuración allowNegativeStock del producto.
 */
export function validateStockAvailability(
  input: StockValidationInput,
): StockValidationResult {
  const { currentStock, requestedQuantity, allowNegativeStock } = input;

  if (requestedQuantity <= 0) {
    return {
      isValid: false,
      availableStock: currentStock,
      stockAfter: currentStock,
      errorMessage: 'La cantidad solicitada debe ser mayor a cero',
    };
  }

  const stockAfter = roundCurrency(
    currentStock - requestedQuantity,
    BASE_CURRENCY,
  );

  if (stockAfter < 0 && !allowNegativeStock) {
    return {
      isValid: false,
      availableStock: currentStock,
      stockAfter,
      errorMessage: `Stock insuficiente. Disponible: ${currentStock}, Solicitado: ${requestedQuantity}`,
    };
  }

  return {
    isValid: true,
    availableStock: currentStock,
    stockAfter,
  };
}

/**
 * Calcula el nuevo stock tras un movimiento de inventario
 */
export function calculateStockAfterMovement(
  currentStock: number,
  quantity: number,
  isInbound: boolean,
): number {
  const delta = isInbound ? quantity : -quantity;
  return roundCurrency(currentStock + delta, BASE_CURRENCY);
}

/**
 * Determina si un producto está por debajo del stock mínimo
 */
export function isBelowMinStock(
  currentStock: number,
  minStock: number,
): boolean {
  return currentStock <= minStock;
}

/**
 * Sugerencia de compra basada en stock mínimo y máximo
 */
export function calculateSuggestedPurchaseQuantity(
  currentStock: number,
  minStock: number,
  maxStock?: number | null,
): number {
  if (currentStock >= minStock) {
    return 0;
  }

  const target = maxStock ?? minStock * 2;
  return Math.max(0, roundCurrency(target - currentStock, BASE_CURRENCY));
}
