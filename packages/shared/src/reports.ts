import { roundCurrency, BASE_CURRENCY } from './currency';
import { isBelowMinStock } from './inventory';

export interface PurchaseSuggestionInput {
  currentStock: number;
  minStock: number;
  maxStock?: number | null;
  avgMonthlySales: number;
}

export interface PurchaseSuggestionResult {
  suggestedQty: number;
  emergency: boolean;
  targetStock: number;
}

/**
 * CantidadSugerida = (StockMaximo - StockActual) + VentasPromedioMensuales
 * Alerta de emergencia cuando StockActual <= StockMinimo
 */
export function calculateAdvancedPurchaseSuggestion(
  input: PurchaseSuggestionInput,
): PurchaseSuggestionResult {
  const { currentStock, minStock, maxStock, avgMonthlySales } = input;
  const targetStock = maxStock ?? minStock * 2;
  const emergency = isBelowMinStock(currentStock, minStock);

  const gapToMax = Math.max(0, targetStock - currentStock);
  const suggestedQty = roundCurrency(gapToMax + Math.max(0, avgMonthlySales), BASE_CURRENCY);

  return {
    suggestedQty: suggestedQty > 0 ? suggestedQty : emergency ? roundCurrency(minStock - currentStock + avgMonthlySales, BASE_CURRENCY) : 0,
    emergency,
    targetStock,
  };
}

/** Utilidad bruta real desde línea de factura con costo congelado */
export function calculateLineGrossProfit(
  totalUsd: number,
  unitCostUsd: number,
  quantity: number,
): number {
  return roundCurrency(totalUsd - unitCostUsd * quantity, BASE_CURRENCY);
}

/** Clasificación ABC por participación acumulada en ingresos */
export function classifyAbc(cumulativePercent: number): 'A' | 'B' | 'C' {
  if (cumulativePercent <= 80) return 'A';
  if (cumulativePercent <= 95) return 'B';
  return 'C';
}

export function calculateMarginPercent(revenueUsd: number, profitUsd: number): number {
  if (revenueUsd <= 0) return 0;
  return roundCurrency((profitUsd / revenueUsd) * 100, BASE_CURRENCY);
}
