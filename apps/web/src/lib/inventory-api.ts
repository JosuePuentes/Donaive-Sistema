import { apiFetch } from './api-client';
import type {
  PaginatedResponse,
  Product,
  ProductCategory,
  InventoryMovement,
  InventoryAdjustment,
} from '@/types/inventory';

export interface CreateProductInput {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  unit?: string;
  costUsd: number;
  marginPercent: number;
  minStock?: number;
  maxStock?: number;
  allowNegativeStock?: boolean;
  initialStock?: number;
}

export const productsApi = {
  list: (params?: Record<string, string | number | boolean>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.set(k, String(v));
      });
    }
    const qs = query.toString();
    return apiFetch<PaginatedResponse<Product>>(`/products${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => apiFetch<Product>(`/products/${id}`),

  create: (data: CreateProductInput) =>
    apiFetch<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<CreateProductInput> & { isActive?: boolean }) =>
    apiFetch<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deactivate: (id: string) =>
    apiFetch<Product>(`/products/${id}`, { method: 'DELETE' }),

  categories: () => apiFetch<ProductCategory[]>('/products/categories'),

  createCategory: (name: string, description?: string) =>
    apiFetch<ProductCategory>('/products/categories', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
};

export const inventoryApi = {
  movements: (params?: Record<string, string | number>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.set(k, String(v));
      });
    }
    const qs = query.toString();
    return apiFetch<PaginatedResponse<InventoryMovement>>(
      `/inventory/movements${qs ? `?${qs}` : ''}`,
    );
  },

  kardex: (productId: string, params?: Record<string, string | number>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => query.set(k, String(v)));
    }
    const qs = query.toString();
    return apiFetch<PaginatedResponse<InventoryMovement>>(
      `/inventory/products/${productId}/kardex${qs ? `?${qs}` : ''}`,
    );
  },

  adjustments: (page = 1) =>
    apiFetch<PaginatedResponse<InventoryAdjustment>>(
      `/inventory/adjustments?page=${page}`,
    ),

  createAdjustment: (data: {
    reason: string;
    notes?: string;
    lines: Array<{
      productId: string;
      movementType: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
      quantity: number;
      notes?: string;
    }>;
  }) =>
    apiFetch<InventoryAdjustment>('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createShrinkage: (data: {
    reason: string;
    notes?: string;
    lines: Array<{ productId: string; quantity: number; notes?: string }>;
  }) =>
    apiFetch<InventoryAdjustment>('/inventory/shrinkage', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  summary: () =>
    apiFetch<{
      totalProducts: number;
      lowStockCount: number;
      products: Array<{ id: string; sku: string; name: string; stock: number; minStock: number; isBelowMinStock: boolean }>;
    }>('/inventory/summary'),
};

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; user: { firstName: string; lastName: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
};
