import { apiFetch } from './api-client';
import type {
  Supplier,
  Purchase,
  BankAccount,
  CreateSupplierInput,
  CreatePurchaseInput,
  CxpResumen,
  CxpPendiente,
  CxpAbonoInput,
} from '@/types/purchases';

export const suppliersApi = {
  list: (includeInactive = false) =>
    apiFetch<Supplier[]>(`/suppliers${includeInactive ? '?includeInactive=true' : ''}`),

  get: (id: string) => apiFetch<Supplier>(`/suppliers/${id}`),

  create: (data: CreateSupplierInput) =>
    apiFetch<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<CreateSupplierInput> & { isActive?: boolean }) =>
    apiFetch<Supplier>(`/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const purchasesApi = {
  list: () => apiFetch<Purchase[]>('/purchases'),

  get: (id: string) => apiFetch<Purchase>(`/purchases/${id}`),

  create: (data: CreatePurchaseInput) =>
    apiFetch<Purchase>('/purchases', { method: 'POST', body: JSON.stringify(data) }),
};

export const banksApi = {
  accounts: () => apiFetch<BankAccount[]>('/bank-accounts'),
};

export const pricingApi = {
  currentRate: () =>
    apiFetch<{ tasaBcvMomento: number; montoBs: number }>('/pricing/exchange-rate/current'),
};

export const cxpApi = {
  pendientes: (supplierId?: string) =>
    apiFetch<{ resumen: CxpResumen; items: CxpPendiente[] }>(
      `/purchases/cxp/pendientes${supplierId ? `?supplierId=${supplierId}` : ''}`,
    ),

  abonar: (data: CxpAbonoInput) =>
    apiFetch<{ tasaBcvAbono: number; totalEgreso: number; monedaEgreso: string }>(
      '/purchases/cxp/abonar',
      { method: 'POST', body: JSON.stringify(data) },
    ),
};
