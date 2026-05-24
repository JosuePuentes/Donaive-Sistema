import { isBelowMinStock } from './inventory';

export const VMD_LOOKBACK_DAYS = 30;

export const COVERAGE_DAY_OPTIONS = [15, 30, 45, 60] as const;
export type CoverageDayOption = (typeof COVERAGE_DAY_OPTIONS)[number];

export interface DemandPlanningInput {
  currentStock: number;
  minStock: number;
  unitsSold30d: number;
  coverageTargetDays: number;
  abcClass?: 'A' | 'B' | 'C' | '—';
  daysSinceLastSale?: number | null;
}

export interface DemandPlanningResult {
  /** Volumen medio diario (unidades/día) */
  vmd: number;
  /** Unidades vendidas en ventana de análisis */
  unitsSold30d: number;
  /** Días de cobertura con stock actual; `null` si no hay rotación */
  runwayDays: number | null;
  /** Stock agotado con demanda activa */
  stockout: boolean;
  /** Por debajo de mínimo o quiebre con VMD > 0 */
  emergency: boolean;
  /** Clase A sin stock — demanda insatisfecha estimada */
  lostSalesRisk: boolean;
  /** Unidades de venta perdida estimadas (stockout + alta rotación) */
  estimatedLostUnits: number;
  /** (VMD × cobertura) − stock */
  suggestedQty: number;
  /** Puntuación para ordenar recomendaciones (mayor = más urgente) */
  priorityScore: number;
}

function roundQty(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value * 100) / 100;
}

/**
 * VMD = unidades vendidas en 30 días / 30
 */
export function calculateVmd(unitsSold30d: number, lookbackDays = VMD_LOOKBACK_DAYS): number {
  if (unitsSold30d <= 0 || lookbackDays <= 0) return 0;
  return unitsSold30d / lookbackDays;
}

/**
 * Días disponibles = stock / VMD. Con stock 0 y VMD > 0 → 0 (quiebre).
 */
export function calculateRunwayDays(currentStock: number, vmd: number): number | null {
  if (vmd <= 0) {
    return currentStock > 0 ? null : null;
  }
  if (currentStock <= 0) return 0;
  return roundQty(currentStock / vmd);
}

/**
 * Cantidad sugerida = (VMD × días cobertura objetivo) − stock actual
 */
export function calculateCoveragePurchaseQty(
  vmd: number,
  coverageTargetDays: number,
  currentStock: number,
): number {
  if (vmd <= 0 || coverageTargetDays <= 0) return 0;
  const targetUnits = vmd * coverageTargetDays;
  return roundQty(Math.max(0, targetUnits - currentStock));
}

export function calculateDemandPlanning(input: DemandPlanningInput): DemandPlanningResult {
  const {
    currentStock,
    minStock,
    unitsSold30d,
    coverageTargetDays,
    abcClass = '—',
    daysSinceLastSale = null,
  } = input;

  const vmd = calculateVmd(unitsSold30d);
  const runwayDays = calculateRunwayDays(currentStock, vmd);
  const stockout = currentStock <= 0 && vmd > 0;
  const belowMin = isBelowMinStock(currentStock, minStock);
  const emergency = belowMin || stockout;

  const isHighRunner = abcClass === 'A';
  const lostSalesRisk = stockout && isHighRunner && vmd > 0;
  const idleDays =
    daysSinceLastSale != null
      ? Math.min(Math.max(daysSinceLastSale, 0), VMD_LOOKBACK_DAYS)
      : VMD_LOOKBACK_DAYS;
  const estimatedLostUnits = lostSalesRisk ? roundQty(vmd * idleDays) : 0;

  let suggestedQty = calculateCoveragePurchaseQty(vmd, coverageTargetDays, currentStock);

  if (suggestedQty <= 0 && emergency && vmd > 0) {
    suggestedQty = calculateCoveragePurchaseQty(vmd, coverageTargetDays, 0);
  }

  if (suggestedQty <= 0 && belowMin && vmd <= 0) {
    suggestedQty = roundQty(Math.max(0, minStock - currentStock));
  }

  const runwayGap =
    runwayDays != null ? Math.max(0, coverageTargetDays - runwayDays) : vmd > 0 ? coverageTargetDays : 0;

  let priorityScore = suggestedQty;
  if (stockout) priorityScore += 1_000;
  if (lostSalesRisk) priorityScore += 500 + estimatedLostUnits;
  if (belowMin) priorityScore += 200;
  priorityScore += vmd * 20;
  priorityScore += runwayGap * 10;
  if (isHighRunner) priorityScore += 50;

  return {
    vmd: roundQty(vmd),
    unitsSold30d,
    runwayDays,
    stockout,
    emergency,
    lostSalesRisk,
    estimatedLostUnits,
    suggestedQty,
    priorityScore,
  };
}

export type RunwayVisualStatus = 'healthy' | 'warning' | 'critical' | 'stockout' | 'no_rotation';

export function getRunwayVisualStatus(
  runwayDays: number | null,
  stock: number,
  vmd: number,
): RunwayVisualStatus {
  if (stock <= 0 && vmd > 0) return 'stockout';
  if (runwayDays == null) return 'no_rotation';
  if (runwayDays <= 0) return 'stockout';
  if (runwayDays < 7) return 'critical';
  if (runwayDays <= 15) return 'warning';
  if (runwayDays > 30) return 'healthy';
  return 'warning';
}
