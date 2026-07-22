export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string | null;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  brand: string;
  description: string | null;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
  unit: string;
  costUsd: number;
  marginPercent: number;
  salePriceUsd: number;
  salePriceVes?: number;
  costVes?: number;
  tasaBcvActual?: number;
  tasaBcvFecha?: string;
  stock: number;
  minStock: number;
  maxStock: number | null;
  allowNegativeStock: boolean;
  isActive: boolean;
  isBelowMinStock: boolean;
  branchStocks?: Array<{
    branchId: string;
    branchCode: string;
    branchName: string;
    stock: number;
    isOwn: boolean;
  }>;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  product: { id: string; sku: string; name: string; brand?: string; unit: string };
  movementType: string;
  quantity: number;
  unitCostUsd: number;
  totalCostUsd: number;
  stockBefore: number;
  stockAfter: number;
  referenceNumber: string | null;
  notes: string | null;
  createdBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface AdjustmentLine {
  id: string;
  productId: string;
  movementType: string;
  quantity: number;
  product: { id: string; sku: string; name: string; unit?: string };
}

export interface InventoryAdjustment {
  id: string;
  number: string;
  reason: string;
  notes: string | null;
  status: string;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string };
  lines: AdjustmentLine[];
}

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASE_IN: 'Compra (Entrada)',
  SALE_OUT: 'Venta (Salida)',
  ADJUSTMENT_IN: 'Ajuste (Entrada)',
  ADJUSTMENT_OUT: 'Ajuste (Salida)',
  SHRINKAGE_OUT: 'Merma',
  RETURN_IN: 'Devolución (Entrada)',
  RETURN_OUT: 'Devolución (Salida)',
  TRANSFER_IN: 'Transferencia (Entrada)',
  TRANSFER_OUT: 'Transferencia (Salida)',
};

export const ADJUSTMENT_REASONS = [
  { value: 'COUNT_CORRECTION', label: 'Corrección de conteo' },
  { value: 'DAMAGE', label: 'Daño' },
  { value: 'THEFT', label: 'Robo/Pérdida' },
  { value: 'EXPIRATION', label: 'Vencimiento' },
  { value: 'OTHER', label: 'Otro' },
];

export const SHRINKAGE_REASONS = ADJUSTMENT_REASONS.filter(
  (r) => r.value !== 'COUNT_CORRECTION',
);

export const PRODUCT_UNITS = [
  { value: 'UNIT', label: 'Unidad' },
  { value: 'KG', label: 'Kilogramo' },
  { value: 'LITER', label: 'Litro' },
  { value: 'METER', label: 'Metro' },
  { value: 'BOX', label: 'Caja' },
  { value: 'PACK', label: 'Paquete' },
];
